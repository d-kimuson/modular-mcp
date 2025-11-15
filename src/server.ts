import { Server } from "@modelcontextprotocol/sdk/server";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import packageJson from "../package.json" with { type: "json" };
import type { ServerConfig } from "./config/schema.js";
import { ModularMcpClient } from "./proxy/ModularMcpClient.js";
import { logger } from "./utils/logger.js";

const getToolsSchema = z.object({
  group: z.string(),
});

const callToolSchema = z.object({
  group: z.string(),
  name: z.string(),
  args: z.record(z.string(), z.any()),
});

export const createServer = async (config: ServerConfig) => {
  const mcpClient = new ModularMcpClient();
  const mcpGroups = Object.entries(config.mcpServers);

  const cleanup = async () => {
    await mcpClient.disconnectAll();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  await Promise.all(
    mcpGroups.map(async ([name, config]) => {
      await mcpClient
        .connect(name, config)
        .then(() => {
          logger.info(`✅ successfully connected MCP Server: ${name}`);
          return {
            name,
            config,
            success: true,
          } as const;
        })
        .catch((error) => {
          logger.error(error);
          mcpClient.recordFailedConnection(name, config, error);
          return {
            name,
            config,
            success: false,
          } as const;
        });
    }),
  );

  if (mcpClient.listFailedGroups().length === 0) {
    logger.info(
      `Successfully connected ${mcpClient.listGroups().length} MCP groups. All groups are valid.`,
    );
  } else {
    logger.warn(
      `Some MCP groups failed to connect. success_groups=[${mcpClient
        .listGroups()
        .map((g) => g.name)
        .join(", ")}], failed_groups=[${mcpClient
        .listFailedGroups()
        .map((g) => g.name)
        .join(", ")}]`,
    );
  }

  const server = new Server(
    {
      name: packageJson.name,
      version: packageJson.version,
    },
    {
      capabilities: { tools: {} },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const groups = mcpClient.listGroups();
    const groupNames = groups.map((g) => g.name);
    const groupsDescription = groups
      .map((g) => `- ${g.name}: ${g.description}`)
      .join("\n");

    const failedGroups = mcpClient.listFailedGroups();
    const unavailableGroupsDescription =
      failedGroups.length > 0
        ? `\n\nUnavailable groups (connection failed):\n${failedGroups
            .map((g) => `- ${g.name}: ${g.description} (Error: ${g.error})`)
            .join("\n")}`
        : "";

    return {
      tools: [
        {
          name: "get-modular-tools",
          description: `modular-mcp manages multiple MCP servers as organized groups, providing only the necessary group's tool descriptions to the LLM on demand instead of overwhelming it with all tool descriptions at once.\n\nUse this tool to retrieve available tools in a specific group, then use call-modular-tool to execute them.\n\nAvailable groups:\n${groupsDescription}${unavailableGroupsDescription}\n\nExample usage:\n  get-modular-tools(group="playwright")\n  → Returns all tool schemas from the playwright group`,
          inputSchema: {
            type: "object",
            properties: {
              group: {
                type: "string",
                description: "The name of the MCP group to get tools from",
                enum: groupNames,
              },
            },
            required: ["group"],
          },
        },
        {
          name: "call-modular-tool",
          description:
            'Execute a tool from a specific MCP group. Proxies the call to the appropriate upstream MCP server. Use get-modular-tools first to discover available tools and their input schemas in the specified group, then use this tool to execute them. This maintains a clean separation between discovery (context-efficient) and execution phases, enabling effective management of large tool collections across multiple MCP servers.\n\nExample usage:\n  call-modular-tool(group="playwright", name="browser_navigate", args={"url": "https://example.com"})\n  → Executes the browser_navigate tool from the playwright group with the specified arguments',
          inputSchema: {
            type: "object",
            properties: {
              group: {
                type: "string",
                description: "The name of the MCP group containing the tool",
                enum: groupNames,
              },
              name: {
                type: "string",
                description: "The name of the tool to execute",
              },
              args: {
                type: "object",
                description: "Arguments to pass to the tool",
                additionalProperties: true,
              },
            },
            required: ["group", "name"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "get-modular-tools": {
        const parsedArgs = getToolsSchema.safeParse(args);
        if (!parsedArgs.success) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: parsedArgs.error.issues,
                }),
              },
            ],
            isError: true,
          };
        }

        const tools = await mcpClient.listTools(parsedArgs.data.group);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                tools.map((tool) => {
                  const { $schema: _schemaUrl, ...inputSchema } =
                    tool.inputSchema;
                  return {
                    name: tool.name,
                    description: tool.description,
                    inputSchema: inputSchema,
                  };
                }),
              ),
            },
          ],
        };
      }
      case "call-modular-tool": {
        const parsedArgs = callToolSchema.safeParse(args);
        if (!parsedArgs.success) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: parsedArgs.error.issues,
                }),
              },
            ],
            isError: true,
          };
        }

        try {
          const result = await mcpClient.callTool(
            parsedArgs.data.group,
            parsedArgs.data.name,
            parsedArgs.data.args,
          );

          return {
            content: result.content,
            isError: result.isError,
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                }),
              },
            ],
            isError: true,
          };
        }
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return {
    server,
  };
};

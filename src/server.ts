import { Server } from "@modelcontextprotocol/sdk/server";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { toJsonSchema } from "@valibot/to-json-schema";
import * as v from "valibot";
import packageJson from "../package.json" with { type: "json" };
import { ClientManager } from "./client-manager.js";
import type { ServerConfig } from "./types.js";

const getToolsSchema = v.object({
  group: v.string(),
});

const callToolSchema = v.object({
  group: v.string(),
  name: v.string(),
  args: v.record(v.string(), v.any()),
});

export const createServer = async (config: ServerConfig) => {
  const manager = new ClientManager();
  const mcpGroups = Object.entries(config.mcpServers);

  const cleanup = async () => {
    await manager.disconnectAll();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  await Promise.all(
    mcpGroups.map(async ([name, config]) => {
      await manager.connect(name, config);
    }),
  );

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
    return {
      tools: [
        {
          name: "get-tool-groups",
          description:
            "List all available MCP server groups. Returns group names and descriptions. Call this first to discover available tool groups.",
          inputSchema: toJsonSchema(v.object({})),
        },
        {
          name: "get-tools",
          description:
            "Get all tools available in a specific MCP group. Returns tool names, descriptions, and input schemas.",
          inputSchema: toJsonSchema(getToolsSchema),
        },
        {
          name: "call-tool",
          description:
            "Execute a tool from a specific MCP group. Proxies the call to the appropriate upstream MCP server.",
          inputSchema: toJsonSchema(callToolSchema),
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "get-tool-groups":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(manager.listGroups(), null, 2),
            },
          ],
        };
      case "get-tools": {
        const parsedArgs = v.safeParse(getToolsSchema, args);
        if (!parsedArgs.success) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: parsedArgs.issues,
                }),
              },
            ],
            isError: true,
          };
        }

        const tools = await manager.listTools(parsedArgs.output.group);

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
      case "call-tool": {
        const parsedArgs = v.safeParse(callToolSchema, args);
        if (!parsedArgs.success) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: parsedArgs.issues,
                }),
              },
            ],
            isError: true,
          };
        }

        try {
          const result = await manager.callTool(
            parsedArgs.output.group,
            parsedArgs.output.name,
            parsedArgs.output.args,
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

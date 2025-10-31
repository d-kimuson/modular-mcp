import { Server } from "@modelcontextprotocol/sdk/server";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as v from "valibot";
import packageJson from "../package.json" with { type: "json" };
import { ClientManager } from "./client-manager.js";
import { logger } from "./logger.js";
import type { ServerConfig } from "./types.js";

const getToolsSchema = v.object({
  group: v.string(),
});

const callToolSchema = v.object({
  group: v.string(),
  name: v.string(),
  args: v.record(v.string(), v.any()),
});

const getCategoryToolsSchema = v.object({
  category: v.string(),
});

const callCategoryToolSchema = v.object({
  category: v.string(),
  name: v.string(),
  args: v.record(v.string(), v.any()),
});

export const createServer = async (config: ServerConfig) => {
  const manager = new ClientManager();
  const mcpGroups = Object.entries(config.mcpServers);

  // Initialize categories if present
  if (config.categories) {
    manager.initCategories(config.categories);
  }

  const cleanup = async () => {
    await manager.disconnectAll();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  await Promise.allSettled(
    mcpGroups.map(async ([name, config]) => {
      try {
        await manager.connect(name, config);
      } catch (error) {
        manager.recordFailedConnection(name, config, error);
      }
    }),
  );

  if (manager.listFailedGroups().length === 0) {
    logger.info(
      `Successfully connected ${manager.listGroups().length} MCP groups. All groups are valid.`,
    );
  } else {
    logger.warn(
      `Some MCP groups failed to connect. success_groups=[${manager
        .listGroups()
        .map((g) => g.name)
        .join(", ")}], failed_groups=[${manager
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
    const categories = manager.listCategories();
    const hasCategories = categories.length > 0;

    if (hasCategories) {
      // Category mode: Use new category-based tools
      const categoryNames = categories.map((c) => c.name);
      const categoriesDescription = categories
        .map((c) => `- ${c.name}: ${c.description}`)
        .join("\n");

      return {
        tools: [
          {
            name: "get-category-tools",
            description: `Retrieve available tools for a specific category. This MCP server organizes tools by category, allowing you to load only the tool schemas you need.\n\nAvailable categories:\n${categoriesDescription}\n\nWorkflow:\n1. Call this tool with a category name to get available tool schemas\n2. Use call-category-tool to execute the tools`,
            inputSchema: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  description: "The name of the category to get tools from",
                  enum: categoryNames,
                },
              },
              required: ["category"],
            },
          },
          {
            name: "call-category-tool",
            description:
              "Execute a tool from a specific category. Proxies the call to the appropriate upstream MCP server.\n\nWorkflow:\n1. First call get-category-tools to discover available tools and their schemas\n2. Then use this tool to execute them with the appropriate arguments",
            inputSchema: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  description: "The name of the category containing the tool",
                  enum: categoryNames,
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
              required: ["category", "name", "args"],
            },
          },
        ],
      };
    }

    // Legacy group mode: Use original group-based tools
    const groups = manager.listGroups();
    const groupNames = groups.map((g) => g.name);
    const groupsDescription = groups
      .map((g) => `- ${g.name}: ${g.description}`)
      .join("\n");

    const failedGroups = manager.listFailedGroups();
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
          description: `modular-mcp manages multiple MCP servers as organized groups, providing only the necessary group's tool descriptions to the LLM on demand instead of overwhelming it with all tool descriptions at once.\n\nUse this tool to retrieve available tools in a specific group, then use call-modular-tool to execute them.\n\nAvailable groups:\n${groupsDescription}${unavailableGroupsDescription}`,
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
            "Execute a tool from a specific MCP group. Proxies the call to the appropriate upstream MCP server. Use get-modular-tools first to discover available tools and their input schemas in the specified group, then use this tool to execute them. This maintains a clean separation between discovery (context-efficient) and execution phases, enabling effective management of large tool collections across multiple MCP servers.",
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
      case "get-category-tools": {
        const parsedArgs = v.safeParse(getCategoryToolsSchema, args);
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
          const result = await manager.getCategoryTools(parsedArgs.output.category);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result),
              },
            ],
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
      case "call-category-tool": {
        const parsedArgs = v.safeParse(callCategoryToolSchema, args);
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
          const result = await manager.callCategoryTool(
            parsedArgs.output.category,
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
      case "get-modular-tools": {
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
      case "call-modular-tool": {
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

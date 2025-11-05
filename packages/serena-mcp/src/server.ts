import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { fsTools } from "./tools/fs.js";
import { codeTools } from "./tools/code.js";
import { memoryTools } from "./tools/memory.js";
import { sessionTools } from "./tools/session.js";
import { metaTools } from "./tools/meta.js";

export function createServer() {
  const server = new Server(
    {
      name: "@org/serena-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Collect all tools from all categories
  const allTools = [
    ...fsTools,
    ...codeTools,
    ...memoryTools,
    ...sessionTools,
    ...metaTools,
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const tool = allTools.find((t) => t.name === name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    return await tool.handler(args || {});
  });

  return server;
}

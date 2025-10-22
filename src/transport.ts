import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpServerConfig } from "./types.js";

export const getTransport = (config: McpServerConfig) => {
  switch (config.type) {
    case "stdio":
      return new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      });

    case "http": {
      return new StreamableHTTPClientTransport(new URL(config.url), {
        requestInit: {
          headers: config.headers,
        },
      });
    }

    case "sse": {
      return new SSEClientTransport(new URL(config.url), {
        requestInit: {
          headers: config.headers,
        },
      });
    }

    default:
      config satisfies never;
      throw new Error(`Unknown transport type: ${config}`);
  }
};

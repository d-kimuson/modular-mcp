import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ProxyOAuthClientProvider } from "../auth/ProxyOAuthClientProvider.js";
import { setupCallbackServer } from "../auth/setupCallbackServer.js";
import type { McpServerConfig } from "../config/schema.js";

let server: Awaited<ReturnType<typeof setupCallbackServer>> | undefined;

export const getTransport = async (config: McpServerConfig) => {
  if (config.type === "stdio") {
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env,
    });

    return { transport } as const;
  }

  server ??= await setupCallbackServer();
  const { awaitAuthorizationCode, callbackPort } = server;

  const { provider } = await ProxyOAuthClientProvider.create({
    remoteMcpServerUrl: config.url,
    authorizeResource: undefined,
    callbackPort,
  });

  const tokens = await provider.tokens();
  const headersRef = {
    ...config.headers,
    ...(tokens ? { Authorization: `Bearer ${tokens.access_token}` } : {}),
  };

  switch (config.type) {
    case "http": {
      const transport = new StreamableHTTPClientTransport(new URL(config.url), {
        authProvider: provider,
        requestInit: {
          headers: headersRef,
        },
      });

      provider.setAwaitAuthCompleted(async () => {
        const code = await awaitAuthorizationCode();
        await transport.finishAuth(code);
      });

      return { transport };
    }

    case "sse": {
      const transport = new SSEClientTransport(new URL(config.url), {
        authProvider: provider,
        requestInit: {
          headers: headersRef,
        },
        eventSourceInit: {
          fetch: async (input, init) => {
            const response = await fetch(input, {
              ...init,
              headers: headersRef,
            });
            return response;
          },
        },
      });

      provider.setAwaitAuthCompleted(async () => {
        const code = await awaitAuthorizationCode();
        await transport.finishAuth(code);
      });

      return { transport };
    }

    default:
      config satisfies never;
      throw new Error(`Unknown transport type: ${config}`);
  }
};

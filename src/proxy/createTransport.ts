import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { AuthStore } from "../auth/AuthStore.js";
import { ProxyOAuthClientProvider } from "../auth/ProxyOAuthClientProvider.js";
import { setupCallbackServer } from "../auth/setupCallbackServer.js";
import type { McpServerConfig } from "../config/schema.js";

const authStore = new AuthStore();

type CreateTransportOptions = {
  oauthTimeoutMs?: number;
};

export const createTransport = async (
  config: McpServerConfig,
  options?: CreateTransportOptions,
) => {
  if (config.type === "stdio") {
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env,
    });

    return { transport } as const;
  }

  const persistedPort = await authStore.getPersistenceFile(
    config.url,
    "callback-port",
  );

  let callbackPort = persistedPort;
  let callbackServer:
    | Awaited<ReturnType<typeof setupCallbackServer>>
    | undefined;

  const ensureCallbackServer = async () => {
    if (callbackServer) {
      return callbackServer;
    }
    const defaultPort =
      callbackPort ??
      (await authStore.getPersistenceFile(config.url, "callback-port"));
    callbackServer = await setupCallbackServer({
      defaultPort,
      timeoutMs: options?.oauthTimeoutMs,
    });
    callbackPort = callbackServer.callbackPort;
    if (defaultPort !== callbackServer.callbackPort) {
      await authStore.savePersistenceFile(
        config.url,
        "callback-port",
        callbackServer.callbackPort,
      );
      if (
        persistedPort !== undefined &&
        persistedPort !== callbackServer.callbackPort
      ) {
        await Promise.all([
          authStore
            .deletePersistenceFile(config.url, "client")
            .catch(() => undefined),
          authStore
            .deletePersistenceFile(config.url, "tokens")
            .catch(() => undefined),
          authStore
            .deletePersistenceFile(config.url, "verifier")
            .catch(() => undefined),
        ]);
      }
    }
    return callbackServer;
  };

  const selectedCallbackPort =
    callbackPort ?? (await ensureCallbackServer()).callbackPort;

  const { provider } = await ProxyOAuthClientProvider.create({
    remoteMcpServerUrl: config.url,
    authorizeResource: undefined,
    callbackPort: selectedCallbackPort,
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
        const currentServer = await ensureCallbackServer();
        try {
          const code = await currentServer.awaitAuthorizationCode();
          await transport.finishAuth(code);
        } finally {
          callbackServer = undefined;
        }
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
        const currentServer = await ensureCallbackServer();
        try {
          const code = await currentServer.awaitAuthorizationCode();
          await transport.finishAuth(code);
        } finally {
          callbackServer = undefined;
        }
      });

      return { transport };
    }

    default:
      config satisfies never;
      throw new Error(`Unknown transport type: ${config}`);
  }
};

import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import getPort from "get-port";
import { Hono } from "hono";
import { z } from "zod";
import { controllablePromise } from "../utils/controllablePromise.js";
import { logger } from "../utils/logger.js";

const DEFAULT_CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

export const setupCallbackServer = async (options?: {
  defaultPort?: number;
  timeoutMs?: number;
}) => {
  const { defaultPort, timeoutMs = DEFAULT_CALLBACK_TIMEOUT_MS } =
    options ?? {};

  const port = await getPort({
    port: defaultPort,
  });
  let authorizationCodePromise = controllablePromise<string>();
  let timeoutHandle: NodeJS.Timeout | undefined;

  const app = new Hono();

  app.get(
    "/oauth/callback",
    zValidator(
      "query",
      z.object({
        code: z.string(),
      }),
    ),
    async (c) => {
      const { code } = c.req.valid("query");
      authorizationCodePromise.resolve(code);
      return c.text(
        `
Authentication with MCP Server succeeded!
You can now access resources through the MCP Server.`.trim(),
      );
    },
  );

  const temporaryServer = serve({
    fetch: app.fetch,
    port,
  });
  logger.info(`Callback server is running on port ${port}`);

  let cleanedUp = false;
  const clearTimeoutHandle = () => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = undefined;
    }
  };

  const cleanUp = () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    clearTimeoutHandle();
    temporaryServer.close();
    authorizationCodePromise = controllablePromise<string>();
  };

  const onTimeout = () => {
    if (authorizationCodePromise.status !== "pending") {
      return;
    }
    logger.warn(
      `OAuth authorization timed out after ${(timeoutMs / 1000).toFixed(0)} seconds. Closing callback server (port ${port}).`,
    );
    authorizationCodePromise.reject(
      new Error(
        "OAuth authorization timed out before the callback was received.",
      ),
    );
    cleanUp();
  };

  const startTimeout = () => {
    if (timeoutMs === undefined) {
      return;
    }
    timeoutHandle = setTimeout(onTimeout, timeoutMs);
    timeoutHandle.unref?.();
  };

  const resetTimeout = () => {
    clearTimeoutHandle();
  };

  const sigintHandler = () => {
    cleanUp();
  };
  const sigtermHandler = () => {
    cleanUp();
  };

  process.on("SIGINT", sigintHandler);
  process.on("SIGTERM", sigtermHandler);

  const awaitAuthorizationCode = async () => {
    startTimeout();
    try {
      const code = await authorizationCodePromise.promise;
      cleanUp();
      return code;
    } finally {
      resetTimeout();
      process.off("SIGINT", sigintHandler);
      process.off("SIGTERM", sigtermHandler);
      cleanedUp = true;
    }
  };

  return {
    awaitAuthorizationCode,
    callbackPort: port,
  } as const;
};

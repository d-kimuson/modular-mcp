import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import getPort from "get-port";
import { Hono } from "hono";
import { z } from "zod";
import { controllablePromise } from "../utils/controllablePromise.js";
import { logger } from "../utils/logger.js";

export const setupCallbackServer = async () => {
  const port = await getPort();
  let authorizationCodePromise = controllablePromise<string>();

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

  const cleanUp = () => {
    temporaryServer.close();
  };

  process.on("SIGINT", () => {
    cleanUp();
  });

  process.on("SIGTERM", () => {
    cleanUp();
  });

  const awaitAuthorizationCode = async () => {
    const code = await authorizationCodePromise.promise;
    temporaryServer.close();
    authorizationCodePromise = controllablePromise<string>();
    return code;
  };

  return {
    awaitAuthorizationCode,
    callbackPort: port,
  } as const;
};

import type { Client } from "@modelcontextprotocol/sdk/client";
import type { McpServerConfig } from "../config/schema.js";
import { getTransport } from "./getTransport.js";

export const connectWithAuthentication = async (
  client: Client,
  config: McpServerConfig,
) => {
  const { transport } = await getTransport(config);
  if (config.type === "stdio") {
    await client.connect(transport);
    return;
  }

  try {
    await client.connect(transport);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    if (error.message !== "Unauthorized") {
      throw error;
    }

    /**
     * In MCP Client, when OAuth Authorization Flow is started for the first time,
     * it only:
     * 1. Saves code_verifier
     * 2. Executes provider.redirectToAuthorization
     * and then exits with an error.
     *
     * Since finishAuth (exchanging authorizationCode for a token and saving it) is executed
     * in redirectToAuthorization, we can successfully connect by recreating the transport
     * and calling client.connect again.
     */
    await connectWithAuthentication(client, config);
  }
};

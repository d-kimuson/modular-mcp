import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "../../config/loadConfig.js";
import { createServer } from "../../server.js";
import { logger } from "../../utils/logger.js";

type McpActionOptions = {
  oauthTimeoutMs?: number;
};

export const mcpAction = async (
  configFilePath: string,
  options?: McpActionOptions,
) => {
  try {
    const config = await loadConfig(configFilePath);
    const { server } = await createServer(config, {
      oauthTimeoutMs: options?.oauthTimeoutMs,
    });
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};

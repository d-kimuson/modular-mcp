import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "../../config/loadConfig.js";
import { createServer } from "../../server.js";
import { logger } from "../../utils/logger.js";

export const mcpAction = async (configFilePath: string) => {
  try {
    const config = await loadConfig(configFilePath);
    const { server } = await createServer(config);
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};

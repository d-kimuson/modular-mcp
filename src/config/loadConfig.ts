import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { logger } from "../utils/logger.js";
import { type ServerConfig, serverConfigSchema } from "./schema.js";

/**
 * Load and validate proxy configuration from a JSON file
 * @param configPath Path to configuration file (relative or absolute)
 * @returns Parsed and validated configuration
 */
export const loadConfig = async (configPath: string): Promise<ServerConfig> => {
  const absolutePath = resolve(configPath);

  const rawJson = await (async () => {
    const fileContent = await readFile(absolutePath, "utf-8");

    try {
      const parsed: unknown = JSON.parse(fileContent);
      return {
        success: true,
        data: parsed,
      } as const;
    } catch (error) {
      return {
        success: false,
        error: new Error(
          `Specified configuration file is not a valid json: ${absolutePath}`,
          {
            cause: error,
          },
        ),
      } as const;
    }
  })();

  if (!rawJson.success) {
    throw rawJson.error;
  }

  const config = serverConfigSchema.safeParse(rawJson.data);

  if (!config.success) {
    throw new Error(
      `Specified configuration file is not satisfies the schema: ${absolutePath}`,
      {
        cause: z.treeifyError(config.error),
      },
    );
  }

  logger.info(`MCP server config loaded successfully.`);

  return config.data;
};

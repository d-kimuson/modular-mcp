import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { substituteInServerConfig } from "../utils/envSubstitution.js";
import { logger } from "../utils/logger.js";
import { type ServerConfig, serverConfigSchema } from "./schema.js";

/**
 * Applies environment variable substitution to validated configuration data.
 * This is called AFTER Zod parsing to work with typed data.
 *
 * @param config - Validated ServerConfig from Zod
 * @returns ServerConfig with environment variables substituted
 * @throws Error if substitution fails, with server name context
 */
function applyEnvSubstitution(config: ServerConfig): ServerConfig {
  const substitutedServers: Record<string, ServerConfig["mcpServers"][string]> =
    {};

  for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
    try {
      substitutedServers[serverName] = substituteInServerConfig(serverConfig);
    } catch (error) {
      // Add server name context to error message
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error during substitution";
      throw new Error(
        `Failed to substitute environment variables in server '${serverName}': ${message}`,
        {
          cause: error,
        },
      );
    }
  }

  return {
    mcpServers: substitutedServers,
  };
}

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

  // First, validate with Zod to get typed data
  const config = serverConfigSchema.safeParse(rawJson.data);

  if (!config.success) {
    throw new Error(
      `Specified configuration file is not satisfies the schema: ${absolutePath}`,
      {
        cause: z.treeifyError(config.error),
      },
    );
  }

  // Then, apply environment variable substitution to the typed data
  const configWithSubstitution = applyEnvSubstitution(config.data);

  logger.info(`MCP server config loaded successfully.`);

  return configWithSubstitution;
};

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import {
  substituteEnvVars,
  substituteInArray,
  substituteInObject,
} from "../utils/envSubstitution.js";
import { logger } from "../utils/logger.js";
import { type ServerConfig, serverConfigSchema } from "./schema.js";

/**
 * Applies environment variable substitution to configuration data.
 * Substitutes variables in specific fields based on server type:
 * - stdio: args, env
 * - http/sse: url, headers
 *
 * @param data - Parsed JSON data (unvalidated)
 * @returns Data with environment variables substituted
 * @throws Error if substitution fails, with server name context
 */
function applyEnvSubstitution(data: unknown): unknown {
  // Type guard: ensure data has the expected structure
  if (
    typeof data !== "object" ||
    data === null ||
    !("mcpServers" in data) ||
    typeof data.mcpServers !== "object" ||
    data.mcpServers === null
  ) {
    return data;
  }

  const mcpServers = data.mcpServers as Record<string, unknown>;
  const substituted: Record<string, unknown> = {};

  for (const [serverName, serverConfig] of Object.entries(mcpServers)) {
    try {
      substituted[serverName] = substituteServerConfig(serverConfig);
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
    ...data,
    mcpServers: substituted,
  };
}

/**
 * Substitutes environment variables in a single server configuration.
 *
 * @param serverConfig - Server configuration object
 * @returns Server configuration with substituted values
 */
function substituteServerConfig(serverConfig: unknown): unknown {
  if (typeof serverConfig !== "object" || serverConfig === null) {
    return serverConfig;
  }

  const config = serverConfig as Record<string, unknown>;
  const result = { ...config };

  // Determine server type (default to stdio if not specified)
  // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
  const serverType =
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    typeof config["type"] === "string" ? config["type"] : "stdio";

  if (serverType === "stdio") {
    // Substitute args array
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    if (Array.isArray(config["args"])) {
      // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
      const allStrings = config["args"].every((arg) => typeof arg === "string");
      if (allStrings) {
        // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
        result["args"] = substituteInArray(
          // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
          config["args"] as string[],
        );
      }
    }

    // Substitute env object values
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    if (
      typeof config["env"] === "object" &&
      config["env"] !== null &&
      !Array.isArray(config["env"])
    ) {
      // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
      const envRecord = config["env"] as Record<string, unknown>;
      const allStringValues = Object.values(envRecord).every(
        (value) => typeof value === "string",
      );
      if (allStringValues) {
        // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
        result["env"] = substituteInObject(envRecord as Record<string, string>);
      }
    }
  } else if (serverType === "http" || serverType === "sse") {
    // Substitute url string
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    if (typeof config["url"] === "string") {
      // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
      result["url"] = substituteEnvVars(
        // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
        config["url"],
      );
    }

    // Substitute headers object values
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    if (
      typeof config["headers"] === "object" &&
      config["headers"] !== null &&
      !Array.isArray(config["headers"])
    ) {
      // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
      const headersRecord = config["headers"] as Record<string, unknown>;
      const allStringValues = Object.values(headersRecord).every(
        (value) => typeof value === "string",
      );
      if (allStringValues) {
        // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
        result["headers"] = substituteInObject(
          headersRecord as Record<string, string>,
        );
      }
    }
  }

  return result;
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

  // Apply environment variable substitution before validation
  const dataWithSubstitution = applyEnvSubstitution(rawJson.data);

  const config = serverConfigSchema.safeParse(dataWithSubstitution);

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

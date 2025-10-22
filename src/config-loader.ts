import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as v from "valibot";
import { type ServerConfig, serverConfigSchema } from "./types.js";

/**
 * Load and validate proxy configuration from a JSON file
 * @param configPath Path to configuration file (relative or absolute)
 * @returns Parsed and validated configuration
 */
export const loadConfig = async (configPath: string): Promise<ServerConfig> => {
  const absolutePath = resolve(configPath);

  try {
    const fileContent = await readFile(absolutePath, "utf-8");
    const config = v.safeParse(serverConfigSchema, JSON.parse(fileContent));
    if (!config.success) {
      throw new Error(`Failed to load config: ${config.issues}`);
    }
    return config.output;
  } catch (error) {
    throw new Error(`Failed to load config: ${error}`);
  }
};

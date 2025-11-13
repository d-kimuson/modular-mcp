import type { McpServerConfig } from "../config/schema.js";

/**
 * Environment variable substitution utility
 *
 * Supports both $VAR and ${VAR} syntax for environment variable interpolation.
 * Throws an error if a referenced environment variable is not defined.
 */

/**
 * Substitutes environment variables in a string.
 *
 * Supports both $VAR and ${VAR} syntax.
 * - $VAR matches word characters (letters, numbers, underscore)
 * - ${VAR} matches word characters within braces
 *
 * @param value - The string potentially containing environment variable references
 * @returns The string with environment variables substituted
 * @throws Error if a referenced environment variable is not defined
 *
 * @example
 * // With process.env.HOME = "/home/user"
 * substituteEnvVars("$HOME/.config") // returns "/home/user/.config"
 * substituteEnvVars("${HOME}/.config") // returns "/home/user/.config"
 */
export function substituteEnvVars(value: string): string {
  // Pattern explanation:
  // \$\{([A-Za-z_][A-Za-z0-9_]*)\} - matches ${VAR_NAME}
  // \$([A-Za-z_][A-Za-z0-9_]*) - matches $VAR_NAME
  // Variable names must start with letter or underscore, followed by alphanumerics or underscores
  const pattern = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g;

  return value.replace(pattern, (_match, bracedVar, unbracedVar) => {
    const varName = bracedVar ?? unbracedVar;

    if (!(varName in process.env)) {
      throw new Error(`Environment variable '${varName}' is not defined`);
    }

    // Return the environment variable value (can be empty string)
    return process.env[varName] ?? "";
  });
}

/**
 * Substitutes environment variables in all values of a record object.
 *
 * @param obj - Record object with string values
 * @returns New record object with substituted values
 * @throws Error if any referenced environment variable is not defined
 *
 * @example
 * // With process.env.API_KEY = "secret"
 * substituteInObject({ key: "$API_KEY" }) // returns { key: "secret" }
 */
export function substituteInObject(
  obj: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    result[key] = substituteEnvVars(value);
  }

  return result;
}

/**
 * Substitutes environment variables in all elements of a string array.
 *
 * @param arr - Array of strings
 * @returns New array with substituted values
 * @throws Error if any referenced environment variable is not defined
 *
 * @example
 * // With process.env.HOME = "/home/user"
 * substituteInArray(["$HOME/.config"]) // returns ["/home/user/.config"]
 */
export function substituteInArray(arr: string[]): string[] {
  return arr.map((element) => substituteEnvVars(element));
}

/**
 * Substitutes environment variables in a typed MCP server configuration.
 * Uses discriminated union pattern matching to handle different server types.
 *
 * @param config - Validated MCP server configuration (from Zod)
 * @returns New configuration with environment variables substituted
 * @throws Error if any referenced environment variable is not defined
 *
 * @example
 * // stdio server
 * substituteInServerConfig({
 *   type: "stdio",
 *   description: "Example",
 *   command: "node",
 *   args: ["$HOME/script.js"],
 *   env: { KEY: "$SECRET" }
 * })
 */
export function substituteInServerConfig(
  config: McpServerConfig,
): McpServerConfig {
  // Handle stdio type (default)
  if (!("type" in config) || config.type === "stdio") {
    return {
      ...config,
      args:
        config.args !== undefined ? substituteInArray(config.args) : undefined,
      env:
        config.env !== undefined ? substituteInObject(config.env) : undefined,
    };
  }

  // Handle http type
  if (config.type === "http") {
    return {
      ...config,
      url: substituteEnvVars(config.url),
      headers:
        config.headers !== undefined
          ? substituteInObject(config.headers)
          : undefined,
    };
  }

  // Handle sse type
  if (config.type === "sse") {
    return {
      ...config,
      url: substituteEnvVars(config.url),
      headers:
        config.headers !== undefined
          ? substituteInObject(config.headers)
          : undefined,
    };
  }

  // This should never be reached due to Zod validation, but TypeScript needs exhaustiveness check
  const exhaustiveCheck: never = config;
  return exhaustiveCheck;
}

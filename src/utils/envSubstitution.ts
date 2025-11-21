import type { McpServerConfig } from "../config/schema.js";

/**
 * Environment variable substitution utility
 *
 * Supports only ${VAR} syntax for environment variable interpolation.
 * The $VAR syntax is intentionally NOT supported to avoid issues with tokens
 * and values containing dollar signs (e.g., "hoge$hoge").
 *
 * When a referenced environment variable is not defined, a warning is logged
 * and the original placeholder is preserved (e.g., "${UNDEFINED_VAR}" stays as-is).
 */

/**
 * Substitutes environment variables in a string.
 *
 * Only supports ${VAR} syntax.
 * - ${VAR} matches word characters within braces
 * - $VAR syntax is NOT substituted (remains as-is)
 *
 * @param value - The string potentially containing environment variable references
 * @returns The string with environment variables substituted
 *
 * @example
 * // With process.env.HOME = "/home/user"
 * substituteEnvVars("${HOME}/.config") // returns "/home/user/.config"
 * substituteEnvVars("$HOME/.config") // returns "$HOME/.config" (NOT substituted)
 * substituteEnvVars("${UNDEFINED}") // returns "${UNDEFINED}" (with warning)
 */
export const substituteEnvVars = (value: string): string => {
  // Pattern explanation:
  // \$\{([A-Za-z_][A-Za-z0-9_]*)\} - matches ${VAR_NAME} only
  // Variable names must start with letter or underscore, followed by alphanumerics or underscores
  // Note: $VAR syntax is intentionally NOT matched to preserve values like "hoge$hoge"
  const pattern = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

  return value.replace(pattern, (match, varName: string) => {
    if (!(varName in process.env)) {
      // biome-ignore lint/suspicious/noConsole: Intentional warning for undefined env vars
      console.warn(
        `Warning: Environment variable '${varName}' is not defined. Keeping original placeholder.`,
      );
      return match;
    }

    // Return the environment variable value (can be empty string)
    return process.env[varName] ?? "";
  });
};

/**
 * Substitutes environment variables in all values of a record object.
 *
 * @param obj - Record object with string values
 * @returns New record object with substituted values
 *
 * @example
 * // With process.env.API_KEY = "secret"
 * substituteInObject({ key: "${API_KEY}" }) // returns { key: "secret" }
 */
export const substituteInObject = (
  obj: Record<string, string>,
): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    result[key] = substituteEnvVars(value);
  }

  return result;
};

/**
 * Substitutes environment variables in all elements of a string array.
 *
 * @param arr - Array of strings
 * @returns New array with substituted values
 *
 * @example
 * // With process.env.HOME = "/home/user"
 * substituteInArray(["${HOME}/.config"]) // returns ["/home/user/.config"]
 */
export const substituteInArray = (arr: string[]): string[] =>
  arr.map((element) => substituteEnvVars(element));

/**
 * Substitutes environment variables in a typed MCP server configuration.
 * Uses discriminated union pattern matching to handle different server types.
 *
 * @param config - Validated MCP server configuration (from Zod)
 * @returns New configuration with environment variables substituted
 *
 * @example
 * // stdio server
 * substituteInServerConfig({
 *   type: "stdio",
 *   description: "Example",
 *   command: "node",
 *   args: ["${HOME}/script.js"],
 *   env: { KEY: "${SECRET}" }
 * })
 */
export const substituteInServerConfig = (
  config: McpServerConfig,
): McpServerConfig => {
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
};

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

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import inquirer from "inquirer";
import { z } from "zod";
import { standardServerConfigSchema } from "../../config/schema.js";
import { logger } from "../../utils/logger.js";

/**
 * Migrate from general MCP configuration to Modular MCP format
 * @param mcpConfigFilePath Path to the general MCP configuration file
 * @param options.outputPath Optional output file path. If not provided, defaults to `modular-mcp.json` in the same directory as the input file
 */
export const migrateAction = async (
  mcpConfigFilePath: string,
  options?: { outputPath?: string },
) => {
  const { outputPath = "modular-mcp.json" } = options ?? {};
  const absolutePath = resolve(mcpConfigFilePath);

  // Read and parse the input file
  let rawJson: unknown;
  try {
    const fileContent = await readFile(absolutePath, "utf-8");
    rawJson = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(
      `Failed to read or parse configuration file: ${absolutePath}`,
      {
        cause: error,
      },
    );
  }

  // Validate the configuration
  const config = standardServerConfigSchema.safeParse(rawJson);
  if (!config.success) {
    throw new Error(`Invalid MCP configuration file format: ${absolutePath}`, {
      cause: z.treeifyError(config.error),
    });
  }

  const { mcpServers } = config.data;

  // Collect descriptions for each server
  const serverDescriptions: Record<string, string> = {};

  for (const [serverName, serverConfig] of Object.entries(mcpServers)) {
    const serverType = serverConfig.type || "stdio";
    const serverInfo = (() => {
      if (serverConfig.type === "stdio") {
        return `command: ${serverConfig.command}`;
      } else if (serverConfig.type === "http") {
        return `http: ${serverConfig.url}`;
      } else if (serverConfig.type === "sse") {
        return `sse: ${serverConfig.url}`;
      } else {
        throw new Error(`Unknown server type: ${serverConfig}`);
      }
    })();

    const answer = await inquirer.prompt<{ description: string }>([
      {
        type: "input",
        name: "description",
        message: `Enter description for server "${serverName}" (${serverType}, ${serverInfo}):`,
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return "Description cannot be empty";
          }
          return true;
        },
      },
    ]);

    serverDescriptions[serverName] = answer.description.trim();
  }

  // Generate Modular MCP configuration
  const modularConfig: {
    $schema: string;
    mcpServers: Record<string, Record<string, unknown>>;
  } = {
    $schema:
      "https://raw.githubusercontent.com/d-kimuson/modular-mcp/refs/heads/main/config-schema.json",
    mcpServers: {},
  };

  for (const [serverName, serverConfig] of Object.entries(mcpServers)) {
    const description = serverDescriptions[serverName];

    modularConfig.mcpServers[serverName] = {
      description,
      ...serverConfig,
    };
  }

  // Determine output file path
  const finalOutputPath = resolve(outputPath);

  // Write the output file
  try {
    await writeFile(
      finalOutputPath,
      `${JSON.stringify(modularConfig, null, 2)}\n`,
      "utf-8",
    );
    logger.info(`Modular MCP configuration written to: ${finalOutputPath}`);
  } catch (error) {
    throw new Error(
      `Failed to write modular-mcp configuration file: ${finalOutputPath}`,
      {
        cause: error,
      },
    );
  }

  const modularMcpServerConfig = {
    mcpServers: {
      "modular-mcp": {
        type: "stdio",
        command: "npx",
        args: ["-y", "@kimuson/modular-mcp", finalOutputPath],
        env: {},
      },
    },
  };

  try {
    await writeFile(
      absolutePath,
      `${JSON.stringify(modularMcpServerConfig, null, 2)}\n`,
      "utf-8",
    );
    logger.info(`\n✅ Migration completed successfully!`);
    logger.info(`Original file updated: ${absolutePath}`);
    logger.info(`Modular MCP config file: ${finalOutputPath}`);
  } catch (error) {
    throw new Error(
      `Failed to update original configuration file: ${absolutePath}`,
      {
        cause: error,
      },
    );
  }
};

#!/usr/bin/env node

import { Command } from "commander";
import packageJson from "../package.json" with { type: "json" };
import { mcpAction } from "./cli/actions/mcp.js";
import { migrateAction } from "./cli/actions/migrate.js";
import { logger } from "./utils/logger.js";

const program = new Command();

program
  .version(packageJson.version)
  .description(packageJson.description)
  .argument("<config-file-path>", "config file to migrate")
  .action(async (configFilePath: string) => {
    await mcpAction(configFilePath);
  });

program
  .command("migrate")
  .description("Migrate from general MCP configuration to Modular MCP")
  .argument(
    "<mcp-config-file-path>",
    "MCP server configuration file to migrate",
  )
  .option(
    "-o, --output-path <path>",
    "Output file path. If not specified, defaults to 'modular-mcp.json' in the same directory as the input file",
  )
  .action(
    async (mcpConfigFilePath: string, options: { outputPath?: string }) => {
      await migrateAction(mcpConfigFilePath, {
        outputPath: options.outputPath,
      });
    },
  );

const main = async () => {
  program.parse(process.argv);
};

main().catch((error) => {
  logger.error(error);
  process.exit(1);
});

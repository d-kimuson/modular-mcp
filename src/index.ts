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
  .option(
    "--oauth-timeout <seconds>",
    "Time (in seconds) to wait for OAuth authorization before aborting (default: 300)",
  )
  .action(
    async (
      configFilePath: string,
      options: {
        oauthTimeout?: string;
      },
    ) => {
      const oauthTimeoutMs = (() => {
        if (options.oauthTimeout === undefined) {
          return undefined;
        }
        const parsed = Number.parseInt(options.oauthTimeout, 10);
        if (Number.isNaN(parsed) || parsed <= 0) {
          throw new Error(
            "--oauth-timeout must be a positive integer (seconds)",
          );
        }
        return parsed * 1000;
      })();

      await mcpAction(configFilePath, {
        oauthTimeoutMs,
      });
    },
  );

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

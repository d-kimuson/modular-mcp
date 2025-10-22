#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import packageJson from "../package.json" with { type: "json" };
import { loadConfig } from "./config-loader.js";
import { createServer } from "./server.js";

async function main() {
  const configPath = process.argv[2];

  if (!configPath) {
    console.error(
      `Usage: ${packageJson.name}@${packageJson.version} <config-file>`,
    );
    process.exit(1);
  }

  try {
    const config = await loadConfig(configPath);
    const { server } = await createServer(config);
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("MCP Proxy Server started successfully");
  } catch (error) {
    console.error(
      "Failed to start MCP Proxy Server:",
      error instanceof Error ? error : String(error),
    );
    process.exit(1);
  }
}

await main();

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import packageJson from "../package.json" with { type: "json" };
import { logger } from "./logger.js";
import { getTransport } from "./transport.js";
import type {
  CategoryConfig,
  CategoryInfo,
  McpGroupInfo,
  McpServerConfig,
  ResolvedCategory,
  ToolInfo,
} from "./types.js";

type GroupState =
  | {
      status: "connected";
      name: string;
      description: string;
      client: Client;
      transport: Transport;
      tools: ToolInfo[];
    }
  | {
      status: "failed";
      name: string;
      description: string;
      error: Error;
    };

export class ClientManager {
  private groups = new Map<string, GroupState>();
  private categories = new Map<string, ResolvedCategory>();
  private categoryConfigs: Record<string, CategoryConfig> = {};

  /**
   * Initialize category configurations
   */
  initCategories(categoryConfigs: Record<string, CategoryConfig>): void {
    this.categoryConfigs = categoryConfigs;
  }

  async connect(groupName: string, config: McpServerConfig): Promise<void> {
    if (this.groups.has(groupName)) {
      return;
    }

    const client = new Client(
      {
        name: `${packageJson.name}-client`,
        version: packageJson.version,
      },
      {
        capabilities: {},
      },
    );

    const transport = getTransport(config);

    await client.connect(transport);
    const { tools } = await client.listTools();

    this.groups.set(groupName, {
      status: "connected",
      name: groupName,
      description: config.description,
      client,
      transport,
      tools,
    });
  }

  recordFailedConnection(
    groupName: string,
    config: McpServerConfig,
    error: unknown,
  ): void {
    this.groups.set(groupName, {
      status: "failed",
      name: groupName,
      description: config.description,
      error: error instanceof Error ? error : new Error(String(error)),
    });
  }

  listGroups(): McpGroupInfo[] {
    return Array.from(this.groups.values())
      .filter(
        (group): group is Extract<GroupState, { status: "connected" }> =>
          group.status === "connected",
      )
      .map(({ name, description }) => ({
        name,
        description,
      }));
  }

  listFailedGroups(): Array<{
    name: string;
    description: string;
    error: string;
  }> {
    return Array.from(this.groups.values())
      .filter(
        (group): group is Extract<GroupState, { status: "failed" }> =>
          group.status === "failed",
      )
      .map(({ name, description, error }) => ({
        name,
        description,
        error: error.stack ?? error.message,
      }));
  }

  async listTools(groupName: string): Promise<ToolInfo[]> {
    const group = this.groups.get(groupName);
    if (!group) {
      throw new Error(`Not connected to group: ${groupName}`);
    }
    if (group.status === "failed") {
      throw new Error(`Group ${groupName} failed to connect: ${group.error}`);
    }

    return group.tools;
  }

  async callTool(
    groupName: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<{
    content: Array<{ type: string; text?: string; [key: string]: unknown }>;
    isError?: boolean;
  }> {
    const group = this.groups.get(groupName);
    if (!group) {
      throw new Error(`Not connected to group: ${groupName}`);
    }
    if (group.status === "failed") {
      throw new Error(`Group ${groupName} failed to connect: ${group.error}`);
    }

    const response = await group.client.callTool({
      name: toolName,
      arguments: args,
    });

    return {
      content: response.content as Array<{
        type: string;
        text?: string;
        [key: string]: unknown;
      }>,
      isError: response.isError as boolean | undefined,
    };
  }

  /**
   * Disconnect from a specific group
   */
  async disconnect(groupName: string): Promise<void> {
    const group = this.groups.get(groupName);
    if (group === undefined) {
      return;
    }

    if (group.status === "connected") {
      await group.client.close();
      await group.transport.close();
    }

    this.groups.delete(groupName);
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.groups.keys()).map((groupName) =>
      this.disconnect(groupName),
    );
    await Promise.allSettled(disconnectPromises);
  }

  /**
   * List all configured categories
   */
  listCategories(): CategoryInfo[] {
    return Object.entries(this.categoryConfigs).map(([name, config]) => ({
      name,
      description: config.description,
      server: config.server,
    }));
  }

  /**
   * Get tools for a specific category
   * Applies includeNames filter and overrides
   */
  async getCategoryTools(
    categoryName: string,
  ): Promise<{
    tools: Record<string, ToolInfo>;
    meta: {
      category: string;
      sourceServer: string;
      unavailableTools?: string[];
    };
  }> {
    const categoryConfig = this.categoryConfigs[categoryName];
    if (!categoryConfig) {
      throw new Error(`Unknown category: ${categoryName}`);
    }

    // Check if we have cached resolved category
    let resolved = this.categories.get(categoryName);
    if (!resolved) {
      // Resolve the category for the first time
      resolved = await this.resolveCategory(categoryName, categoryConfig);
      this.categories.set(categoryName, resolved);
    }

    // Build result with only enabled tools
    const tools: Record<string, ToolInfo> = {};
    const unavailableTools: string[] = [];

    for (const toolName of categoryConfig.tools.includeNames) {
      const tool = resolved.tools.get(toolName);
      if (!tool) {
        unavailableTools.push(toolName);
        continue;
      }

      // Check if tool is enabled
      const override = resolved.overrides.get(toolName);
      const enabled = override?.enabled ?? true;
      if (!enabled) {
        continue;
      }

      // Apply description override if present
      const finalTool = { ...tool };
      if (override?.description) {
        finalTool.description = override.description;
      }

      tools[toolName] = finalTool;
    }

    return {
      tools,
      meta: {
        category: categoryName,
        sourceServer: categoryConfig.server,
        unavailableTools: unavailableTools.length > 0 ? unavailableTools : undefined,
      },
    };
  }

  /**
   * Call a tool from a specific category
   */
  async callCategoryTool(
    categoryName: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<{
    content: Array<{ type: string; text?: string; [key: string]: unknown }>;
    isError?: boolean;
  }> {
    const categoryConfig = this.categoryConfigs[categoryName];
    if (!categoryConfig) {
      throw new Error(`Unknown category: ${categoryName}`);
    }

    // Check if tool is in the category's includeNames
    if (!categoryConfig.tools.includeNames.includes(toolName)) {
      throw new Error(
        `Tool "${toolName}" is not configured in category "${categoryName}"`,
      );
    }

    // Check if tool is enabled
    const override = categoryConfig.tools.overrides?.[toolName];
    const enabled = override?.enabled ?? true;
    if (!enabled) {
      throw new Error(
        `Tool "${toolName}" in category "${categoryName}" is disabled`,
      );
    }

    // Call the tool via the server
    const serverName = categoryConfig.server;
    return this.callTool(serverName, toolName, args);
  }

  /**
   * Resolve a category by fetching tools from upstream server
   */
  private async resolveCategory(
    categoryName: string,
    config: CategoryConfig,
  ): Promise<ResolvedCategory> {
    const serverName = config.server;
    const group = this.groups.get(serverName);

    if (!group) {
      throw new Error(
        `Server "${serverName}" for category "${categoryName}" is not connected`,
      );
    }

    if (group.status === "failed") {
      throw new Error(
        `Server "${serverName}" for category "${categoryName}" failed to connect: ${group.error}`,
      );
    }

    // Get all tools from the upstream server
    const allTools = group.tools;

    // Build maps for quick lookup
    const toolsMap = new Map<string, ToolInfo>();
    for (const tool of allTools) {
      toolsMap.set(tool.name, tool);
    }

    // Build overrides map
    const overridesMap = new Map<string, { enabled: boolean; description?: string }>();
    if (config.tools.overrides) {
      for (const [toolName, override] of Object.entries(config.tools.overrides)) {
        overridesMap.set(toolName, override);
      }
    }

    // Warn about tools that don't exist in upstream
    for (const toolName of config.tools.includeNames) {
      if (!toolsMap.has(toolName)) {
        logger.warn(
          `Category "${categoryName}" includes tool "${toolName}" which does not exist in upstream server "${serverName}"`,
        );
      }
    }

    return {
      name: categoryName,
      description: config.description,
      server: serverName,
      tools: toolsMap,
      enabledTools: new Set(
        config.tools.includeNames.filter((name) => {
          const override = overridesMap.get(name);
          return override?.enabled ?? true;
        }),
      ),
      overrides: overridesMap,
    };
  }
}

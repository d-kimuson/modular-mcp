import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import packageJson from "../../package.json" with { type: "json" };
import type { McpServerConfig } from "../config/schema.js";
import { connectWithAuthentication } from "./connectWithAuthentication.js";
import type { McpGroupInfo, ToolInfo } from "./types.js";

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

type ModularMcpClientOptions = {
  oauthTimeoutMs?: number;
};

export class ModularMcpClient {
  private readonly groups = new Map<string, GroupState>();

  constructor(private readonly options: ModularMcpClientOptions = {}) {}

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

    const { transport } = await connectWithAuthentication(client, config, {
      oauthTimeoutMs: this.options.oauthTimeoutMs,
    });
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
}

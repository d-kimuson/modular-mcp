import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import packageJson from "../package.json" with { type: "json" };
import { getTransport } from "./transport.js";
import type { McpGroupInfo, McpServerConfig, ToolInfo } from "./types.js";

export class ClientManager {
  private groups = new Map<
    string,
    {
      name: string;
      description: string;
      client: Client;
      transport: Transport;
      tools: ToolInfo[];
    }
  >();

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
      name: groupName,
      description: config.description,
      client,
      transport,
      tools,
    });
  }

  listGroups(): McpGroupInfo[] {
    return Array.from(this.groups.values()).map(({ name, description }) => ({
      name,
      description,
    }));
  }

  async listTools(groupName: string): Promise<ToolInfo[]> {
    const group = this.groups.get(groupName);
    if (!group) {
      throw new Error(`Not connected to group: ${groupName}`);
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
    const groups = this.groups.get(groupName);
    if (!groups) {
      throw new Error(`Not connected to group: ${groupName}`);
    }

    const response = await groups.client.callTool({
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

    await group.client.close();
    await group.transport.close();

    this.groups.delete(groupName);
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.groups.keys()).map((groupName) =>
      this.disconnect(groupName),
    );
    await Promise.allSettled(disconnectPromises);
  }
}

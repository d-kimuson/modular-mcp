import * as v from "valibot";

export const mcpServerConfigSchema = v.object({
  /** Description of what this MCP server group provides */
  description: v.string(),
  /** Transport type (acurrently only stdio is supported) */
  type: v.literal("stdio"),
  /** Command to execute */
  command: v.string(),
  /** Command arguments */
  args: v.optional(v.array(v.string())),
  /** Environment variables */
  env: v.optional(v.record(v.string(), v.string())),
});

export type McpServerConfig = v.InferOutput<typeof mcpServerConfigSchema>;

export const serverConfigSchema = v.object({
  mcpServers: v.record(v.string(), mcpServerConfigSchema),
});

export type ServerConfig = v.InferOutput<typeof serverConfigSchema>;

export interface McpGroupInfo {
  /** Group name (key from mcpServers config) */
  name: string;
  /** Description of what this group provides */
  description: string;
}

export interface ToolInfo {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
    $schema?: string;
  };
}

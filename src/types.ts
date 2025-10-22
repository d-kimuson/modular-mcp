import * as v from "valibot";

export const mcpServerConfigSchema = v.union([
  v.object({
    type: v.literal("stdio"),
    /** Description of what this MCP server group provides */
    description: v.string(),
    command: v.string(),
    args: v.optional(v.array(v.string())),
    env: v.optional(v.record(v.string(), v.string())),
  }),
  v.object({
    type: v.literal("http"),
    /** Description of what this MCP server group provides */
    description: v.string(),
    url: v.string(),
    headers: v.optional(v.record(v.string(), v.string())),
  }),
  v.object({
    type: v.literal("sse"),
    /** Description of what this MCP server group provides */
    description: v.string(),
    url: v.string(),
    headers: v.optional(v.record(v.string(), v.string())),
  }),
]);

// SSEClientTransport

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

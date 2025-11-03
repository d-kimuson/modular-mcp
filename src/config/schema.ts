import * as v from "valibot";

export const mcpServerConfigSchema = v.union([
  v.object({
    type: v.optional(v.literal("stdio"), "stdio"),
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

export type McpServerConfig = v.InferOutput<typeof mcpServerConfigSchema>;

export const serverConfigSchema = v.object({
  mcpServers: v.record(v.string(), mcpServerConfigSchema),
});

export type ServerConfig = v.InferOutput<typeof serverConfigSchema>;

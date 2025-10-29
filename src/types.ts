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

// SSEClientTransport

export type McpServerConfig = v.InferOutput<typeof mcpServerConfigSchema>;

// Category-related schemas
export const toolOverridesSchema = v.object({
  enabled: v.optional(v.boolean(), true),
  description: v.optional(v.string()),
});

export type ToolOverrides = v.InferOutput<typeof toolOverridesSchema>;

export const categoryConfigSchema = v.object({
  description: v.string(),
  server: v.string(),
  tools: v.object({
    includeNames: v.array(v.string()),
    // Future: includePatterns, excludePatterns
    overrides: v.optional(v.record(v.string(), toolOverridesSchema)),
  }),
});

export type CategoryConfig = v.InferOutput<typeof categoryConfigSchema>;

export const serverConfigSchema = v.object({
  mcpServers: v.record(v.string(), mcpServerConfigSchema),
  categories: v.optional(v.record(v.string(), categoryConfigSchema)),
});

export type ServerConfig = v.InferOutput<typeof serverConfigSchema>;

export interface McpGroupInfo {
  /** Group name (key from mcpServers config) */
  name: string;
  /** Description of what this group provides */
  description: string;
}

export interface CategoryInfo {
  /** Category name (key from categories config) */
  name: string;
  /** Description of what this category provides */
  description: string;
  /** Source server name */
  server: string;
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

export interface ResolvedCategory {
  name: string;
  description: string;
  server: string;
  tools: Map<string, ToolInfo>;
  enabledTools: Set<string>;
  overrides: Map<string, ToolOverrides>;
}

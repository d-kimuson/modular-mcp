import { z } from "zod";

export const mcpServerConfigSchema = z.union([
  z.object({
    type: z.literal("stdio").optional().default("stdio"),
    /** Description of what this MCP server group provides */
    description: z.string(),
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional(),
  }),
  z.object({
    type: z.literal("http"),
    /** Description of what this MCP server group provides */
    description: z.string(),
    url: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
  z.object({
    type: z.literal("sse"),
    /** Description of what this MCP server group provides */
    description: z.string(),
    url: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
]);

export type McpServerConfig = z.infer<typeof mcpServerConfigSchema>;

export const serverConfigSchema = z.object({
  mcpServers: z.record(z.string(), mcpServerConfigSchema),
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;

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

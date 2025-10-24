# Modular MCP

A Model Context Protocol (MCP) proxy server that enables efficient management of large tool collections across multiple MCP servers by grouping them and loading tool schemas on-demand.

## Concept

Traditional MCP setups can overwhelm LLM context when dealing with numerous tools from multiple servers. Modular MCP solves this by:

- **Context Efficiency**: Group information is embedded in tool descriptions, so LLMs can discover available groups without making any tool calls
- **On-Demand Loading**: Retrieves detailed tool schemas only when needed for specific groups
- **Separation of Concerns**: Maintains clear phases between tool discovery and execution
- **Proxy Architecture**: Acts as a single MCP endpoint that manages multiple upstream MCP servers

## How it works?

### 1. Configuration

Create a configuration file (e.g., `modular-mcp.json`) for the upstream MCP servers you want to manage. This uses the standard MCP server configuration format, with one addition: a `description` field for each server.

Here's an example using Context7 and Playwright MCP servers:

```diff
{
+ "$schema": "https://raw.githubusercontent.com/d-kimuson/modular-mcp/refs/heads/main/config-schema.json",
  "mcpServers": {
    "context7": {
+     "description": "Use when you need to search library documentation.",
-     "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "env": {}
    },
    "playwright": {
+     "description": "Use when you need to control or automate web browsers.",
-     "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "env": {}
    }
  }
}
```

The `description` field is the only extension to the standard MCP configuration. It helps the LLM understand each tool group's purpose without loading detailed tool schemas.

**Note**: The `type` field defaults to `"stdio"` if not specified. For `stdio` type servers, you can omit the `type` field for cleaner configuration.

### 2. Register Modular MCP

Register Modular MCP in your MCP client configuration (e.g., `.mcp.json` for Claude Code):

```json
{
  "mcpServers": {
    "modular-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@kimuson/modular-mcp", "modular-mcp.json"],
      "env": {}
    }
  }
}
```

### 3. Two Tools Registration

When Modular MCP starts, it registers only two tools to the LLM:

- `get-modular-tools`: Retrieves tool name and schemas for a specific group
- `call-modular-tool`: Executes a tool from a specific group

The `get-modular-tools` tool description includes information about available groups, like this:

```
modular-mcp manages multiple MCP servers as organized groups, providing only the necessary group's tool descriptions to the LLM on demand instead of overwhelming it with all tool descriptions at once.

Use this tool to retrieve available tools in a specific group, then use call-modular-tool to execute them.

Available groups:
- context7: Use when you need to search library documentation.
- playwright: Use when you need to control or automate web browsers.
```

This description is passed to the LLM as part of the system prompt, allowing it to discover available groups without making any tool calls.

### 4. On-Demand Tool Loading

The LLM can now load and use tools on a per-group basis:

1. **Discovery**: The LLM sees available groups in the tool description (no tool calls needed)
2. **Exploration**: When the LLM needs playwright tools, it calls `get-modular-tools` with `group="playwright"`
3. **Execution**: The LLM uses `call-modular-tool` to execute specific tools like `browser_navigate`

For example, to automate a web browser:
```
get-modular-tools(group="playwright")
→ Returns all playwright tool schemas

call-modular-tool(group="playwright", name="browser_navigate", args={"url": "https://example.com"})
→ Executes the navigation through the playwright MCP server
```

This workflow keeps context usage minimal while providing access to all tools when needed.

## Benefits

- **Reduced Context Usage**: Only loads tool information when actually needed
- **Scalable**: Can manage dozens of MCP servers without overwhelming context
- **Flexible**: Easy to add/remove tool groups without affecting others
- **Transparent**: Tools execute exactly as if called directly on upstream servers

# Modular MCP

A Model Context Protocol (MCP) proxy server that enables efficient management of large tool collections across multiple MCP servers by grouping them and loading tool schemas on-demand.

## Concept

Traditional MCP setups can overwhelm LLM context when dealing with numerous tools from multiple servers. Modular MCP solves this by:

- **Context Efficiency**: Only loads high-level group information initially, preventing context pollution
- **On-Demand Loading**: Retrieves detailed tool schemas only when needed for specific groups
- **Separation of Concerns**: Maintains clear phases between tool discovery and execution
- **Proxy Architecture**: Acts as a single MCP endpoint that manages multiple upstream MCP servers

## Workflow

1. **Discovery Phase**: Use `get-tool-groups` to see available tool groups without loading schemas
2. **Exploration Phase**: Use `get-tools` to examine specific groups you're interested in
3. **Execution Phase**: Use `call-tool` to execute tools from the examined groups

This approach enables efficient management of large tool collections while keeping context usage minimal.

## Configuration

This guide shows how to migrate your existing MCP configuration to use Modular MCP. We'll use Claude Code (`.mcp.json`) as an example, but the same approach works for other MCP clients.

### Step 1: Identify Your Existing MCP Servers

If you're using Claude Code, your `.mcp.json` might look like this:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "env": {}
    },
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "env": {}
    }
  }
}
```

### Step 2: Create Modular MCP Configuration

Create a new configuration file (e.g., `modular-mcp.json`) and move your MCP server configurations there. Add a `description` field to each server to help the LLM understand what tools each group provides:

```diff
{
  "mcpServers": {
    "playwright": {
+     "description": "Use when you need to control or automate web browsers.",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "env": {}
    },
    "context7": {
+     "description": "Use when you need to search library documentation.",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "env": {}
    }
  }
}
```

**Key Addition**: The `description` field allows the LLM to understand each tool group's purpose without loading detailed schemas, keeping context usage minimal.

### Step 3: Update Your MCP Client Configuration

Replace your original MCP server configurations in `.mcp.json` with the Modular MCP proxy:

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

Now all your MCP servers are managed through Modular MCP, with on-demand tool loading.

## Example Usage

1. **List available tool groups**:
   ```
   get-tool-groups
   ```
   Returns group names and descriptions without loading tool schemas.

2. **Examine specific group tools**:
   ```
   get-tools with group="playwright"
   ```
   Loads only the tools from the playwright group.

3. **Execute a tool**:
   ```
   call-tool with group="playwright", name="browser_navigate", args={"url": "https://example.com"}
   ```
   Executes the tool through the appropriate upstream MCP server.

## Benefits

- **Reduced Context Usage**: Only loads tool information when actually needed
- **Scalable**: Can manage dozens of MCP servers without overwhelming context
- **Flexible**: Easy to add/remove tool groups without affecting others
- **Transparent**: Tools execute exactly as if called directly on upstream servers

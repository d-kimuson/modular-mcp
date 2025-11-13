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

#### Environment Variable Interpolation

Modular MCP supports environment variable interpolation in configuration files, allowing you to avoid committing sensitive information like API keys and tokens to version control.

**Supported syntax**:
- `$VAR` - Simple variable reference
- `${VAR}` - Braced variable reference (useful when followed by other characters)

**Where interpolation is supported**:
- `stdio` servers: `args` array elements and `env` object values
- `http`/`sse` servers: `url` string and `headers` object values

**Example**:
```json
{
  "mcpServers": {
    "my-server": {
      "description": "Example server with environment variables",
      "command": "node",
      "args": ["$HOME/.local/bin/server.js", "--config=${XDG_CONFIG_HOME}/app/config.json"],
      "env": {
        "API_KEY": "$MY_API_KEY",
        "LOG_DIR": "${HOME}/logs"
      }
    },
    "api-server": {
      "description": "HTTP server with authentication",
      "type": "http",
      "url": "https://api.example.com",
      "headers": {
        "Authorization": "Bearer $API_TOKEN"
      }
    }
  }
}
```

**Important notes**:
- Environment variables must be set before starting Modular MCP
- Missing environment variables will cause an error with a clear message
- Variables are substituted at load time, so the config file remains safe to commit

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

## Migration from Standard MCP Configuration

If you already have a standard MCP configuration file (e.g., `.mcp.json`), you can easily migrate it to Modular MCP format using the built-in migration command.

### Using the Migration Command

Run the migration command with your existing MCP configuration file:

```bash
npx -y @kimuson/modular-mcp migrate <mcp-config-file-path>
```

For example, if you have a `.mcp.json` file:

```bash
npx -y @kimuson/modular-mcp migrate .mcp.json
```

The migration command will:
1. Generate a `modular-mcp.json` file with the migrated configuration (defaults to `modular-mcp.json` in the current directory, or use `-o` to specify a custom path)
2. Replace the original file's contents with a Modular MCP server configuration that references the generated `modular-mcp.json` file

## OAuth Authentication for Remote MCP Servers

Modular MCP supports OAuth-based authentication for remote MCP servers using both `sse` and `http` transports.

### Using Built-in OAuth Support (Experimental)

Modular MCP includes an experimental OAuth client that implements the [MCP Authorization specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization):

```json
{
  "mcpServers": {
    "linear-server": {
      "description": "Use when you want to check Linear tickets, etc.",
      "type": "sse",
      "url": "https://mcp.linear.app/sse"
    }
  }
}
```

On first connection, your browser will open for OAuth authentication. Tokens are stored locally in `~/.modular-mcp/oauth-servers/` and reused automatically.

**Note:** This feature is experimental. If you encounter issues, use the fallback method below.

### Fallback: Using mcp-remote via stdio

For compatibility with all OAuth servers, you can use `mcp-remote` via `stdio` transport:

```json
{
  "mcpServers": {
    "linear-server": {
      "description": "Use when you want to check Linear tickets, etc.",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.linear.app/sse"]
    }
  }
}
```

This approach delegates OAuth handling to the `mcp-remote` client and is recommended if the experimental OAuth support doesn't work for your server.

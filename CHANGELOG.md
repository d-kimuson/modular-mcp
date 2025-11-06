# Changelog

## 0.0.5

### &nbsp;&nbsp;&nbsp;Features

- Add migrate command &nbsp;-&nbsp; by **d-kimsuon** [<samp>(60d4e)</samp>](https://github.com/d-kimuson/modular-mcp/commit/60d4e95)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- OAuth failure when callback server port differs on restart &nbsp;-&nbsp; by **d-kimsuon** [<samp>(6558a)</samp>](https://github.com/d-kimuson/modular-mcp/commit/6558a39)

### &nbsp;&nbsp;&nbsp;Performance

- Added a locking mechanism to authentication to improve parallel connections for servers that do not require authentication &nbsp;-&nbsp; by **d-kimsuon** [<samp>(57184)</samp>](https://github.com/d-kimuson/modular-mcp/commit/57184a4)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/modular-mcp/compare/v0.0.4...0.0.5)

## 0.0.4

### &nbsp;&nbsp;&nbsp;Features

- Implement OAuth authentication flow with modular MCP client &nbsp;-&nbsp; by **d-kimsuon** [<samp>(0c194)</samp>](https://github.com/d-kimuson/modular-mcp/commit/0c1949e)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/modular-mcp/compare/v0.0.3...0.0.4)

## 0.0.3

### &nbsp;&nbsp;&nbsp;Features

- Make "type" field optional with "stdio" as default &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(935a2)</samp>](https://github.com/d-kimuson/modular-mcp/commit/935a289)
- Use Promise.allSettled instead of Promise.all for resilient startup &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(a6d6f)</samp>](https://github.com/d-kimuson/modular-mcp/commit/a6d6f04)
- Add unavailable groups section to inform LLM about failed connections &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(2499a)</samp>](https://github.com/d-kimuson/modular-mcp/commit/2499a31)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/modular-mcp/compare/v0.0.2...0.0.3)

## 0.0.2

### &nbsp;&nbsp;&nbsp;Features

- Remove get-groups command and provide info in description &nbsp;-&nbsp; by **d-kimsuon** [<samp>(069b4)</samp>](https://github.com/d-kimuson/modular-mcp/commit/069b49c)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/modular-mcp/compare/v0.0.1...0.0.2)

## 0.0.1

### &nbsp;&nbsp;&nbsp;Features

- Implement stdio servers &nbsp;-&nbsp; by **d-kimsuon** [<samp>(33534)</samp>](https://github.com/d-kimuson/modular-mcp/commit/33534af)
- Support sse and streamable http transport &nbsp;-&nbsp; by **d-kimsuon** [<samp>(11649)</samp>](https://github.com/d-kimuson/modular-mcp/commit/11649df)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/modular-mcp/compare/2b6a26f52fe42d9fb1bf826ae9be624f2661d8d1...0.0.1)

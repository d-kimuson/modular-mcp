# Changelog

## 0.0.10

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Restrict env var substitution to ${VAR} syntax only with graceful fallback &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(ba641)</samp>](https://github.com/d-kimuson/modular-mcp/commit/ba64108)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/modular-mcp/compare/v0.0.8...v0.0.9)

## 0.0.9

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Restrict env var substitution to ${VAR} syntax only with graceful fallback &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(ba641)</samp>](https://github.com/d-kimuson/modular-mcp/commit/ba64108)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/modular-mcp/compare/v0.0.8...0.0.9)

## 0.0.8

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Oauth multiserver bug fixed by using mcp-remote &nbsp;-&nbsp; by **d-kimsuon** [<samp>(98a38)</samp>](https://github.com/d-kimuson/modular-mcp/commit/98a380f)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/modular-mcp/compare/v0.0.7...0.0.8)

## 0.0.7

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Fix OAuth timeout issue &nbsp;-&nbsp; by **d-kimsuon** [<samp>(xxxxx)</samp>](https://github.com/d-kimuson/modular-mcp/commit/xxxxxxx)
- Fix authentication state reset when connecting to multiple OAuth servers &nbsp;-&nbsp; by **d-kimsuon** [<samp>(xxxxx)</samp>](https://github.com/d-kimuson/modular-mcp/commit/xxxxxxx)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/modular-mcp/compare/v0.0.6...0.0.7)

## 0.0.6

### &nbsp;&nbsp;&nbsp;Features

- Add environment variable substitution utility &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(72bf1)</samp>](https://github.com/d-kimuson/modular-mcp/commit/72bf154)
- Integrate environment variable substitution into config loader &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(73ba7)</samp>](https://github.com/d-kimuson/modular-mcp/commit/73ba73e)
- Add usage examples to Agent Tools descriptions &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(1e934)</samp>](https://github.com/d-kimuson/modular-mcp/commit/1e934b7)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Clean up biome-ignore comments and add env var documentation &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(40955)</samp>](https://github.com/d-kimuson/modular-mcp/commit/409555a)
- Remove usage example from get-modular-tools description &nbsp;-&nbsp; by **d-kimsuon** [<samp>(dc946)</samp>](https://github.com/d-kimuson/modular-mcp/commit/dc94663)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/modular-mcp/compare/v0.0.5...0.0.6)

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

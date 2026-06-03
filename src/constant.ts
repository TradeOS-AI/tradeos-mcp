/** TradeOS production endpoints (not overridable via env). */

export const TRADEOS_CONFIG = {
  baseUrl: "https://ai.tradeos.xyz",
  mcpCallPath: "/api/agent/mcp/mcp-call",
  authorizePath: "/api/agent/mcp/mcp-authorize",
  tokenPath: "/api/agent/mcp/mcp-token",
  mcpCallUrl: "https://ai.tradeos.xyz/api/agent/mcp/mcp-call",
} as const;

/** OAuth loopback (see `scripts/fetch-token.mjs`). */
export const OAUTH_CONFIG = {
  clientId: "claude",
  redirectUri: "http://127.0.0.1:3847/callback",
  callbackPath: "/callback",
  port: 3847,
} as const;

export const BRIDGE_CONFIG = {
  accessTokenEnv: "TRADEOS_ACCESS_TOKEN",
  server: { name: "tradeos-mcp", version: "1.0.3" },
  client: { name: "tradeos-mcp-bridge", version: "1.0.3" },
  proxyInstructions:
    "TradeOS MCP bridge. All tools are executed on TradeOS via mcp-call.",
} as const;

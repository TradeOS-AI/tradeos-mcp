import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { TradeosMcpConfig } from "./config.js";
import { BRIDGE_CONFIG } from "./constant.js";

/** MCP client connected to TradeOS Streamable HTTP `mcp-call`. */
export async function connectRemoteClient(
  config: TradeosMcpConfig,
): Promise<Client> {
  const url = new URL(config.mcpCallUrl);
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    },
  });

  const client = new Client(BRIDGE_CONFIG.client, {
    capabilities: {},
  });

  await client.connect(transport);
  return client;
}

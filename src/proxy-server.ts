import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { BRIDGE_CONFIG } from "./constant.js";

/**
 * stdio MCP server that forwards tools/list and tools/call to the remote TradeOS client.
 */
export function createProxyServer(remoteClient: Client): Server {
  const server = new Server(BRIDGE_CONFIG.server, {
    capabilities: {
      tools: {},
    },
    instructions: BRIDGE_CONFIG.proxyInstructions,
  });

  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    return remoteClient.listTools(request.params);
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return remoteClient.callTool(request.params);
  });

  return server;
}

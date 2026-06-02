#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createProxyServer } from "./proxy-server.js";
import { connectRemoteClient } from "./remote-client.js";

async function shutdown(
  remoteClient: Awaited<ReturnType<typeof connectRemoteClient>>,
  proxyServer: ReturnType<typeof createProxyServer>,
): Promise<void> {
  try {
    await proxyServer.close();
  } catch {
    /* ignore */
  }
  try {
    await remoteClient.close();
  } catch {
    /* ignore */
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  console.error(`[tradeos-mcp-test] remote: ${config.mcpCallUrl}`);

  const remoteClient = await connectRemoteClient(config);
  const proxyServer = createProxyServer(remoteClient);
  const stdioTransport = new StdioServerTransport();

  const onSignal = (): void => {
    void shutdown(remoteClient, proxyServer).finally(() => process.exit(0));
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  await proxyServer.connect(stdioTransport);
  console.error("[tradeos-mcp-test] stdio bridge ready");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[tradeos-mcp-test] fatal: ${message}`);
  process.exit(1);
});

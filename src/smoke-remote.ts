/**
 * Dev-only smoke test (not published in npm build output).
 * Usage: npm run smoke
 */
import { loadConfig } from "./config.js";
import { connectRemoteClient } from "./remote-client.js";

async function main(): Promise<void> {
  const config = loadConfig();
  console.error(`[smoke] ${config.mcpCallUrl}`);

  const client = await connectRemoteClient(config);
  try {
    const { tools } = await client.listTools();
    const names = (tools ?? []).map((t) => t.name);
    console.error(`[smoke] tools (${names.length}): ${names.join(", ")}`);

    if (!names.includes("mcp_health")) {
      throw new Error("expected tool mcp_health in remote catalog");
    }

    const health = await client.callTool({
      name: "mcp_health",
      arguments: {},
    });
    console.error("[smoke] mcp_health OK");
    console.log(
      JSON.stringify({ ok: true, tools: names, mcp_health: health }, null, 2),
    );
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[smoke] failed: ${message}`);
  process.exit(1);
});

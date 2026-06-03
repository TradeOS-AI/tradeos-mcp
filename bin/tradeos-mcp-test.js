#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
// npx @tradeos/tradeos-mcp-test oauth  — subcommand (Windows npx often ignores the 2nd bin name)
const oauthMode =
  args[0] === "oauth" ||
  args[0] === "fetch-token" ||
  args[0] === "tradeos-mcp-test-oauth";
const target = oauthMode
  ? join(root, "scripts", "fetch-token.mjs")
  : join(root, "build", "index.js");
const runArgs = oauthMode ? args.slice(1) : args;

const { status, error } = spawnSync(process.execPath, [target, ...runArgs], {
  stdio: "inherit",
  env: process.env,
  cwd: root,
});
if (error) {
  console.error(`[tradeos-mcp-test] ${error.message}`);
  process.exit(1);
}
process.exit(status ?? 1);

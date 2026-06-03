#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts", "fetch-token.mjs");
const { status, error } = spawnSync(
  process.execPath,
  [script, ...process.argv.slice(2)],
  { stdio: "inherit", env: process.env, cwd: root },
);
if (error) {
  console.error(`[tradeos-mcp-oauth] ${error.message}`);
  process.exit(1);
}
process.exit(status ?? 1);

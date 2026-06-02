#!/usr/bin/env node
/**
 * Sync version across package.json, server.json, and tradeos-skills plugin manifest.
 * Usage: node scripts/sync-registry-version.mjs 1.0.1
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const version = process.argv[2]?.trim();
if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
  console.error("Usage: node scripts/sync-registry-version.mjs <semver>");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.version = version;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const serverPath = join(root, "server.json");
const server = JSON.parse(readFileSync(serverPath, "utf8"));
server.version = version;
if (Array.isArray(server.packages)) {
  for (const p of server.packages) {
    if (p && typeof p === "object") p.version = version;
  }
}
writeFileSync(serverPath, `${JSON.stringify(server, null, 2)}\n`);

const pluginPath = join(
  root,
  "tradeos-skills",
  ".claude-plugin",
  "plugin.json",
);
if (existsSync(pluginPath)) {
  const plugin = JSON.parse(readFileSync(pluginPath, "utf8"));
  plugin.version = version;
  writeFileSync(pluginPath, `${JSON.stringify(plugin, null, 2)}\n`);
}

console.error(`[sync-registry-version] → ${version}`);

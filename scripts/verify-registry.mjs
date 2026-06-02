#!/usr/bin/env node
/**
 * Pre-publish checks: mcpName ↔ server.json, versions, build, URL drift.
 */
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const server = JSON.parse(readFileSync(join(root, "server.json"), "utf8"));

if (!pkg.mcpName) {
  errors.push("package.json: missing mcpName");
} else if (pkg.mcpName !== server.name) {
  errors.push(
    `mcpName (${pkg.mcpName}) must equal server.json name (${server.name})`,
  );
}

if (pkg.version !== server.version) {
  errors.push(
    `version mismatch: package.json ${pkg.version} vs server.json ${server.version}`,
  );
}

const npmPkg = server.packages?.[0];
if (npmPkg?.identifier !== pkg.name) {
  errors.push(
    `server.json packages[0].identifier (${npmPkg?.identifier}) must equal package.json name (${pkg.name})`,
  );
}
if (npmPkg?.version !== pkg.version) {
  errors.push(
    `server.json packages[0].version (${npmPkg?.version}) must equal package.json version (${pkg.version})`,
  );
}

const pluginManifestPath = join(
  root,
  "tradeos-skills",
  ".claude-plugin",
  "plugin.json",
);
if (existsSync(pluginManifestPath)) {
  const plugin = JSON.parse(readFileSync(pluginManifestPath, "utf8"));
  if (plugin.version && plugin.version !== pkg.version) {
    errors.push(
      `tradeos-skills plugin.json version (${plugin.version}) must equal package.json (${pkg.version})`,
    );
  }
}

if (!existsSync(join(root, "build", "index.js"))) {
  errors.push("missing build/index.js — run pnpm run build");
} else {
  const constantPath = join(root, "build", "constant.js");
  if (!existsSync(constantPath)) {
    errors.push("missing build/constant.js — run pnpm run build");
  } else {
    const { TRADEOS_CONFIG } = await import(pathToFileURL(constantPath).href);
    const remoteUrl = server.remotes?.[0]?.url;
    if (remoteUrl && remoteUrl !== TRADEOS_CONFIG.mcpCallUrl) {
      errors.push(
        `server.json remotes[0].url must match TRADEOS_CONFIG.mcpCallUrl (${TRADEOS_CONFIG.mcpCallUrl})`,
      );
    }
    const pluginMcpPath = join(root, "tradeos-skills", ".mcp.json");
    if (existsSync(pluginMcpPath)) {
      const pluginMcp = JSON.parse(readFileSync(pluginMcpPath, "utf8"));
      const pluginUrl = pluginMcp.mcpServers?.tradeos?.url;
      if (pluginUrl && pluginUrl !== TRADEOS_CONFIG.mcpCallUrl) {
        errors.push(
          `tradeos-skills/.mcp.json url must match TRADEOS_CONFIG.mcpCallUrl (${TRADEOS_CONFIG.mcpCallUrl})`,
        );
      }
    }
  }
}

const desc = server.description ?? "";
if (desc.length > 100) {
  errors.push(
    `server.json description is ${desc.length} chars (schema max 100)`,
  );
}

if (errors.length) {
  console.error(
    "[verify-registry] FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"),
  );
  process.exit(1);
}

console.error("[verify-registry] OK");
console.log(
  JSON.stringify(
    {
      mcpName: pkg.mcpName,
      version: pkg.version,
      npm: npmPkg?.identifier,
      remote: server.remotes?.[0]?.url,
    },
    null,
    2,
  ),
);

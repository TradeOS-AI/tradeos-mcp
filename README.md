# tradeos-mcp

Use TradeOS MCP Server to bring your trading data, indicators, strategy logic, and agent workflows into MCP-compatible AI tools. Copy your server URL, add it to GPT or Claude, and let your AI assistant work directly with your TradeOS trading intelligence.

## Overview

This repo publishes **`@tradeos/tradeos-mcp-test`** on npm: a **stdio MCP bridge** that proxies tools to TradeOS Streamable HTTP (`mcp-call`). You can connect in two ways:

| Mode                   | Best for                                    | Auth                           |
| ---------------------- | ------------------------------------------- | ------------------------------ |
| **HTTP** (recommended) | Cursor, Claude Code, most MCP clients       | Browser OAuth in the client    |
| **npm stdio**          | Clients that only support `command` / stdio | `TRADEOS_ACCESS_TOKEN` env var |

Preview endpoint (test branch; both modes ultimately call this):

```text
https://ai-agent-preview.tradeos.xyz/api/agent/mcp/mcp-call
```

Product docs: [TradeOS MCP integration & usage](https://tradeos.gitbook.io/tradeosaifaq/tradeos-mcp-integration-and-usage)

---

## Prerequisites

- [Node.js](https://nodejs.org/) **18+**
- A TradeOS account with MCP API access
- For npm stdio: ability to run a local install (see [Windows notes](#windows-notes))

---

## Option A — HTTP (recommended)

No npm install. The client handles OAuth.

### Cursor

Edit user config `~/.cursor/mcp.json` (Windows: `%USERPROFILE%\.cursor\mcp.json`):

```json
{
  "mcpServers": {
    "tradeos": {
      "url": "https://ai-agent-preview.tradeos.xyz/api/agent/mcp/mcp-call"
    }
  }
}
```

Save, restart Cursor (or refresh MCP in **Settings → MCP**), then complete OAuth when prompted.

### Claude Code (plugin — recommended)

Use the bundled plugin in [`tradeos-skills/`](tradeos-skills/):

```bash
claude --plugin-dir ./tradeos-skills
```

Then complete OAuth and run **`/tradeos:analyze`**. Full plugin workflow (validate, community marketplace submit): [`tradeos-skills/README.md`](tradeos-skills/README.md) — aligned with [Claude plugin docs](https://code.claude.com/docs/en/plugins#submit-your-plugin-to-the-community-marketplace).

---

## Option B — npm stdio bridge

Use when your client requires a local process (`command` + stdio).

### 1. Install locally

**Do not rely on `npx` inside MCP on Windows** (cache/path issues). Install once to a fixed directory:

```bash
mkdir -p ~/tradeos-mcp-run   # Windows: mkdir %USERPROFILE%\Downloads\tradeos-mcp-run
cd ~/tradeos-mcp-run         # Windows: cd %USERPROFILE%\Downloads\tradeos-mcp-run
npm install @tradeos/tradeos-mcp-test@alpha
```

Pin a version if you prefer, e.g. `@tradeos/tradeos-mcp-test@1.0.0-alpha.2`.

### 2. Get `TRADEOS_ACCESS_TOKEN`

Run the OAuth helper (opens browser → log in on TradeOS → prints token):

```bash
# Linux / macOS
npx -y -p @tradeos/tradeos-mcp-test@alpha tradeos-mcp-test-oauth

# Or, from your install directory:
node node_modules/@tradeos/tradeos-mcp-test/scripts/fetch-token.mjs
```

**Windows (recommended):**

```cmd
cd /d %USERPROFILE%\Downloads\tradeos-mcp-run
node node_modules\@tradeos\tradeos-mcp-test\scripts\fetch-token.mjs
```

Copy the printed JWT (`eyJ...`). For **local development of this repo**, copy into `.env`:

```bash
cp .example.env .env
# TRADEOS_ACCESS_TOKEN=eyJ...
```

End users who only `npm install` the package do not need `.env` — set the token in MCP client config (`mcp.json`) instead.

**Do not commit tokens to git.**

### 3. Configure Cursor

```json
{
  "mcpServers": {
    "tradeos-npm": {
      "command": "node",
      "args": [
        "C:/Users/YOU/Downloads/tradeos-mcp-run/node_modules/@tradeos/tradeos-mcp-test/build/index.js"
      ],
      "env": {
        "TRADEOS_ACCESS_TOKEN": "eyJ..."
      }
    }
  }
}
```

Replace `YOU` and the path with your actual install location. Use forward slashes or escaped backslashes in JSON.

If Cursor cannot find `node`, set the full path:

```json
"command": "C:/nvm4w/nodejs/node.exe"
```

Enable **tradeos-npm** in **Settings → MCP**. Status should show connected with tools listed.

### 4. Verify in terminal (optional)

Environment variables in `mcp.json` **do not** apply to your shell. Set the token in the **same** terminal session:

```cmd
REM Windows CMD
set TRADEOS_ACCESS_TOKEN=eyJ...
node C:\Users\YOU\Downloads\tradeos-mcp-run\node_modules\@tradeos\tradeos-mcp-test\build\index.js
```

```bash
# Linux / macOS
export TRADEOS_ACCESS_TOKEN=eyJ...
node ~/tradeos-mcp-run/node_modules/@tradeos/tradeos-mcp-test/build/index.js
```

Success:

```text
[tradeos-mcp-test] remote: https://ai-agent-preview.tradeos.xyz/api/agent/mcp/mcp-call
[tradeos-mcp-test] stdio bridge ready
```

Press `Ctrl+C` to stop. Cursor starts its own process; you do not need to keep this terminal open.

---

## Windows notes

1. **Use local `node` + install path in `mcp.json`**, not `npx`, for MCP.
2. If npm cache errors mention `C:\Program Files\nodejs\node_cache`, run once:
   ```cmd
   npm config set cache "%USERPROFILE%\.npm-cache"
   ```
3. **`npx @pkg tradeos-mcp-test-oauth`** may run the wrong bin on Windows. Prefer:
   ```cmd
   npx -y -p @tradeos/tradeos-mcp-test@alpha tradeos-mcp-test-oauth
   ```
   or `node .../scripts/fetch-token.mjs` from your install directory.
4. Clear a broken npx cache (quit Cursor first):
   ```cmd
   rmdir /s /q "%USERPROFILE%\.npm-cache\_npx"
   ```

---

## npm package reference

| Item              | Value                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Package           | `@tradeos/tradeos-mcp-test`                                                                        |
| Pre-release tag   | `alpha` → e.g. `1.0.0-alpha.2`                                                                     |
| MCP Registry name | `io.github.TradeOS-AI/tradeos-mcp-test`                                                            |
| Bin: MCP bridge   | `tradeos-mcp-test`                                                                                 |
| Bin: OAuth token  | `tradeos-mcp-test-oauth`                                                                           |
| OAuth subcommand  | `oauth` on bin `tradeos-mcp-test` (from **alpha.3**; use `-p … tradeos-mcp-test-oauth` on alpha.2) |

Install pre-release:

```bash
npm install @tradeos/tradeos-mcp-test@alpha
```

---

## Development (this repo)

```bash
git clone https://github.com/TradeOS-AI/tradeos-mcp.git
cd tradeos-mcp
npm ci
npm run build
npm run oauth:token    # browser OAuth → prints token (copy into .env if needed)
npm run registry:verify
```

> `oauth:token` runs `pnpm run build` internally. If you do not use pnpm: `npm run build && node scripts/fetch-token.mjs`.

| Script                                | Purpose                                             |
| ------------------------------------- | --------------------------------------------------- |
| `npm run build`                       | Compile stdio bridge to `build/`                    |
| `npm run oauth:token`                 | Browser OAuth → print token                         |
| `npm run registry:verify`             | Pre-publish checks (`package.json` ↔ `server.json`) |
| `npm run registry:sync-version <ver>` | Sync version from release tag                       |

---

## Publishing (maintainers)

Push a version tag to trigger [`.github/workflows/publish-mcp.yml`](.github/workflows/publish-mcp.yml):

```bash
git tag v1.0.0-alpha.3
git push origin v1.0.0-alpha.3
```

- Stable tags (`v1.0.0`) publish to npm `latest`.
- Pre-release tags (`v1.0.0-alpha.3`) publish with dist-tag **`alpha`**.
- Requires GitHub Actions secret **`NPM_TOKEN`** (Classic **Automation** token for `@tradeos`).
- Also publishes to the [MCP Registry](https://registry.modelcontextprotocol.io/) via OIDC.

---

## Troubleshooting

| Symptom                                                     | Likely cause                      | Fix                                                                                  |
| ----------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| `TRADEOS_ACCESS_TOKEN is required`                          | Token not set in env / `mcp.json` | Run oauth helper; set `env` in MCP config                                            |
| `unauthorized` on connect                                   | Expired or invalid token          | Re-run oauth; paste fresh JWT (no `Bearer` prefix)                                   |
| `EPERM` / `node_cache`                                      | npm cache under `Program Files`   | `npm config set cache "%USERPROFILE%\.npm-cache"`                                    |
| `TAR_ENTRY_ERROR` / `'tradeos-mcp-test' is not recognized` | `npx` failed on Windows           | Local install + `node` path in `mcp.json`                                            |
| `MODULE_NOT_FOUND` for `node_modules/...`                   | Ran script from wrong directory   | `cd` to install dir or use absolute path                                             |
| Token works in terminal, not in Cursor                      | `mcp.json` path or token mismatch | Match paths; restart Cursor / refresh MCP                                            |
| MCP connects but no tools                                   | Wrong server enabled              | Disable broken `localhost` entries; use production HTTP URL or working `tradeos-npm` |

---

## Related

- [`tradeos-skills/`](tradeos-skills/) — Claude Code plugin + analyze skill
- [`server.json`](server.json) — MCP Registry manifest
- [TradeOS MCP FAQ (GitBook)](https://tradeos.gitbook.io/tradeosaifaq/tradeos-mcp-integration-and-usage)

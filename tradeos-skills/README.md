# tradeos-skills

Claude Code plugin for [TradeOS](https://ai.tradeos.xyz) MCP (symbol search, My Agent, chart TA, macro/news).

## Layout

```text
tradeos-skills/
├── .claude-plugin/
│   └── plugin.json      # manifest
├── .mcp.json            # MCP server endpoint
├── skills/
│   └── analyze/
│       └── SKILL.md     # when/how to call TradeOS tools
└── README.md
```

## Install

**Claude Code (plugin)**

1. Add this folder as a plugin (marketplace, local path, or copy into your plugins directory).
2. Enable the plugin; MCP server `tradeos` loads from `.mcp.json`.
3. Complete OAuth when prompted (sign in at https://ai.tradeos.xyz/mcp).

**Cursor / other clients**

- MCP: use the same URL as `.mcp.json`, or stdio via `npx -y @tradeos-ai/tradeos-mcp-test` (see [../README.md](../README.md)).
- Skill only: copy `skills/analyze` into `.cursor/skills/analyze`.

## MCP endpoint

Streamable HTTP (OAuth in client):

```text
https://ai.tradeos.xyz/api/agent/mcp/mcp-call
```

Stdio alternative (npm package in parent repo):

```bash
npx tradeos-mcp-test-oauth   # print TRADEOS_ACCESS_TOKEN
npx -y @tradeos-ai/tradeos-mcp-test
```

## Docs

- npm bridge & Registry: [../README.md](../README.md)
- Product usage: [TradeOS MCP documentation](https://tradeos.gitbook.io/tradeosaifaq/tradeos-mcp-integration-and-usage)

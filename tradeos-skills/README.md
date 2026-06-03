# tradeos-skills

Claude Code **plugin** for [TradeOS](https://ai.tradeos.xyz): MCP connection + **`/tradeos:analyze`** skill (symbol search, My Agent, chart TA, macro/news).

Follows the [Claude Code plugins guide](https://code.claude.com/docs/en/plugins) and [community marketplace submission](https://code.claude.com/docs/en/plugins#submit-your-plugin-to-the-community-marketplace).

## Plugin layout

```text
tradeos-skills/                 ← plugin root (not inside .claude-plugin/)
├── .claude-plugin/
│   └── plugin.json             # manifest only
├── .mcp.json                   # MCP: Streamable HTTP + OAuth
├── skills/
│   └── analyze/
│       └── SKILL.md            # /tradeos:analyze
└── README.md
```

| File                                                       | Role                                                     |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) | Plugin identity (`name`: `tradeos`), version, MCP wiring |
| [`.mcp.json`](.mcp.json)                                   | `https://ai.tradeos.xyz/api/agent/mcp/mcp-call`          |
| [`skills/analyze/SKILL.md`](skills/analyze/SKILL.md)       | Tool picker + workflows for TradeOS MCP                  |

> **Do not** put `skills/`, `.mcp.json`, etc. inside `.claude-plugin/` — only `plugin.json` belongs there.

---

## Local development

From the **repo root** (parent of `tradeos-skills/`):

```bash
claude --plugin-dir ./tradeos-skills
```

In Claude Code:

1. Enable the plugin if prompted.
2. Complete **OAuth** when TradeOS MCP connects (sign in at https://ai.tradeos.xyz/mcp).
3. Run `/reload-plugins` after editing `SKILL.md` or `plugin.json`.
4. Try the skill: **`/tradeos:analyze`** (namespace = `plugin.json` → `name`).
5. Confirm MCP tools with `mcp_health` or `/mcp`.

Optional: scaffold-style init for personal copy:

```bash
claude plugin init my-tradeos   # creates ~/.claude/skills/my-tradeos/ — use as reference only
```

---

## Validate before submit

From the plugin root (`tradeos-skills/`):

```bash
claude plugin validate .
```

From the **repo root**:

```bash
claude plugin validate ./tradeos-skills
```

Fix any reported issues. The community review pipeline runs the same check plus automated safety screening.

---

## Submit to the community marketplace

Anthropic hosts two public marketplaces ([docs](https://code.claude.com/docs/en/plugins#submit-your-plugin-to-the-community-marketplace)):

| Marketplace                   | Notes                                                  |
| ----------------------------- | ------------------------------------------------------ |
| **`claude-plugins-official`** | Anthropic-curated; no public application               |
| **`claude-community`**        | Third-party plugins after review → `@claude-community` |

**Submission steps**

1. Run `claude plugin validate .` locally (from `tradeos-skills/`).
2. Submit via one of:
   - **Claude.ai**: [claude.ai/settings/plugins/submit](https://claude.ai/settings/plugins/submit)
   - **Console**: [platform.claude.com/plugins/submit](https://platform.claude.com/plugins/submit)
3. After approval, the plugin is pinned in [`anthropics/claude-plugins-community`](https://github.com/anthropics/claude-plugins-community) (catalog: [marketplace.json](https://github.com/anthropics/claude-plugins-community/blob/main/.claude-plugin/marketplace.json)).
4. Public catalog syncs **nightly** — there may be a delay before install works.

**Users install from community marketplace**

```text
/plugin marketplace add anthropics/claude-plugins-community
/plugin install @claude-community/tradeos
```

(Exact install name follows the catalog entry after approval.)

---

## analyze skill

[`skills/analyze/SKILL.md`](skills/analyze/SKILL.md) teaches Claude when and how to call TradeOS MCP tools:

- `mcp_health`, `search_tickers`, `customize-agent`, `technical_analysis`, `bloomberg-oracle-terminal`
- Default workflows (single-symbol TA, macro/news, etc.)

Requires TradeOS MCP connected (plugin loads it via `.mcp.json`).

---

## Other clients (Cursor, Codex, ChatGPT)

This folder is a **Claude Code plugin**. For npm stdio bridge, Cursor `mcp.json`, or npm publish, see the [parent README](../README.md).

Product docs: [TradeOS MCP (GitBook)](https://tradeos.gitbook.io/tradeosaifaq/tradeos-mcp-integration-and-usage)

# tradeos-skills

Claude Code **plugin** for [TradeOS](https://ai.tradeos.xyz): agentic technical analysis of XAUUSD and other markets, plus no-code AI trading agents for 24/7 smart alerts. Includes the **`/tradeos:analyze`** skill, ticker search, spread comparisons, and macro/news context.

Follows the [Claude Code plugins guide](https://code.claude.com/docs/en/plugins) and [community marketplace submission](https://code.claude.com/docs/en/plugins#submit-your-plugin-to-the-community-marketplace).

## Connect TradeOS after installation

In Claude, open **Settings → Connectors**, find **TradeOS**, enable it if it is off, click **Connect**, and sign in. In Claude Code, run `/mcp`, select **tradeos**, choose **Connect**, and complete sign-in. If you cannot find a TradeOS tool, first check that the connector is enabled. If a tool returns `unauthorized`, connect or reconnect and sign in, then retry your request.

## Plugin layout

```text
tradeos-mcp/                    ← plugin root (not inside .claude-plugin/)
├── .claude-plugin/
│   └── plugin.json             # manifest only
├── .mcp.json                   # MCP: Streamable HTTP + OAuth
├── logo.png                    # Plugin icon
├── LICENSE                     # MIT license
├── skills/
│   └── analyze/
│       └── SKILL.md            # /tradeos:analyze
└── README.md
```

| File                                                       | Role                                                     |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) | Plugin identity (`name`: `tradeos`), version, MCP wiring |
| [`.mcp.json`](.mcp.json)                                   | `https://ai.tradeos.xyz/api/agent/mcp/mcp-call`          |
| [`logo.png`](logo.png)                                     | Plugin icon                                              |
| [`LICENSE`](LICENSE)                                       | MIT license                                              |
| [`skills/analyze/SKILL.md`](skills/analyze/SKILL.md)       | Tool picker + workflows for TradeOS MCP                  |

> **Do not** put `skills/`, `.mcp.json`, etc. inside `.claude-plugin/` — only `plugin.json` belongs there.

Plugin icon: [TradeOS logo](logo.png). Privacy policy: [TradeOS privacy policy](https://ai.tradeos.xyz/privacy-policy).

---

## Local development

From the **repo root**:

```bash
claude --plugin-dir .
```

In Claude Code:

1. Enable the plugin if prompted.
2. Run `/mcp`, connect **tradeos**, and complete sign-in.
3. Run `/reload-plugins` after editing `SKILL.md` or `plugin.json`.
4. Try the skill: **`/tradeos:analyze`** (namespace = `plugin.json` → `name`).
5. Confirm MCP tools with `mcp_health` or `/mcp`.

Optional: scaffold-style init for personal copy:

```bash
claude plugin init my-tradeos   # creates ~/.claude/skills/my-tradeos/ — use as reference only
```

---

## Validate before submit

From the plugin root (repo root):

```bash
claude plugin validate .
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

1. Run `claude plugin validate .` locally (from the repo root).
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

This repository is a **Claude Code plugin**. For other clients, see the TradeOS MCP product docs below.

Product docs: [TradeOS MCP (GitBook)](https://tradeos.gitbook.io/tradeosaifaq/tradeos-mcp-integration-and-usage)

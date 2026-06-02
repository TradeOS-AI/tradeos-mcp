---
name: analyze
description: >-
  Use TradeOS MCP tools for symbol search, My Agent CRUD, live chart technical
  analysis (Ticker-Analyze), and macro/news summaries. Use when the user asks
  about TradeOS, stock/crypto tickers, chart TA, My Agent, spread/ratio charts,
  or market headlines — and TradeOS MCP is available.
---

# TradeOS analyze

TradeOS exposes **5 MCP tools** on `https://ai.tradeos.xyz`. This skill maps user intent to the correct tool and argument shape.

## Prerequisites

1. TradeOS MCP is connected (`mcp_health` should succeed).
2. Never pass `userId` in tool arguments (OAuth injects it).
3. For stdio bridge only: `TRADEOS_ACCESS_TOKEN` must be set.

## Tool picker

| User wants | Tool | Not this |
|------------|------|----------|
| Check MCP / auth | `mcp_health` | — |
| Resolve symbol from name or fuzzy text | `search_tickers` | `technical_analysis`, `customize-agent` |
| Create/list/update/delete My Agent, read **old** report | `customize-agent` | `technical_analysis` for new analysis |
| **New** chart / TA / trade question | `technical_analysis` | `latest_analysis`, `bloomberg-oracle-terminal` |
| Macro, news, policy, “why did X move” | `bloomberg-oracle-terminal` | `technical_analysis` |

## Default workflows

### Single symbol — full analysis

1. `search_tickers` with `{ "q": "<user text>" }` unless ticker is already exact (e.g. `NASDAQ:AAPL`).
2. `customize-agent` `{ "action": "create", "create": { ticker, interval, strategy, indicators, prompt, trigger } }` — or skip if user already has an agent.
3. `technical_analysis` `{ "action": "agent", "agent": { "customizeAgentId": "<id>", "userQuestion": "<question>" } }`.

For a one-off question without saving an agent, use `technical_analysis` with `action: "ad_hoc"` instead of step 2–3.

### Read last saved report only

`customize-agent` `{ "action": "latest_analysis", "latest_analysis": { "agentId": "<id>" } }` — does **not** run a new LLM pass.

### Macro / headlines

`bloomberg-oracle-terminal` `{ "query": "<specific question with symbol, date, region if helpful>" }` → use `data.summary` (Markdown).

## `search_tickers`

```json
{ "q": "apple", "limit": 5, "exchange": "NASDAQ" }
```

- `exchange` (optional): `NASDAQ` | `NYSE` | `CRYPTO` | `NYSE Arca` | `NYSE American`
- Use exact `ticker` from `data[]` in later tools.

## `customize-agent`

`action`: `create` | `update` | `delete` | `get` | `list` | `latest_analysis`

Nested or flat args are both accepted, e.g.:

```json
{ "action": "list" }
```

```json
{
  "action": "create",
  "create": {
    "ticker": "NASDAQ:AAPL",
    "interval": "1D",
    "strategy": "Trend-Analysis",
    "indicators": ["Moving Average", "Bollinger Bands"],
    "prompt": "…",
    "trigger": { "condition": [] }
  }
}
```

- `interval` / `mainWindow`: `1` | `5` | `15` | `30` | `60` | `240` | `1D` | `1W` | `4W`
- `indicators`: 1–20 English full names (server maps to internal codes).
- Do **not** pass `title` on create (server-generated).
- `update` requires `agentId` and at least one mutable field.

## `technical_analysis`

`action`: `agent` | `ad_hoc`

**My Agent (config loaded from DB):**

```json
{
  "action": "agent",
  "agent": {
    "customizeAgentId": "<from list or create>",
    "userQuestion": "Trend and key levels?"
  }
}
```

**Ad-hoc (no saved agent):**

```json
{
  "action": "ad_hoc",
  "ad_hoc": {
    "ticker": "NASDAQ:AAPL",
    "mainWindow": "1D",
    "userQuestion": "Is the daily structure still bullish?",
    "strategy": "Trend-Analysis"
  }
}
```

Response: `streamPreview` (Markdown), `screenshotHints[]` (text only). Long runs may hit ~180s lock or client timeout.

## Spread / ratio charts

One `ticker` string: `"<tickerA> / <tickerB>"` (spaces around `/`).

1. `search_tickers` for each leg; use exact codes from results.
2. Example: `"MSFT / SPY"`, `"X:BTCUSD / X:ETHUSD"`.
3. Use in `customize-agent` create/update or `technical_analysis` ad_hoc `ticker`.
4. Ask ratio / relative-strength questions in `userQuestion`.

## Errors (common)

| Signal | Action |
|--------|--------|
| `unauthorized` | Reconnect MCP OAuth or refresh `TRADEOS_ACCESS_TOKEN` |
| `invalid_input` | Fix action name, required fields, enums |
| balance / rate_limit / service_busy | Tell user to check TradeOS account quota |
| Missing tool | Confirm MCP server is TradeOS, not another bridge |

## Do not

- Use `latest_analysis` when the user wants a **fresh** chart write-up.
- Use `bloomberg-oracle-terminal` for per-symbol K-line TA.
- Use `search_tickers` for news or macro narrative.
- Invent tickers; always prefer `search_tickers` results for ambiguous names.

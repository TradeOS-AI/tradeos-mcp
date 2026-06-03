---
name: analyze
description: >-
  Use TradeOS MCP for symbol search, My Agent CRUD, live chart technical analysis
  (Ticker-Analyze), macro/news, spread vs benchmark (SPY, XAUUSD), multi-symbol
  ranking, strategy/indicator/timeframe selection. Use when the user asks about
  TradeOS, tickers, chart TA, relative strength, portfolio screening, My Agent,
  or market headlines — and TradeOS MCP is available.
---

# TradeOS analyze

TradeOS exposes **5 MCP tools** on `https://ai-agent-preview.tradeos.xyz`. This skill maps user intent to the correct tool, argument shape, and analysis playbook.

## Contents

| #   | Section                                                                   |
| --- | ------------------------------------------------------------------------- |
| 1   | [Prerequisites](#1-prerequisites)                                         |
| 2   | [Tool picker](#2-tool-picker)                                             |
| 3   | [Tool usage](#3-tool-usage)                                               |
| 4   | [Parameters and enums](#4-parameters-and-enums)                           |
| 5   | [Common errors and wrong use cases](#5-common-errors-and-wrong-use-cases) |

---

## 1. Prerequisites

1. TradeOS MCP is connected — run `mcp_health` first after OAuth.
2. Never pass `userId` in tool arguments (OAuth injects it).
3. For stdio bridge only: `TRADEOS_ACCESS_TOKEN` must be set.

---

## 2. Tool picker

| #   | User wants                                                 | Tool                        | Not this                                       |
| --- | ---------------------------------------------------------- | --------------------------- | ---------------------------------------------- |
| 2.1 | Check MCP / auth                                           | `mcp_health`                | —                                              |
| 2.2 | Resolve symbol from name or fuzzy text                     | `search_tickers`            | `technical_analysis`, `customize-agent`        |
| 2.3 | Create/list/update/delete My Agent; read **stored** report | `customize-agent`           | `technical_analysis` for new analysis          |
| 2.4 | **New** chart / TA / trade question                        | `technical_analysis`        | `latest_analysis`, `bloomberg-oracle-terminal` |
| 2.5 | Macro, news, policy, “why did X move”                      | `bloomberg-oracle-terminal` | `technical_analysis`                           |

**Default call chain:** `search_tickers` → `customize-agent` (optional) → `technical_analysis`

---

## 3. Tool usage

Each subsection below is a **how-to** for one tool (`mcp_health` omitted — call with no args after OAuth).

---

### 3.1 `search_tickers`

**Purpose:** Symbol lookup only. Read-only — no agents, LLM, or charts.

**When to use**

- User gives a company name, alias, or partial ticker.
- Disambiguate before `customize-agent` or `technical_analysis`.
- Resolve **each leg** of a spread (`assetA` and `assetB` separately).

**When NOT to use**

- Chart TA → `technical_analysis`
- Agent CRUD → `customize-agent`
- News / macro → `bloomberg-oracle-terminal`

**How to call**

```json
{ "q": "apple", "limit": 5, "exchange": "NASDAQ" }
```

| Step | Action                                                                   |
| ---- | ------------------------------------------------------------------------ |
| 1    | Pass `q` (required). Add `limit` (1–50) or `exchange` filter if helpful. |
| 2    | Read `data[]` — use exact `ticker` string in later tools.                |
| 3    | Skip this step if ticker is already exact (e.g. `NASDAQ:AAPL`).          |

**Spread / ratio:** search **each** leg, then join as `"<tickerA> / <tickerB>"` (see §4.6).

**Response:** `ok`, `query`, `count`, `data[]` (`ticker`, `name`, `exchange`, `score`, `isWatch`, …).

---

### 3.2 `customize-agent`

**Purpose:** My Agent CRUD + read last **stored** analysis from DB. Does **not** run a new LLM — use `technical_analysis` for live analysis.

**When to use**

| Action            | Use case                                                              |
| ----------------- | --------------------------------------------------------------------- |
| `create`          | Save a reusable agent (ticker, strategy, indicators, prompt, trigger) |
| `update`          | Change agent config                                                   |
| `delete`          | Remove an agent                                                       |
| `get`             | Read one agent's config                                               |
| `list`            | List all user's agents                                                |
| `latest_analysis` | Read **previous** stored report only (no new LLM run)                 |

**When NOT to use**

- Fresh chart write-up → `technical_analysis`
- Symbol lookup → `search_tickers`

**How to call — list agents**

```json
{ "action": "list" }
```

**How to call — create agent**

| Step | Action                                               |
| ---- | ---------------------------------------------------- |
| 1    | `search_tickers` if ticker is ambiguous              |
| 2    | Choose `interval`, `strategy`, `indicators` (see §4) |
| 3    | Call `create` with nested or flat args               |

```json
{
  "action": "create",
  "create": {
    "ticker": "NASDAQ:AAPL",
    "interval": "1D",
    "extraWindow": ["1W", "4W"],
    "strategy": "Trend-Analysis",
    "indicators": [
      "Moving Average",
      "Bollinger Bands",
      "Relative Strength Index"
    ],
    "prompt": "Daily trend and key levels for AAPL.",
    "trigger": { "condition": [] }
  }
}
```

**How to call — update / delete / get**

```json
{
  "action": "update",
  "update": { "agentId": "<id>", "strategy": "Smart-Money-Concept" }
}
```

```json
{ "action": "delete", "delete": { "agentId": "<id>" } }
```

```json
{ "action": "get", "get": { "agentId": "<id>" } }
```

**How to call — read stored report (not fresh analysis)**

```json
{
  "action": "latest_analysis",
  "latest_analysis": { "agentId": "<id>" }
}
```

**After create:** run `technical_analysis` with `action=agent` and `customizeAgentId` from create/list response.

**Rules**

- Do **not** pass `title` on create (server-generated).
- `update` requires `agentId` + at least one mutable field; if `indicators` is sent, must be non-empty.
- Spread ticker: one string `"assetA / assetB"` (see §4.6). Pro users keep full spread on create/update.

---

### 3.3 `technical_analysis`

**Purpose:** Live Ticker-Analyze — server captures multi-timeframe chart screenshots for the LLM. Returns `streamPreview` (Markdown) + `screenshotHints[]` (text only).

**When to use:** Chart TA, levels, strategy framing, trade questions.

**When NOT to use:** Agent CRUD / stored report → `customize-agent` · symbol search → `search_tickers` · news → `bloomberg-oracle-terminal`.

**Two modes**

| Mode     | When                                                                   |
| -------- | ---------------------------------------------------------------------- |
| `ad_hoc` | One-off question; pass ticker, mainWindow, strategy, indicators inline |
| `agent`  | Reuse saved My Agent config from `customize-agent`                     |

**Time windows — common usage**

| Horizon            | Intervals         | Typical use                                    |
| ------------------ | ----------------- | ---------------------------------------------- |
| Short / scalp      | `1`, `5`, `15`    | Intraday entries, quick momentum, tight stops  |
| Intraday / swing   | `30`, `60`, `240` | Session structure, 1–5 day holds               |
| Medium / position  | `1D`, `1W`        | Swing to multi-week trend, daily structure     |
| Long / macro chart | `1W`, `4W`        | Primary trend filter; avoid fighting higher TF |

1. Set **`mainWindow`** to the horizon the user cares about (usually `1D` for equities).
2. Add **`extraWindows`** top-down for context — e.g. `["4W", "1W", "1D", "60"]` (max 8 on ad_hoc).
3. Match strategy to primary window — e.g. `Scalping-EMA` on `5`/`15`; `Trend-Following` on `1D`/`1W`; `Smart-Money-Concept` on `60`/`240`/`1D`.

Valid interval enum values: see §4.1.

---

#### 3.3.1 Single asset

One symbol (not a spread). Example: `NASDAQ:AAPL`, `X:BTCUSD`.

**Path A — ad_hoc (one-off, no saved agent)**

| Step | Action                                                                    |
| ---- | ------------------------------------------------------------------------- |
| 1    | `search_tickers` unless ticker is exact                                   |
| 2    | Pick `mainWindow`, optional `extraWindows`, `strategy`, `indicators` (§4) |
| 3    | Call `technical_analysis` `ad_hoc` with a structured `userQuestion`       |

```json
{
  "action": "ad_hoc",
  "ad_hoc": {
    "ticker": "NASDAQ:AAPL",
    "mainWindow": "1D",
    "extraWindows": ["1W", "4W"],
    "strategy": "Trend-Analysis",
    "indicators": [
      "Moving Average",
      "Moving Average Convergence Divergence",
      "Relative Strength Index",
      "Bollinger Bands"
    ],
    "userQuestion": "Is the daily structure still bullish? List key support/resistance, momentum confirmation, and volatility regime."
  }
}
```

**Path B — agent (reusable My Agent)**

| Step | Action                                                                |
| ---- | --------------------------------------------------------------------- |
| 1    | `customize-agent` `create` (or `list` existing agent)                 |
| 2    | `technical_analysis` `agent` with `customizeAgentId` + `userQuestion` |

```json
{
  "action": "agent",
  "agent": {
    "customizeAgentId": "<from create or list>",
    "userQuestion": "Trend and key levels on the daily chart?"
  }
}
```

**Suggested `userQuestion` checklist (single asset)**

1. Primary trend on `mainWindow` (bullish / bearish / range)
2. Key support/resistance and invalidation level
3. Momentum confirmation or divergence
4. Volatility regime (compression vs expansion)
5. _(Optional)_ Higher-TF alignment from `extraWindows`

---

#### 3.3.2 Multi asset (spread vs benchmark)

Compare **many symbols against one benchmark** using ratio charts. One `ticker` per pair: `"<symbol> / <benchmark>"`.

**Common benchmarks**

| Benchmark  | When to use                 | Example                   |
| ---------- | --------------------------- | ------------------------- |
| SPY / QQQ  | US equities vs broad market | `MSFT / SPY`, `LLY / SPY` |
| C:XAUUSD   | vs gold / risk-off context  | `AAPL / C:XAUUSD`         |
| Sector ETF | Peer group                  | `NVDA / QQQ`              |

**Workflow**

| Step | Action                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------ |
| 1    | `search_tickers` for **each leg** (every symbol + benchmark once)                                            |
| 2    | For **each symbol**, one `technical_analysis` `ad_hoc` with spread `ticker`                                  |
| 3    | Ask trend / momentum / volatility scoring in `userQuestion`                                                  |
| 4    | **Synthesize** all results: rank composite 0–100 (**0** = strong short spread, **100** = strong long spread) |
| 5    | _(Optional)_ one `bloomberg-oracle-terminal` call for basket-level macro context                             |

**Example payload (one pair)**

```json
{
  "action": "ad_hoc",
  "ad_hoc": {
    "ticker": "LLY / SPY",
    "mainWindow": "1D",
    "extraWindows": ["1W", "4W"],
    "strategy": "Trend-Analysis",
    "indicators": [
      "Moving Average",
      "Relative Strength Index",
      "Moving Average Convergence Divergence",
      "Bollinger Bands",
      "Average True Range"
    ],
    "userQuestion": "Analyze this spread for trend, momentum, and volatility. Score each 0–100. Summarize bias: long spread, short spread, or neutral."
  }
}
```

**Scoring dimensions** (state explicitly in `userQuestion`)

| Dimension  | Judge on ratio chart                      | Indicators (see §4.5)                                                                                    |
| ---------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Trend      | Ratio direction, MA slope, HH/HL vs LH/LL | `Moving Average`, `Ichimoku Cloud`, `Super Trend`, `Average Directional Index`                           |
| Momentum   | Acceleration vs benchmark                 | `Moving Average Convergence Divergence`, `Relative Strength Index`, `KDJ Oscillator`, `Squeeze Momentum` |
| Volatility | Band width, ATR expansion, squeeze risk   | `Bollinger Bands`, `Average True Range`, `Z-Score`                                                       |

**Example user prompts**

1. _“Analyze NVDA/QQQ spread for trend, momentum, volatility.”_
2. _“Analyze LLY, GOOG, AMZN, META, MSFT, GLD, QQQ against SPY (`LLY / SPY`, …), rank 0–100.”_

> Prefer **one `ad_hoc` call per pair** (parallel if host allows). Each call gets its own screenshots and cleaner `streamPreview`.

**Multi asset via saved agents:** create one My Agent per spread pair (`customize-agent` `create` with `"LLY / SPY"`), then `technical_analysis` `agent` for each — same scoring logic in `userQuestion`.

---

### 3.4 `bloomberg-oracle-terminal`

**Purpose:** Grounded search for macro / news / policy narrative. Returns Markdown summary — not chart TA.

**When to use**

- Fresh headlines, sector or event context (“why did oil move”, Fed news)
- Catalyst context **before or after** TA (not instead of chart analysis)

**When NOT to use**

- Per-symbol chart analysis → `technical_analysis`
- Ticker lookup → `search_tickers`
- My Agent CRUD → `customize-agent`

**How to call**

```json
{
  "query": "Why did NVDA drop this week? Include earnings, AI sector news, and Fed context."
}
```

| Step | Action                                                                 |
| ---- | ---------------------------------------------------------------------- |
| 1    | Be specific: symbol, dates, region when helpful (`query` 1–2000 chars) |
| 2    | Read `data.summary` (Markdown) from response                           |
| 3    | If user also wants chart levels → follow with `technical_analysis`     |

**Response:** `ok`, `data.summary`, `data.query`. Balance checked per account. No screenshots; host may timeout on slow searches.

**Combined workflow (news + chart):**

1. `bloomberg-oracle-terminal` — “why”
2. `technical_analysis` — “where on the chart”

---

## 4. Parameters and enums

All enum values must match **exactly** (case-sensitive). Invalid values → `invalid_input`.

---

### 4.1 Intervals (`interval`, `mainWindow`, `extraWindows`, `extraWindow`)

```
1 | 5 | 15 | 30 | 60 | 240 | 1D | 1W | 4W
```

**Limits:** `extraWindows` max **8** on ad_hoc; `extraWindow` optional on agent create.

---

### 4.2 `customize-agent` actions

```
create | update | delete | get | list | latest_analysis
```

---

### 4.3 `technical_analysis` actions

```
agent | ad_hoc
```

| Action   | Required fields                        |
| -------- | -------------------------------------- |
| `agent`  | `customizeAgentId`, `userQuestion`     |
| `ad_hoc` | `ticker`, `mainWindow`, `userQuestion` |

**Optional (both modes):** `clientLang`, `selectedVisibilityType`

---

### 4.4 Strategy enum

Use with `customize-agent` `create`/`update` and `technical_analysis` ad_hoc. **28 values** — spelling and hyphenation must match exactly.

**1. `Quantum-Athena`** · Systematic

- User wants a bundled multi-factor scan without picking a manual setup.
- Screening many symbols with TradeOS systematic rules.
- Portfolio-level ranking where a pre-built logic stack is preferred.

**2. `Chiroptera`** · Systematic

- Recurring chart pattern workflows (flags, bases, recurring setups).
- User asks for pattern-based analysis with a fixed TradeOS template.
- Repeatable agent config across similar-looking charts.

**3. `Quantum-Valkyrie`** · Systematic

- Strong, fast momentum markets (crypto rips, parabolic leaders).
- User accepts higher drawdown for aggressive trend capture.
- Breakout continuation after high relative volume.

**4. `Ultimate-Breakout-System`** · Volatility / breakout

- Range compression followed by expansion across a watchlist.
- User asks “what is breaking out today” or systematic breakout scan.
- Volatility expansion after low-ATR consolidation.

**5. `Technical-SEPA`** · Trend / momentum

- US growth stocks in stage-2 uptrend (Minervini / SEPA style).
- Tight base near highs before potential continuation.
- User focuses on leadership names with clean trend structure.

**6. `Trend-Analysis`** · Trend / momentum

- **Default choice** for general TA questions.
- Single-symbol trend, levels, and multi-TF structure.
- Spread vs benchmark (`AAPL / SPY`) for relative strength.
- Multi-symbol ranking vs one benchmark (trend / momentum / vol scoring).

**7. `Smart-Money-Concept`** · SMC / structure

- User mentions order blocks, liquidity, ICT, BOS, CHoCH, FVG.
- Institutional narrative: where stops sit, where price may react.
- `60` / `240` / `1D` structure with precise level framing.

**8. `Liquidity-Sweep`** · SMC / structure

- Sharp wick through prior high/low then reversal.
- “Stop hunt” or sweep-then-reverse explanation.
- Session open / news wick that takes liquidity and fades.

**9. `Pullback-Retracement`** · Pullback / range

- Established uptrend or downtrend; user wants dip-buy or rally-fade entry.
- Pullback to MA, Fib zone, or prior breakout level.
- Trend continuation after first retrace.

**10. `Scalping-EMA`** · Systematic

- Intraday trades on `1` / `5` / `15` intervals.
- Quick in-and-out around EMA dynamic support/resistance.
- User asks for scalp entries, tight stops, session trades.

**11. `Volatility-Breakout`** · Volatility / breakout

- Price exits a range or band with volume/vol expansion.
- Post-earnings or post-news range break.
- User asks whether a breakout is valid vs false break.

**12. `Breakout-Retest`** · Pullback / range

- Level broken, user waits for retest and hold before entry.
- Confirmation-style breakout (not first touch only).
- Failed retest = invalidation scenario.

**13. `Squeeze-Momentum`** · Volatility / breakout

- Bollinger/Keltner squeeze visible; pre-breakout coil.
- User asks “is volatility compressing” or “squeeze about to fire”.
- Pair with `Squeeze Momentum` and `Bollinger Bands` indicators.

**14. `Mean-Reversion`** · Pullback / range

- Range-bound market; fade moves to range mid or opposite band.
- Overextended move vs mean (often with `Z-Score` / RSI).
- Not ideal when ADX high and trend strong.

**15. `Momentum-Swing`** · Trend / momentum

- Hold horizon roughly 2–10 days on `1D` / `1W`.
- Trend intact plus momentum confirmation (MACD/RSI aligned).
- Swing entry after pullback in directional market.

**16. `Trend-Following`** · Trend / momentum

- Clear HH/HL or LH/LL structure; user wants to ride the trend.
- Trailing stop / stay-with-trend bias.
- Avoid in choppy sideways chop.

**17. `Trend-Reversal`** · Trend / momentum

- Climactic volume, exhaustion, potential major top or bottom.
- User asks “is the trend ending” or reversal candidates.
- Higher false signal rate — needs clear exhaustion cues.

**18. `Divergence-Play`** · Trend / momentum

- RSI or MACD divergence vs price (higher high / lower high mismatch).
- Early warning of weakening trend before structure breaks.
- User asks specifically about bullish/bearish divergence.

**19. `Continuation-Pattern`** · Trend / momentum

- Flag, pennant, wedge, or triangle after impulse leg.
- User asks “is this a bull flag” or pause-before-continue setup.
- Entry on pattern break in direction of prior trend.

**20. `Range-Bound`** · Pullback / range

- Horizontal channel with defined support and resistance.
- User trades bounces inside range until breakout.
- Explicit range high/low and midline context.

**21. `Multi-TF-BOS-Alignment`** · SMC / structure

- Break of structure on 2+ timeframes in same direction.
- High-confluence continuation after aligned BOS.
- User wants top-down TF agreement before taking risk.

**22. `SR-Failure-Trap`** · SMC / structure

- False breakout above resistance or below support.
- Fade failed breaks in ranging conditions.
- Trap / stop-run at obvious level then rejection.

**23. `SuperTrend-Ladder-Pullback`** · Systematic

- SuperTrend defines trend direction; entries on pullbacks to ladder levels.
- Mechanical trend-follow with defined add/trim zones.
- User wants rule-based SuperTrend workflow.

**24. `Tri-MA-Slope-Compression-Break`** · Systematic

- Three moving averages compress then slope expands together.
- Early signal of volatility regime shift.
- Pre-breakout MA ribbon compression on `1D` or `240`.

**25. `MACD-Zero-Line-Recycle-Gate`** · Systematic

- MACD above/below zero as momentum regime filter.
- Only long when MACD holds above zero (or inverse for shorts).
- User asks about MACD zero-line recycle or momentum gate.

**26. `RSI-Range-Shift-Continuation`** · Systematic

- RSI shifts into a new bull/bear range (e.g. 40–80 bull zone).
- Momentum persistence after regime shift, not single OB/OS tick.
- Continuation trades in strong momentum names.

**27. `Squeeze-Fakeout-Reversal`** · Volatility / breakout

- Squeeze fires but price fails to follow through.
- Counter-trend or fade after false expansion.
- User suspects bull/bear trap after squeeze break.

**28. `Fractal-Sync-Confluence`** · Trend / momentum

- `4W` / `1W` / `1D` (or similar stack) align same bias.
- Fewer trades, higher confluence requirement.
- User explicitly wants multi-TF agreement before acting.

**Quick picks**

| Scenario                                | Strategy                                    |
| --------------------------------------- | ------------------------------------------- |
| Default / general TA / benchmark spread | `Trend-Analysis`                            |
| Order blocks, liquidity, ICT            | `Smart-Money-Concept`                       |
| Rank many names vs SPY                  | `Trend-Analysis`                            |
| Intraday scalps                         | `Scalping-EMA`                              |
| Squeeze / volatility                    | `Squeeze-Momentum` or `Volatility-Breakout` |
| Established trend ride                  | `Trend-Following`                           |
| Range / fade                            | `Mean-Reversion` or `Range-Bound`           |

---

### 4.5 Indicator enum

English **full names** only — no abbreviations (e.g. not `RSI`, use `Relative Strength Index`). My Agent: **1–20**; ad_hoc: up to **50**. **26 values** — must match exactly.

**1. `Moving Average`** · Trend

- Primary trend direction (price above/below MA).
- Dynamic support/resistance on pullbacks.
- Spread vs benchmark: ratio above/below MA for relative trend.
- Works on all horizons; `1D`/`1W` most common for equities.

**2. `Exponential Moving Average`** · Trend

- Faster reaction than simple MA; intraday and crypto bias.
- Short swing entries when price holds above rising EMA.
- Scalp strategies (`Scalping-EMA`) and reactive trend filter.

**3. `Average Directional Index`** · Trend

- Measures trend **strength**, not direction.
- Filter: prefer trades when ADX > 25; skip low ADX chop.
- Confirm whether `Trend-Following` vs `Range-Bound` fits the chart.

**4. `Bollinger Bands`** · Volatility

- Band width for squeeze vs expansion.
- Mean reversion at outer band in ranges; breakout on band walk in trends.
- Volatility scoring on spread charts (benchmark analysis).

**5. `Volume`** · Volume

- Confirm breakout validity (rising volume on break).
- Spot climactic selling/buying on reversal candidates.
- Basic participation check on any strategy.

**6. `Price Volume Trend`** · Volume

- Cumulative volume-direction flow.
- Divergence: price new high but PVT flat/lower (weak rally).
- Trend health check alongside price structure.

**7. `Relative Volume`** · Volume

- Today vs average volume — unusual activity filter.
- Earnings, FDA, macro news days; opening drive strength.
- Intraday breakout confirmation.

**8. `Moving Average Convergence Divergence`** · Momentum

- Momentum shifts, signal-line crosses, histogram expansion.
- Spread momentum: ratio MACD vs benchmark direction.
- Pair with `Trend-Analysis`, `Momentum-Swing`, `Divergence-Play`.

**9. `Ichimoku Cloud`** · Trend

- Cloud support/resistance and trend bias (above/below cloud).
- `1D` / `1W` position trades and swing holds.
- Multi-component trend filter (tenkan, kijun, cloud).

**10. `KDJ Oscillator`** · Momentum

- Fast stochastic-style signals on short TFs (`5`/`15`/`60`).
- Reactive overbought/oversold in volatile sessions.
- Asian session equities and quick momentum turns.

**11. `Relative Strength Index`** · Momentum

- Overbought (>70) / oversold (<30) context.
- Bullish/bearish divergence vs price.
- Mean-reversion fades or `Divergence-Play` / `RSI-Range-Shift-Continuation`.

**12. `Squeeze Momentum`** · Momentum

- Momentum build after volatility compression.
- Pair with `Bollinger Bands` and `Squeeze-Momentum` strategy.
- Pre-breakout color/signal shift before range expansion.

**13. `Support and Resistance`** · Levels

- Horizontal key levels on any symbol or spread ratio.
- Universal add-on for entries, stops, targets.
- Required for `Breakout-Retest`, `Range-Bound`, `SR-Failure-Trap`.

**14. `High Low Markers`** · SMC

- Mark swing highs and lows for structure mapping.
- Liquidity context for `Liquidity-Sweep` and SMC workflows.
- Define dealing range boundaries.

**15. `Fair Value Gap`** · SMC

- Imbalance / gap zones for SMC entries and fill targets.
- `Smart-Money-Concept` and post-impulse retrace levels.
- Mitigation vs rejection at FVG.

**16. `Fibonacci Retracement`** · Levels

- Pullback depth (38.2%, 50%, 61.8%) in trends.
- `Pullback-Retracement` entry zone selection.
- Confluence with MA or S/R for dip buys.

**17. `Z-Score`** · Volatility

- Statistical distance from mean on spread or single symbol.
- Extreme Z → mean-reversion candidate.
- Pair/spread ranking for stretched relative value.

**18. `Volume Profile Visible Range`** · Volume

- High-volume nodes (HVN) and low-volume gaps (LVN).
- Acceptance above HVN vs rejection = trend confirmation.
- Key institutional price levels for swings.

**19. `Pivot Points`** · Levels

- Session/day pivot, R1/R2, S1/S2 for intraday.
- `30` / `60` / `240` intraday S/R framework.
- Opening range context for day trades.

**20. `Footprint`** · Volume

- Intrabar bid/ask aggression and delta-style read.
- Short TF (`1`/`5`/`15`) order-flow confirmation.
- Validate breakout or absorption at level.

**21. `News and Fundamentals`** · Context

- Earnings, guidance, sector news overlay on chart.
- Catalyst-aware TA when user asks “before/after earnings”.
- Not a substitute for `bloomberg-oracle-terminal` deep news search.

**22. `Volume Weighted Average Price`** · Volume

- Intraday fair value anchor on `60` / `240`.
- Mean reversion to VWAP in balanced sessions.
- Institutional benchmark for day-trade bias (above/below VWAP).

**23. `Break of Structure`** · SMC

- BOS / CHoCH for trend continuation or reversal signal.
- Core SMC indicator with `Smart-Money-Concept`, `Multi-TF-BOS-Alignment`.
- Structure shift confirmation before entry.

**24. `Average True Range`** · Volatility

- Stop placement and position sizing by vol.
- Spread vol scoring in multi-symbol benchmark analysis.
- Regime: rising ATR = expansion; falling ATR = compression.

**25. `Super Trend`** · Trend

- Trailing stop line and trend direction flip.
- `Trend-Following` and `SuperTrend-Ladder-Pullback` strategies.
- Simple stay-in-trend vs exit-on-flip rule.

**26. `Premium & Discount`** · SMC

- Price in upper/lower half of dealing range (premium vs discount).
- SMC bias: long setups in discount, short in premium (with structure).
- Higher-TF filter before taking lower-TF SMC entry.

**Starter packs**

| Goal                                      | Indicators                                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Benchmark spread (trend + momentum + vol) | `Moving Average`, `Moving Average Convergence Divergence`, `Relative Strength Index`, `Bollinger Bands`, `Average True Range`    |
| SMC / liquidity                           | `Break of Structure`, `Fair Value Gap`, `Premium & Discount`, `Support and Resistance`                                           |
| Intraday                                  | `Volume Weighted Average Price`, `Volume`, `Relative Volume`, `Exponential Moving Average`                                       |
| Swing daily                               | `Moving Average`, `Moving Average Convergence Divergence`, `Relative Strength Index`, `Ichimoku Cloud`, `Support and Resistance` |

---

### 4.6 Spread ticker format

| Rule     | Detail                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| Format   | One string: `"<tickerA> / <tickerB>"` (spaces around `/`)                                                   |
| assetA   | Numerator — symbol you analyze or rank                                                                      |
| assetB   | Denominator — benchmark                                                                                     |
| Lookup   | `search_tickers` each leg; use exact codes from `data[]`                                                    |
| Examples | `MSFT / SPY` · `AAPL / C:XAUUSD` · `X:BTCUSD / X:ETHUSD` · `NVDA / QQQ`                                     |
| Pro      | Full spread kept on create/update for Pro; Non-Pro may store assetA only; ad_hoc always accepts full spread |

---

### 4.7 `search_tickers` exchange filter

```
NASDAQ | NYSE | CRYPTO | NYSE Arca | NYSE American
```

---

### 4.8 Optional fields

| Field                          | Enum / limit                            | Used in                                  |
| ------------------------------ | --------------------------------------- | ---------------------------------------- |
| `clientLang`                   | `en` · `fr` · `hk` · `ko` · `zh` · `ja` | `technical_analysis`                     |
| `selectedVisibilityType`       | `public` · `private`                    | `technical_analysis`                     |
| `q`                            | 1–200 chars                             | `search_tickers`                         |
| `limit`                        | 1–50 (default 5)                        | `search_tickers`                         |
| `query`                        | 1–2000 chars                            | `bloomberg-oracle-terminal`              |
| `userQuestion`                 | 1–10000 chars                           | `technical_analysis`                     |
| `customizeAgentId` / `agentId` | 1–64 chars                              | `technical_analysis` / `customize-agent` |

---

## 5. Common errors and wrong use cases

### 5.1 Error signals

| Signal                             | Meaning                                   | Fix                                                   |
| ---------------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| `unauthorized`                     | Bearer auth failed                        | Reconnect MCP OAuth or refresh `TRADEOS_ACCESS_TOKEN` |
| `invalid_input`                    | Bad action, missing field, or wrong enum  | Check §4 enums; verify required fields per action     |
| `search_tickers_failed`            | Search service error                      | Retry; simplify `q`                                   |
| `customize_agent_failed`           | Agent CRUD error                          | Check payload shape; nested vs flat args              |
| `build_agent_body_failed`          | Cannot build TA request from agent config | Verify agent exists via `list` / `get`                |
| `agent_not_found`                  | Unknown `agentId`                         | Use `list` to get valid id                            |
| `no_permission`                    | Agent belongs to another user             | Use caller's own agents only                          |
| `agent_fetch_failed`               | DB read error on latest_analysis          | Retry or use `technical_analysis` for fresh run       |
| `bloomberg_oracle_terminal_failed` | News search error                         | Retry; check balance                                  |
| balance / forbidden                | Insufficient account balance              | User checks TradeOS quota                             |
| rate_limit / service_busy          | Quota or lock (~180s per chatId)          | Wait and retry; avoid parallel overload               |
| 500                                | Server / mcp-call URL issue               | Check endpoint and dev server                         |
| Missing tool in host               | Wrong MCP server connected                | Confirm TradeOS, not another bridge                   |

---

### 5.2 Wrong use cases (do not)

| #      | Wrong                                                                 | Correct                                                                       |
| ------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 5.2.1  | `latest_analysis` when user wants **fresh** chart TA                  | `technical_analysis`                                                          |
| 5.2.2  | `bloomberg-oracle-terminal` for per-symbol K-line / levels            | `technical_analysis`                                                          |
| 5.2.3  | `search_tickers` for news or “why did X move”                         | `bloomberg-oracle-terminal`                                                   |
| 5.2.4  | `technical_analysis` for create/update/delete agent                   | `customize-agent`                                                             |
| 5.2.5  | Invent ticker strings (e.g. `"silver"` instead of `C:XAGUSD`)         | `search_tickers` → exact `ticker`                                             |
| 5.2.6  | Two separate tickers for a spread in one call                         | One string: `"AAPL / SPY"`                                                    |
| 5.2.7  | Pass `userId` in any tool args                                        | Omit — OAuth injects it                                                       |
| 5.2.8  | Pass `title` on agent create                                          | Omit — server generates title                                                 |
| 5.2.9  | Empty `indicators` on agent update                                    | Send non-empty array or omit field                                            |
| 5.2.10 | Wrong strategy spelling (e.g. `Trend Analysis` with space)            | Exact enum: `Trend-Analysis`                                                  |
| 5.2.11 | Abbreviated indicator (e.g. `RSI`, `MACD`)                            | Full name: `Relative Strength Index`, `Moving Average Convergence Divergence` |
| 5.2.12 | One `technical_analysis` call for 8 spread pairs with no synthesis    | One call per pair, then rank in assistant response                            |
| 5.2.13 | `mainWindow` = `1D` but strategy = `Scalping-EMA` without user intent | Match strategy to timeframe (see §3.3)                                        |

---

### 5.3 Response handling notes

| Tool                                | Read this                  | Ignore / note                                                      |
| ----------------------------------- | -------------------------- | ------------------------------------------------------------------ |
| `technical_analysis`                | `streamPreview` (Markdown) | `screenshotHints` are text hints only — no image bytes in MCP JSON |
| `technical_analysis`                | Check `streamTruncated`    | Long runs may timeout; prior retry text dropped from preview       |
| `bloomberg-oracle-terminal`         | `data.summary`             | Single JSON blob — not streaming                                   |
| `customize-agent` `latest_analysis` | Stored report body         | Not a live LLM run                                                 |

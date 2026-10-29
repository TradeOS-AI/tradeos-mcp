---
name: analyze
description: >-
  Use TradeOS MCP for ticker search, historical price and volume candles,
  market snapshots, and chart technical analysis of stocks, crypto, forex, and
  metals, including spread and relative-strength comparisons. Use when the user
  requests these market-data or technical-analysis workflows and TradeOS MCP is
  available.
---

# TradeOS analyze

Use the connected TradeOS tools for market data and technical analysis:

| User wants | Tool |
| --- | --- |
| Find an instrument by name or partial ticker | `search_tickers` |
| Historical prices or trading volume | `get_market_candles` |
| Latest available price, daily change, or market activity | `get_market_snapshot` |
| Chart interpretation, trend, support/resistance, or indicators | `get_market_technical_analysis` |

Resolve ambiguous instruments before requesting data or analysis, and use the exact ticker returned by search.

## 1. Ticker search

Call `search_tickers`:

```json
{ "query": "apple", "limit": 5, "exchange": "NASDAQ" }
```

| Field | Contract |
| --- | --- |
| `query` | Required, 1–200 characters |
| `limit` | Optional integer, 1–50; default 5 |
| `exchange` | Optional: `NASDAQ`, `NYSE`, `CRYPTO`, `NYSE Arca`, `NYSE American` |

Read `data[]` for `ticker`, `name`, `exchange`, and `isMarketOpen`. The response also includes `ok`, `query`, `limit`, `exchange`, and `count`.

Common formats are `AAPL` and `SPY` for stocks/ETFs, `C:EURUSD` and `C:XAUUSD` for FX/metals, and `X:BTCUSD` for crypto. Resolve each leg of a spread separately. Skip search when the user already supplies an unambiguous supported ticker.

## 2. Historical candles

Call `get_market_candles` for OHLCV data:

```json
{ "ticker": "AAPL", "interval": "1D", "limit": 30 }
```

| Field | Contract |
| --- | --- |
| `ticker` | Required single ticker or two-ticker ratio (`AAPL / SPY`) or difference (`AAPL - SPY`) |
| `interval` | Required: `1`, `5`, `15`, `30`, `60`, `240`, `1D`, `1W`, `4W`; also accepts `1m`, `5m`, `15m`, `30m`, `1h`, `4h` |
| `limit` | Optional integer, 1–1000; default 100 |
| `startTime` | Optional inclusive UTC Unix timestamp in **seconds** |
| `endTime` | Optional exclusive UTC Unix timestamp in **seconds**; defaults to now |

`startTime` must precede `endTime` and now. `4W` means four weeks.

Read `candles[]` with `timestamp`, `open`, `high`, `low`, `close`, and `volume`. Candle timestamps use UTC seconds. The response includes `ticker`, `interval`, `status`, `count`, `delaySeconds`, `nextEndTime`, and `creditsCharged`.

For older pages, pass a non-null `nextEndTime` as the next request's `endTime`. Stop when `nextEndTime` is null or the requested period is covered. Treat `status: "no_data"` as no available candles. Report `delaySeconds` when freshness matters.

## 3. Market snapshot

Call `get_market_snapshot` for the latest available price and daily activity:

```json
{ "ticker": "C:XAUUSD" }
```

`ticker` is required. Supply one stock/ETF ticker such as `AAPL`, FX/metal ticker such as `C:XAUUSD`, or crypto ticker such as `X:BTCUSD`.

Read `status`, `market`, `updatedAt`, `fetchedAt`, `creditsCharged`, and `snapshot`. Available snapshot fields include:

- `dailyPriceChange` and `dailyPriceChangePercent`.
- `day`, `minute`, and `previousDay` bars with descriptive fields such as `open`, `high`, `low`, `close`, and `volume`.
- `lastQuote` with `askPrice`, `bidPrice`, and `timestamp`.
- `lastTrade` with `price`, `volume`, and `timestamp`.

Fields may be absent or null. Use the top-level `updatedAt` and `fetchedAt` fields, in UTC Unix seconds, to describe data freshness. State when data is unavailable or stale. `status: "no_data"` and `snapshot: null` mean no snapshot is available.

## 4. Technical analysis

Call `get_market_technical_analysis`:

```json
{
  "ticker": "AAPL",
  "mainWindow": "1D",
  "extraWindows": ["1W", "4W"],
  "strategy": "Trend-Analysis",
  "indicators": [
    "Moving Average",
    "Relative Strength Index",
    "Bollinger Bands"
  ],
  "userQuestion": "Assess the daily trend, key support and resistance, momentum, and invalidation level.",
  "mode": "full"
}
```

| Field | Contract |
| --- | --- |
| `ticker` | Required, 1–64 characters; one instrument or a spread expression |
| `mainWindow` | Required interval: `1`, `5`, `15`, `30`, `60`, `240`, `1D`, `1W`, `4W` |
| `userQuestion` | Required, 1–10000 characters; state the user's analysis question |
| `extraWindows` | Optional array of up to 8 intervals from the same enum |
| `strategy` | Optional exact strategy value from the tool schema |
| `indicators` | Optional array of up to 50 full indicator names from the tool schema |
| `clientLang` | Optional: `en`, `fr`, `hk`, `ko`, `zh`, `ja` |
| `mode` | Optional: `full` for detailed analysis (default), `flash` for shorter analysis |

### Choose the analysis setup

Match the main interval to the user's horizon:

| Horizon | Common intervals | Example strategy |
| --- | --- | --- |
| Short intraday / scalp | `1`, `5`, `15` | `Scalping-EMA` |
| Intraday / swing | `30`, `60`, `240` | `Smart-Money-Concept` |
| Daily / position | `1D`, `1W` | `Trend-Analysis`, `Trend-Following` |
| Longer trend | `1W`, `4W` | `Trend-Analysis` |

Use `Trend-Analysis` for general chart questions when specifying a strategy. Other examples include `Mean-Reversion`, `Range-Bound`, `Squeeze-Momentum`, and `Volatility-Breakout`. Strategy spelling and hyphenation must match the tool schema exactly.

Use the indicator names listed in the tool schema, such as `Relative Strength Index` and `Moving Average Convergence Divergence`. A general setup can use `Moving Average`, `Relative Strength Index`, `Bollinger Bands`, and `Average True Range`. For structure questions, consider `Break of Structure`, `Fair Value Gap`, and `Support and Resistance`. See sections 6 and 7 for strategy and indicator guidance.

Frame `userQuestion` around the requested trend, key levels, momentum, volatility, and higher-timeframe alignment. Include an invalidation level when relevant to the user's question.

### Spreads and relative strength

For a ratio chart, use one ticker string: `"<asset> / <benchmark>"`, such as `"AAPL / SPY"`, `"NVDA / QQQ"`, or `"X:BTCUSD / X:ETHUSD"`.

1. Resolve each asset and the benchmark with `search_tickers` if ambiguous.
2. Make one `get_market_technical_analysis` call per pair.
3. Ask for trend, momentum, and volatility on the ratio chart.
4. Synthesize the returned analyses into a comparison. If the user requests ranking, state the scoring basis; 0 can represent strong short-spread bias and 100 strong long-spread bias.

A ratio rising means the numerator outperforms the denominator; it does not by itself mean the numerator's absolute price is rising. Use `get_market_candles` if the user needs the underlying historical values. `get_market_snapshot` accepts single instruments only.

### Read the result

- `analysis`: the returned written technical analysis.
- `truncated`: whether the analysis is incomplete. Disclose truncation when true.
- `chartAnalysisLink`: a link to the chart analysis; include it when useful.
- `screenshotHints`: text notes about the charts used for analysis.

Keep returned technical findings distinct from any additional synthesis.

## 5. Errors

| Error | Action |
| --- | --- |
| `unauthorized` | Ask the user to reconnect or sign in through TradeOS OAuth |
| `invalid_input` | Check the arguments against the tool's parameter schema |
| `daily_limit_exceeded` | Explain that the account's daily usage limit has been reached |
| `pro_feature_limit_exceeded` | Explain that the daily trial limit for Pro features has been reached |
| `insufficient_balance` | Explain that the account has insufficient credits |
| `tool_failed` | Report the failure; retry only when appropriate to the user's request |

When a request fails or returns `no_data`, explain that the requested data is unavailable.

---

## 6. Strategy reference

Use these strategy names in the `strategy` parameter of `get_market_technical_analysis`.

**1. `Quantum-Athena`** · Systematic

- General market screening.
- Comparing multiple instruments.
- Portfolio-level analysis and ranking.

**2. `Chiroptera`** · Systematic

- Recurring chart pattern workflows (flags, bases, recurring setups).
- User asks for pattern-based analysis.
- Repeatable analysis setup across similar-looking charts.

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

- General TA questions.
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

| Scenario | Strategy |
| --- | --- |
| Default / general TA / benchmark spread | `Trend-Analysis` |
| Order blocks, liquidity, ICT | `Smart-Money-Concept` |
| Rank many names vs SPY | `Trend-Analysis` |
| Intraday scalps | `Scalping-EMA` |
| Squeeze / volatility | `Squeeze-Momentum` or `Volatility-Breakout` |
| Established trend ride | `Trend-Following` |
| Range / fade | `Mean-Reversion` or `Range-Bound` |

---

## 7. Indicator reference

Use these names in the `indicators` parameter. The tool schema lists all supported values and accepts up to 50 indicators.

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
- Useful for `Breakout-Retest`, `Range-Bound`, and `SR-Failure-Trap`.

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

**20. `News and Fundamentals`** · Context

- Earnings, guidance, sector news overlay on chart.
- Catalyst-aware TA when user asks “before/after earnings”.
- Use for chart context.

**21. `Volume Weighted Average Price`** · Volume

- Intraday fair value anchor on `60` / `240`.
- Mean reversion to VWAP in balanced sessions.
- Institutional benchmark for day-trade bias (above/below VWAP).

**22. `Break of Structure`** · SMC

- BOS / CHoCH for trend continuation or reversal signal.
- Core SMC indicator with `Smart-Money-Concept`, `Multi-TF-BOS-Alignment`.
- Structure shift confirmation before entry.

**23. `Average True Range`** · Volatility

- Stop placement and position sizing by vol.
- Spread vol scoring in multi-symbol benchmark analysis.
- Regime: rising ATR = expansion; falling ATR = compression.

**24. `Super Trend`** · Trend

- Trailing stop line and trend direction flip.
- `Trend-Following` and `SuperTrend-Ladder-Pullback` strategies.
- Simple stay-in-trend vs exit-on-flip rule.

**25. `Premium & Discount`** · SMC

- Price in upper/lower half of dealing range (premium vs discount).
- SMC bias: long setups in discount, short in premium (with structure).
- Higher-TF filter before taking lower-TF SMC entry.

**Starter packs**

| Goal | Indicators |
| --- | --- |
| Benchmark spread (trend + momentum + vol) | `Moving Average`, `Moving Average Convergence Divergence`, `Relative Strength Index`, `Bollinger Bands`, `Average True Range` |
| SMC / liquidity | `Break of Structure`, `Fair Value Gap`, `Premium & Discount`, `Support and Resistance` |
| Intraday | `Volume Weighted Average Price`, `Volume`, `Relative Volume`, `Exponential Moving Average` |
| Swing daily | `Moving Average`, `Moving Average Convergence Divergence`, `Relative Strength Index`, `Ichimoku Cloud`, `Support and Resistance` |

---

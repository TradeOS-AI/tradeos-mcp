# TradeOS ChatGPT plugin

TradeOS connects ChatGPT to market data and technical analysis for XAUUSD, stocks, crypto, and forex. Search tickers, retrieve historical candles and market snapshots, and request multi-timeframe technical analysis, including spread and relative-strength comparisons.

This repository follows the [OpenAI plugin packaging guide](https://developers.openai.com/plugins/build/plugins).

## Package layout

```text
tradeos-mcp/
├── plugin.json                 # Portable plugin manifest and ChatGPT listing metadata
├── mcp.json                    # Remote Streamable HTTP MCP connection
├── skills/
│   └── analyze/
│       └── SKILL.md            # TradeOS analysis workflows
├── assets/
│   └── logo.png                # Listing and composer icon
├── LICENSE
└── README.md
```

The root `plugin.json` uses the Agent Plugins schema. ChatGPT discovers the `analyze` skill from `skills/` and the remote TradeOS server from `mcp.json`. Listing text, starter prompts, legal links, and icon paths are under `extensions.com.openai.interface`.

## Connect in ChatGPT

1. Open **ChatGPT Plugins** and choose **Add custom MCP server**.
2. Enter `https://ai.tradeos.xyz/api/agent/mcp/mcp-call?subset=mini` and complete the TradeOS OAuth connection.
3. Use the `analyze` skill for ticker search, historical candles, market snapshots, and technical analysis.

This package provides the following tools:

| Tool | Purpose |
| --- | --- |
| `search_tickers` | Find instruments by name or ticker |
| `get_market_candles` | Retrieve historical OHLCV candles |
| `get_market_snapshot` | Retrieve the latest available price and daily market activity |
| `get_market_technical_analysis` | Analyze chart trends, key levels, and indicators |

## Create the ZIP

From the repository root, run:

```bash
zip -r -X tradeos-chatgpt-plugin.zip plugin.json mcp.json skills assets LICENSE README.md
```

The archive has `plugin.json` and `mcp.json` at its root.

For a public directory submission, use the **With MCP** path and upload this ZIP. The [OpenAI submission guide](https://developers.openai.com/plugins/deploy/submission) covers the dashboard, server review, and publication steps.

## TradeOS resources

- [TradeOS MCP product page](https://www.tradeos.xyz/mcp)
- [TradeOS FAQ](https://www.tradeos.xyz/faq)
- [Privacy policy](https://ai.tradeos.xyz/privacy-policy)
- [Terms of service](https://ai.tradeos.xyz/terms-of-service)

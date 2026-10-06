# TradeOS ChatGPT plugin

TradeOS connects ChatGPT to agentic technical analysis for XAUUSD, stocks, crypto, and forex. Search tickers, compare spreads, review macro and news context, and create no-code TradeOS agents that can monitor market conditions for 24/7 smart alerts.

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
2. Enter `https://ai.tradeos.xyz/api/agent/mcp/mcp-call` and complete the TradeOS OAuth connection.
3. Use the `analyze` skill for ticker search, multi-timeframe technical analysis, spread comparison, macro/news context, and custom agent workflows.

The repository contains no access token. The remote MCP server handles authentication.

## Create the ZIP

From the repository root, run:

```bash
zip -r -X tradeos-chatgpt-plugin.zip plugin.json mcp.json skills assets LICENSE README.md
```

The archive has `plugin.json` and `mcp.json` at its root and excludes local Git files and the unused `.example.env`.

For a public directory submission, use the **With MCP** path and upload this ZIP. The [OpenAI submission guide](https://developers.openai.com/plugins/deploy/submission) covers the dashboard, server review, and publication steps. Creating the ZIP does not publish the plugin.

## TradeOS resources

- [TradeOS MCP product page](https://www.tradeos.xyz/mcp)
- [TradeOS FAQ](https://www.tradeos.xyz/faq)
- [Privacy policy](https://ai.tradeos.xyz/privacy-policy)
- [Terms of service](https://ai.tradeos.xyz/terms-of-service)

# Zhipu Web Search Plugin

A web search provider plugin for OpenClaw using [Zhipu AI (BigModel) Web Search API](https://open.bigmodel.cn/dev/api/search/web-search-pro).

## Prerequisites

- A Zhipu AI API key ([get one here](https://open.bigmodel.cn))
- OpenClaw with the [extensible web search provider](https://github.com/openclaw/openclaw/pull/10435) feature

## Setup

1. Set `tools.web.search.provider: "zhipu"` in your OpenClaw config
2. Provide your API key via one of:
   - Config: `plugins.entries.zhipu-web-search.apiKey: "your-key"`
   - Environment: `ZHIPU_API_KEY=your-key`

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `apiKey` | string | — | Zhipu API key (fallback: `ZHIPU_API_KEY` env) |
| `engine` | string | `search_std` | Search engine: `search_std`, `search_pro`, `search_pro_sogou`, `search_pro_quark` |
| `contentSize` | string | `concise` | Result content size: `concise`, `standard`, `full` |

## Search Engines

| Engine | Description |
|--------|-------------|
| `search_std` | Standard search (default) |
| `search_pro` | Enhanced search with better relevance |
| `search_pro_sogou` | Sogou-backed search |
| `search_pro_quark` | Quark-backed search |

## Example Config

```json5
{
  tools: {
    web: {
      search: {
        provider: "zhipu",
        enabled: true,
      },
    },
  },
  plugins: {
    entries: {
      "zhipu-web-search": {
        apiKey: "your-zhipu-api-key",
        engine: "search_pro",
        contentSize: "standard",
      },
    },
  },
}
```

## How It Works

When `tools.web.search.provider` is set to `"zhipu"` (or any non-built-in value), OpenClaw's core `web_search` tool steps aside, allowing this plugin to register its own `web_search` tool that delegates to Zhipu's API.

The tool supports the same parameters as the core `web_search` (query, count, freshness) for a seamless agent experience.

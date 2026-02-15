---
name: yoyo-web-search
description: "Search the web using Tavily API. Useful for research, finding documentation, current events, and answering questions that require up-to-date information."
metadata:
  {
    "openclaw":
      {
        "emoji": "🔍",
        "requires": {},
        "env": ["TAVILY_API_KEY"],
      },
  }
---

# Web Search (Tavily)

Search the web for current information.

## Setup

Get a Tavily API key from https://tavily.com and set it:

```bash
yoyo-ai config set plugins.tavily.apiKey "tvly-..."
```

Or set the environment variable: `TAVILY_API_KEY`

## Usage

When the user asks about current events, recent releases, documentation,
or anything requiring up-to-date information:

1. Use `system.run` to call the Tavily API:

```bash
curl -s "https://api.tavily.com/search" \
  -H "Content-Type: application/json" \
  -d '{"api_key":"$TAVILY_API_KEY","query":"<search query>","max_results":5}'
```

2. Parse the JSON response and present results clearly
3. Include source URLs for attribution

## Guidelines

- Formulate specific, targeted search queries
- Verify information from multiple results when possible
- Clearly distinguish search results from your own knowledge
- Respect rate limits (1000 free searches/month)

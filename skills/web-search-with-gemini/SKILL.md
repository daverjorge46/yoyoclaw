---
name: web-search-with-gemini
description: 🔴 DEPRECATED - Use built-in web_search tool instead. Perform deep research queries using Gemini with multi-perspective reasoning, answering in Russian.
metadata: {"clawdis":{"emoji":"🔍","requires":{"bins":["web_search_with_gemini"]},"install":[{"id":"manual","kind":"manual","instructions":"Script at scripts/web_search_with_gemini.sh"}]}}
---

# web-search-with-gemini [DEPRECATED]

**NOTE: This skill is deprecated. Use the built-in `web_search` tool instead.**

The `web_search` tool is now automatically available in Pi agent and provides better integration with visual markers.

## Built-in Web Search Tool

The Pi agent now includes a native `web_search` tool that:
- Automatically searches the web when user asks about current information
- Returns results with clear visual markers (🌐 Результат поиска:)
- Works with Gemini backend for Russian-language results
- No external dependencies required

## Usage

Simply ask the agent to search:
```
User: google 2666 for me
Agent: [automatically uses web_search tool]
→ 🌐 Результат поиска: [search results]
```

## Legacy Usage (Deprecated)

If you still need the advanced ultrathink functionality:
- **Basic**: `web_search_with_gemini "Who won the World Cup in 2022?"`
- **Specific Model**: `web_search_with_gemini --model gemini-2.0-flash "Latest AI trends"`
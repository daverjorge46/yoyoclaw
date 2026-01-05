# Web Search with Gemini Skill

This document describes the `web-search` skill, a lightweight and efficient research tool integrated into the Clawdis project.

## Overview

The `web-search` skill provides a rapid way to perform "Deep Research" using the standard Gemini CLI. Unlike the `/deep` slash command which uses an autonomous agentic API, `web-search` uses prompt engineering and standard tool-calling to produce high-quality, multi-perspective summaries.

## Key Components

1.  **Wrapper Script**: `scripts/web_search_with_gemini.sh`
    - Handles argument parsing (model, output format).
    - Injects the specialized reasoning tail from an external prompt file.
    - Executes the `gemini` CLI with the combined prompt.

2.  **Externalized Prompt**: `prompts/web-search-tail.yaml`
    - Contains the **Ultrathink** reasoning logic.
    - Enforces strict Russian language output with emojis.
    - Sets `thinking_level: 'high'` for maximum depth.

3.  **Skill Registry**: `skills/web-search-with-gemini/SKILL.md`
    - Documents the skill for the system.
    - Defines metadata like emojis and installation requirements.

4.  **Integration**: `package.json`
    - Adds `pnpm web-search` as a convenient entry point.

## Architecture

The skill follows a synchronous request-response flow:

```mermaid
graph LR
    A[User Query] --> B[web_search_with_gemini.sh]
    B --> C[Load YAML Prompt]
    C --> D[gemini CLI]
    D --> E[gemini-3-flash-preview]
    E --> F[Web Search Tool]
    F --> G[Multi-perspective Synthesis]
    G --> H[Russian JSON/Text Output]
```

## Usage

You can run the skill directly via `pnpm`:

```bash
pnpm web-search "What is the future of nuclear fusion?"
```

### Options
- `--model <id>`: Use a different Gemini model (default: `gemini-3-flash-preview`).
- `--output-format <format>`: Set output to `json`, `text`, etc. (default: `json`).

## Comparison with `/deep` (Slash Command)

| Feature | `web-search` (Skill) | `/deep` (Slash Command) |
| :--- | :--- | :--- |
| **Model** | `gemini-3-flash-preview` | `deep-research-pro-preview-12-2025` |
| **API** | Standard Tool Calling | Agentic "Interactions" API |
| **Speed** | 15-45 seconds | 5-20 minutes |
| **Use Case** | Quick, high-quality summaries | Exhaustive, autonomous reports |

For a detailed technical comparison, see the [Pipeline Comparison Page](http://212.28.182.235:8080/deep-vs-web-pipeline-comparison/comparison.html).

## Maintenance

To update the reasoning logic or change the output persona, modify `prompts/web-search-tail.yaml`. This ensures that the prompt logic is kept separate from the execution script.

---
name: gemini
description: Gemini CLI for one-shot Q&A, summaries, and generation.
homepage: https://ai.google.dev/
metadata:
  {
    "openclaw":
      {
        "emoji": "♊️",
        "requires": { "bins": ["gemini"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "gemini-cli",
              "bins": ["gemini"],
              "label": "Install Gemini CLI (brew)",
            },
          ],
      },
  }
---

# Gemini CLI

Use Gemini in one-shot mode with a positional prompt (avoid interactive mode).

## Quick start

- `gemini "Answer this question..."`
- `gemini --model <name> "Prompt..."`
- `gemini --output-format json "Return JSON"`

## Authentication (First Run)

If the tool returns an auth error, run `gemini` interactively to log in.

1. Run `gemini`.
2. Select **Login with Google**.
3. It will display a URL. **Send this URL to the user.**
4. If it requests a code, ask the user for it and enter it into the CLI.
5. Credentials will be cached for future use.

*Note: Use the Google account associated with any AI Pro/Ultra subscriptions.*

## Extensions

- List: `gemini --list-extensions`
- Manage: `gemini extensions <command>`

## Notes

- Avoid `--yolo` for safety.
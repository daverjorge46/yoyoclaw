# Investigations

This directory contains time-bound technical investigations with specific findings and resolutions.

## Organization

Files are named with the pattern: `{topic}-{type}-YYYY-MM-DD.md`

- **topic**: Brief descriptor of what was investigated
- **type**: `detailed` (full TDD/process) or `summary` (executive overview)
- **date**: When the investigation was completed

## Existing Investigations

- **deep-research-publish-fix-2025-01-03.md** - Investigation of publish_to_web regex errors and fallback implementation
- **linux-sdk-auth-detailed-2025-12-30.md** - TDD investigation of Linux SDK authentication flow
- **linux-sdk-auth-summary-2025-12-30.md** - Executive summary of Linux auth investigation results
- **telegram-bot-fix-2025-12-30.md** - Investigation of Telegram bot reliability issues

## When to Add New Investigations

Create a new investigation file when:
- Debugging complex production issues
- Conducting root cause analysis
- Documenting failure scenarios and resolutions
- Performing technical due diligence

See [AGENTS.md](/AGENTS.md) for investigation methodologies and tools.
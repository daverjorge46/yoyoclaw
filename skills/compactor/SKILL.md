# Compactor Skill

Provides intelligent conversation summarization capabilities using Gemini Flash.

## Commands

### `compact <session_transcript>`

Reads the provided conversation transcript and produces a concise Markdown summary.

**Logic:**
- **Input**: Raw conversation text or file path.
- **Processing**: Uses Gemini Flash to summarize.
- **Filtering**:
  - Keeps: User decisions, key information, final outcomes.
  - Removes: Chit-chat, intermediate thinking, failed attempts.
- **Output**: Markdown summary.

## Usage

```bash
# Pipe input
cat conversation.log | skills/compactor/bin/compact

# Or pass as argument
skills/compactor/bin/compact conversation.log
```

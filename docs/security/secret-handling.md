# Secret Detection & Redaction

Moltbot includes built-in secret detection to protect API keys, tokens, and other sensitive credentials from being accidentally sent to AI models.

## Overview

The secret detection system:
- **Detects** high-entropy strings and known secret patterns in messages
- **Prompts** users interactively to choose how to handle detected secrets
- **Redacts** secrets based on user choice or configured defaults
- **Prevents** secrets from reaching the AI model's conversation history

## How It Works

### 1. Detection Phase

When you send a message, Moltbot automatically scans for:

- **Known patterns**: OpenAI API keys, GitHub tokens, AWS keys, JWT tokens, private keys, etc.
- **High-entropy strings**: Random-looking sequences likely to be secrets (using Shannon entropy analysis)
- **Custom patterns**: Additional regex patterns you configure

### 2. Interactive Prompt (Default Behavior)

If secrets are detected, you'll receive a security alert:

```
🔒 Security Alert

Your message contains what appears to be 1 secret or API key:

• sk-proj-Ab12...Yz56 (OpenAI API key)

Options:
1️⃣ Redact - Replace with [REDACTED] before processing
2️⃣ Cancel - Don't process this message
3️⃣ Continue anyway ⚠️  - Send to AI as-is (not recommended)

Reply with 1, 2, or 3 (timeout in 15s)
```

**Simply reply with your choice** (1-3) and Moltbot will apply the selected action.

### 3. Actions

#### 1. Redact (Recommended)
- Replaces the secret with `[REDACTED]` in your message
- The AI sees `[REDACTED]` instead of the secret value
- Protects against accidental exposure in conversation history

#### 2. Cancel
- Blocks the message from being processed
- Nothing is sent to the AI
- Useful if you sent the message by mistake

#### 3. Continue Anyway
- Sends the message to the AI as-is, including the secret
- **Not recommended** - secrets may be stored in conversation history and logs
- Only use if you're certain the string is not actually a secret

### 4. Timeout Behavior

If you don't respond within **15 seconds** (configurable), the system applies the **default action** (redact by default).

## Configuration

### Enable/Disable Detection

```json5
{
  "security": {
    "secrets": {
      "detection": {
        "enabled": true  // Default: true
      }
    }
  }
}
```

### Interactive vs. Automatic Mode

```json5
{
  "security": {
    "secrets": {
      "handling": {
        "interactive": true,  // Default: true (prompt user)
        "defaultAction": "redact",  // Default: "redact" (options: redact, block, allow)
        "confirmationTimeoutMs": 15000  // Default: 15 seconds
      }
    }
  }
}
```

**Non-interactive mode**: Set `interactive: false` to automatically apply `defaultAction` without prompting.

### Detection Thresholds

```json5
{
  "security": {
    "secrets": {
      "detection": {
        "minEntropyThreshold": 4.5,  // Default: 4.5 (Shannon entropy)
        "minLength": 24,  // Default: 24 characters
        "customPatterns": [
          // Additional regex patterns to detect
          "MYAPP-[A-Za-z0-9]{32}"
        ]
      }
    }
  }
}
```

## Detected Patterns

Moltbot recognizes these secret types:

### API Keys & Tokens
- **OpenAI**: `sk-proj-...` (48+ chars), `sk-...` (48 chars legacy)
- **Anthropic**: `sk-ant-...` (95+ chars)
- **Google**: `AIza...` (39 chars)
- **GitHub**: `ghp_...`, `gho_...`, `ghs_...`, `ghr_...` (36 chars)
- **AWS**: `AKIA...` (20 chars), `aws_secret_access_key=...`
- **Slack**: `xox[baprs]-...`
- **Stripe**: `sk_live_...`, `rk_live_...`
- **Twilio**: `SK[0-9a-fA-F]{32}`
- **SendGrid**: `SG....`
- **Mailgun**: `key-...`

### Other Formats
- **Bearer tokens**: `Bearer ...`
- **JWT tokens**: `eyJ...eyJ....` (3-part base64)
- **Private keys**: `-----BEGIN ... PRIVATE KEY-----`

### Generic Patterns
- `api_key = "..."`
- `secret: "..."`
- `token = "..."`

## Security Logging

Security events are logged to the `security:events` subsystem:

- `high_entropy_detected` - When secrets are found
- `secret_redacted` - When a secret is redacted
- `secret_allowed_by_user` - When user chooses "continue anyway"
- `interactive_prompt_timeout` - When user doesn't respond in time
- `interactive_prompt_cancelled` - When user chooses "cancel"

View security logs:
```bash
moltbot logs --subsystem security:events
```

## Examples

### Example 1: Auto-Redact

**You send:**
```
Can you help me debug this API call? I'm using key sk-proj-Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78St90Uv12Wx34Yz56
```

**Moltbot responds:**
```
🔒 Security Alert
Your message contains what appears to be 1 secret or API key:
• sk-proj-Ab12...Yz56 (OpenAI API key)

Options: (reply with 1, 2, or 3)
1️⃣ Redact
2️⃣ Cancel
3️⃣ Continue anyway ⚠️
```

**You reply:**
```
1
```

**Moltbot applies action:**
```
✓ Applying action: redact
```

**AI receives:**
```
Can you help me debug this API call? I'm using key [REDACTED]
```

### Example 2: Auto-Redact (Non-Interactive Mode)

**Config:**
```json5
{
  "security": {
    "secrets": {
      "handling": {
        "interactive": false,
        "defaultAction": "redact"
      }
    }
  }
}
```

**You send:**
```
My GitHub token is ghp_Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op5678Qr
```

**AI receives immediately:**
```
My GitHub token is [REDACTED]
```

## Opting Out

To completely disable secret detection:

```json5
{
  "security": {
    "secrets": {
      "detection": {
        "enabled": false
      }
    }
  }
}
```

**Warning**: Disabling detection means secrets may be sent to AI models and stored in conversation history.

## Future Enhancements

**Phase 4 (Planned):**
- **Secure storage**: Store detected secrets in OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- **Secret retrieval**: CLI commands to list/retrieve stored secrets
- **Gitleaks integration**: Optional backend for enhanced detection using [Gitleaks](https://gitleaks.io/)

## Related

- [Configuration Guide](/configuration)
- [Security Audit](/security/audit)

# Ralph Config

View or modify Ralph autonomous execution configuration.

## Usage

```bash
/ralph-config                    # View current config
/ralph-config rate_limit 50      # Set rate limit to 50
/ralph-config timeout 60         # Set timeout to 60 minutes
/ralph-config reset              # Reset to defaults
```

## Description

Manage Ralph configuration for autonomous development:

- **rate_limit**: API calls per hour (default: 100)
- **timeout**: Minutes per loop (default: 30)
- **circuit_breaker.stall_threshold**: Loops without progress before stop (default: 3)
- **circuit_breaker.error_threshold**: Error loops before stop (default: 5)
- **exit_detection.test_only_loops**: Test-only loops before exit (default: 3)
- **monitoring.tmux_enabled**: Enable tmux dashboard (default: true)

## Configuration File

Settings stored in `.yoyo-dev/config.yml`:

```yaml
ralph:
  enabled: true
  rate_limit: 100
  timeout: 30
  circuit_breaker:
    stall_threshold: 3
    error_threshold: 5
  exit_detection:
    test_only_loops: 3
    done_signals: 2
  monitoring:
    tmux_enabled: true
    log_retention: 7
```

## Output Format

```
╭──────────────────────────────────────────────────────────────────╮
│                   RALPH CONFIGURATION                             │
╰──────────────────────────────────────────────────────────────────╯

  Rate Limiting:
    rate_limit:         100 calls/hour
    timeout:            30 minutes/loop

  Circuit Breaker:
    stall_threshold:    3 loops
    error_threshold:    5 loops

  Exit Detection:
    test_only_loops:    3
    done_signals:       2

  Monitoring:
    tmux_enabled:       true
    log_retention:      7 days

  Config file: .yoyo-dev/config.yml
```

## Related Commands

- `/ralph-status` - Check current Ralph status
- `/ralph-stop` - Stop Ralph execution

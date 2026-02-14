# Spec: config-health-monitor

## Background

Cron jobs (e.g., `morning-todo-brief`) fail at runtime when required environment variables or credentials are missing.
We need a proactive check to verify the "health" of the configuration before these jobs run, or as a periodic diagnostic.

## Goals

- Create a lightweight script to validate required configuration.
- Support checking:
  - Environment variables (presence, format).
  - File existence (credentials).
  - Connectivity (optional, via curl/ping).
- Fail fast with clear error messages.

## Design

- Script: `scripts/check_config_health.py`
- Config definition: `config/health_checks.json` (mapping features to requirements).
  ```json
  {
    "morning-brief": {
      "env": ["TICKTICK_CLIENT_ID", "TICKTICK_CLIENT_SECRET"],
      "files": ["/home/node/.credentials/gmail.json"]
    }
  }
  ```

## Verification Queue

- [x] VQ-001: Script correctly identifies missing ENV vars.
- [x] VQ-002: Script correctly identifies missing files.
- [x] VQ-003: Script passes when all requirements are met.

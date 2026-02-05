# PR: Cron Job Hooks System

## Summary

Add a hooks system to cron jobs that allows executing custom logic before and after trigger execution. This enables advanced use cases like forced reminders, escalation policies, and conditional notifications.

## Motivation

Currently, cron jobs are fire-and-forget. Users need more control:

1. **Forced Reminders**: Retry until user acknowledges
2. **Escalation**: If no response, notify a secondary contact
3. **Conditional Execution**: Only run if certain conditions are met
4. **Pre/Post Processing**: Transform data, send notifications, call external APIs

## Design

### Job Schema Extension

```typescript
interface CronJob {
  id: string;
  name?: string;
  schedule: Schedule;
  payload: Payload;
  sessionTarget: "main" | "isolated";

  // NEW: Hooks configuration
  hooks?: {
    // Run before the main payload
    pre?: HookConfig[];

    // Run after successful execution
    post?: HookConfig[];

    // Run on error
    onError?: HookConfig[];

    // Run to determine if job should repeat
    shouldRepeat?: HookConfig;
  };

  // Existing fields...
  enabled?: boolean;
  deleteAfterRun?: boolean;
}

type HookConfig =
  | { kind: "agentTurn"; message: string; model?: string }
  | { kind: "systemEvent"; text: string }
  | { kind: "shell"; command: string; args?: string[] }
  | { kind: "webhook"; url: string; method?: string; body?: unknown };
```

# PR: Cron Job Hooks System

## Summary

Add a hooks system to cron jobs that allows executing custom logic before and after trigger execution. This enables advanced use cases like forced reminders, escalation policies, and conditional notifications.

## Motivation

Currently, cron jobs are fire-and-forget. Users need more control:

1. **Forced Reminders**: Retry until user acknowledges
2. **Escalation**: If no response, notify a secondary contact
3. **Conditional Execution**: Only run if certain conditions are met
4. **Pre/Post Processing**: Transform data, send notifications, call external APIs

## Design

### Job Schema Extension

```typescript
interface CronJob {
  id: string;
  name?: string;
  schedule: Schedule;
  payload: Payload;
  sessionTarget: "main" | "isolated";

  // NEW: Hooks configuration
  hooks?: {
    // Run before the main payload
    pre?: HookConfig[];

    // Run after successful execution
    post?: HookConfig[];

    // Run on error
    onError?: HookConfig[];

    // Run to determine if job should repeat
    shouldRepeat?: HookConfig;
  };

  // Existing fields...
  enabled?: boolean;
  deleteAfterRun?: boolean;
}

type HookConfig =
  | { kind: "agentTurn"; message: string; model?: string }
  | { kind: "systemEvent"; text: string }
  | { kind: "shell"; command: string; args?: string[]; env?: Record<string, string> }
  | { kind: "webhook"; url: string; method?: string; headers?: Record<string, string>; body?: unknown };

// Shell hook environment variables (provided automatically)
interface ShellEnv {
  JOB_ID: string;           // Cron job ID
  JOB_NAME: string;         // Cron job name
  TRIGGER_TIME: string;     // ISO timestamp of trigger
  PAYLOAD_KIND: string;     // Main payload kind
  SESSION_TARGET: string;   // "main" or "isolated"
  RETRY_COUNT: number;      // Current retry attempt (0 for first run)
}
```

---

## Use Case Examples

### Example 1: Forced Reminder (强制提醒)

**需求**：到时间发送提醒 → 等待5分钟 → 如果用户未回复（消息中包含"收到"/"确认"）→ 再次发送 → 重复直到回复或达到最大重试次数

**配置文件** (`~/.openclaw/cron/reminders/meeting-reminder.json`):

```json
{
  "id": "meeting-reminder-001",
  "name": "9点会议提醒",
  "schedule": {
    "kind": "at",
    "atMs": 1738828800000
  },
  "payload": {
    "kind": "agentTurn",
    "message": "⏰ **会议提醒** - 9点会议将在30分钟后开始\n\n请回复「收到」确认",
    "deliver": true,
    "channel": "telegram",
    "to": "5723990716"
  },
  "hooks": {
    "post": [
      {
        "kind": "shell",
        "command": "check_and_retry.sh",
        "args": ["${JOB_ID}", "${RETRY_COUNT}"],
        "env": {
          "WAIT_SECONDS": "300",
          "MAX_RETRIES": "3",
          "ACK_KEYWORDS": "收到,确认,ok,好"
        }
      }
    ]
  },
  "sessionTarget": "isolated",
  "enabled": true,
  "deleteAfterRun": false
}
```

**配套脚本** (`~/.openclaw/scripts/check_and_retry.sh`):

```bash
#!/bin/bash
# check_and_retry.sh - 检查用户是否回复，未回复则重试

set -e

JOB_ID="$1"
RETRY_COUNT="${2:-0}"
WAIT_SECONDS="${WAIT_SECONDS:-300}"
MAX_RETRIES="${MAX_RETRIES:-3}"
ACK_KEYWORDS="${ACK_KEYWORDS:-收到,确认,ok,好}"

echo "[ForcedReminder] Job: $JOB_ID, Retry: $RETRY_COUNT, Wait: ${WAIT_SECONDS}s"

# 等待用户回复
sleep "$WAIT_SECONDS"

# 检查主会话历史中是否有确认回复
echo "[ForcedReminder] Checking for user acknowledgment..."

HISTORY=$(openclaw sessions history --sessionKey main --limit 20 2>/dev/null || echo "")

if echo "$HISTORY" | grep -qiE "$ACK_KEYWORDS"; then
  echo "[ForcedReminder] ✅ User acknowledged. Stopping retries."
  exit 0
fi

# 用户未回复，检查是否达到最大重试次数
NEXT_RETRY=$((RETRY_COUNT + 1))

if [ "$NEXT_RETRY" -ge "$MAX_RETRIES" ]; then
  echo "[ForcedReminder] ⚠️ Max retries ($MAX_RETRIES) reached. Sending final notice."

  # 发送最终通知
  openclaw message send \
    --to 5723990716 \
    --channel telegram \
    --message "⚠️ **重要** - 多次提醒未得到回复，请检查是否需要处理：\n\n会议/任务待确认"

  exit 0
fi

# 触发重试：重新运行当前 cron job
echo "[ForcedReminder] 🔄 No acknowledgment. Triggering retry $NEXT_RETRY..."

# 使用更新后的重试计数创建新任务
NEXT_TRIGGER=$(date -d "+${WAIT_SECONDS} seconds" +%s)000

cat <<EOF | openclaw cron add --stdin
{
  "name": "9点会议提醒-重试$NEXT_RETRY",
  "schedule": { "kind": "at", "atMs": $NEXT_TRIGGER },
  "payload": {
    "kind": "agentTurn",
    "message": "⏰ **第 $NEXT_RETRY/$MAX_RETRIES 次提醒** - 9点会议即将开始！\n\n请立即回复「收到」确认",
    "deliver": true,
    "channel": "telegram",
    "to": "5723990716"
  },
  "hooks": {
    "post": [
      {
        "kind": "shell",
        "command": "check_and_retry.sh",
        "args": ["\${JOB_ID}", "$NEXT_RETRY"],
        "env": {
          "WAIT_SECONDS": "$WAIT_SECONDS",
          "MAX_RETRIES": "$MAX_RETRIES",
          "ACK_KEYWORDS": "$ACK_KEYWORDS"
        }
      }
    ]
  },
  "sessionTarget": "isolated",
  "deleteAfterRun": true
}
EOF

echo "[ForcedReminder] ✅ Retry $NEXT_RETRY scheduled"
```

**使用方式**:

```bash
# 创建脚本
chmod +x ~/.openclaw/scripts/check_and_retry.sh

# 设置首次提醒
openclaw cron add --file ~/.openclaw/cron/reminders/meeting-reminder.json

# 查看任务
openclaw cron list

# 手动测试
openclaw cron run --jobId <job-id>
```

**执行流程**:

```
09:00 → 发送会议提醒
09:05 → 检查回复 → 无回复 → 发送第1次重试提醒
09:10 → 检查回复 → 无回复 → 发送第2次重试提醒
09:15 → 检查回复 → 无回复 → 发送第3次重试提醒
09:20 → 检查回复 → 无回复 → 发送最终通知，停止
```

---

### Example 2: Conditional Execution - Weather-Based Reminder (条件执行 - 天气提醒)

**需求**：每天早上7点检查天气 → 如果下雨才发送"带伞提醒" → 否则不发送

**配置文件** (`~/.openclaw/cron/reminders/weather-reminder.json`):

```json
{
  "id": "weather-reminder-001",
  "name": "天气提醒",
  "schedule": {
    "kind": "cron",
    "expr": "0 7 * * *",
    "tz": "Asia/Singapore"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "🌧️ **今日天气提醒**\n\n今天有雨，请记得带伞！",
    "deliver": true,
    "channel": "telegram",
    "to": "5723990716"
  },
  "hooks": {
    "pre": [
      {
        "kind": "shell",
        "command": "check_rain.sh",
        "args": ["Singapore"],
        "env": {
          "THRESHOLD": "0.5",
          "LANG": "zh"
        }
      }
    ]
  },
  "sessionTarget": "isolated",
  "enabled": true,
  "deleteAfterRun": false
}
```

**配套脚本** (`~/.openclaw/scripts/check_rain.sh`):

```bash
#!/bin/bash
# check_rain.sh - 检查是否下雨，返回非零则跳过执行

set -e

CITY="${1:-Singapore}"
THRESHOLD="${THRESHOLD:-0.5}"  # 降雨概率阈值
LANG="${LANG:-en}"

echo "[WeatherCheck] Checking weather for: $CITY, threshold: $THRESHOLD"

# 使用 Open-Meteo API 获取天气预报（免费，无需 API Key）
WEATHER_URL="https://api.open-meteo.com/v1/forecast?latitude=1.3521&longitude=103.8198&daily=precipitation_probability_max&timezone=Asia/Singapore"

RESPONSE=$(curl -s "$WEATHER_URL")

# 解析今天的降雨概率
TODAY_RAIN=$(echo "$RESPONSE" | grep -oP '"precipitation_probability_max":\s*\[\K[0-9.]+' | head -1)

echo "[WeatherCheck] Today's rain probability: ${TODAY_RAIN}%"

if [ -z "$TODAY_RAIN" ]; then
  echo "[WeatherCheck] ⚠️ Failed to parse weather data. Assuming no rain."
  exit 1
fi

# 检查是否超过阈值
RAIN_INT=$(printf "%.0f" "$TODAY_RAIN" 2>/dev/null || echo "0")

if [ "$RAIN_INT" -lt "$((THRESHOLD * 100 / 1))" ]; then
  echo "[WeatherCheck] ✅ Rain probability ($RAIN_INT%) below threshold ($THRESHOLD). Skipping."
  exit 1  # 非零表示"跳过"
fi

echo "[WeatherCheck] 🌧️ Rain detected! Proceeding with reminder."
exit 0
```

**使用方式**:

```bash
# 创建脚本
chmod +x ~/.openclaw/scripts/check_rain.sh

# 设置天气提醒
openclaw cron add --file ~/.openclaw/cron/reminders/weather-reminder.json

# 测试（强制执行）
openclaw cron run --jobId <job-id>

# 查看天气数据
curl -s "https://api.open-meteo.com/v1/forecast?latitude=1.3521&longitude=103.8198&daily=precipitation_probability_max&timezone=Asia/Singapore"
```

**执行流程**:

```
07:00 → 触发任务
     → 执行 check_rain.sh
     → 获取天气 API
     → 降雨概率 < 50% → exit 1 → 不发送提醒 ✓
     → 降雨概率 >= 50% → exit 0 → 发送带伞提醒
```

---

### Example 3: Escalation Alert (升级提醒)

**需求**：重要系统告警 → 5分钟内未处理 → 通知备用联系人 → 10分钟内未处理 → 通知管理员

这个示例展示如何使用多个 hooks 实现复杂的升级逻辑。

---

### Example 3: Escalation Alert (升级提醒)

**需求**：重要系统告警 → 5分钟内未处理 → 通知备用联系人 → 10分钟内未处理 → 通知管理员

**配置文件**:

```json
{
  "id": "system-alert-001",
  "name": "系统告警-升级流程",
  "schedule": {
    "kind": "at",
    "atMs": 1738828800000
  },
  "payload": {
    "kind": "agentTurn",
    "message": "🚨 **系统告警** - CPU 使用率超过 90%\n\n请立即处理并回复「已处理」",
    "deliver": true,
    "channel": "telegram",
    "to": "5723990716"
  },
  "hooks": {
    "post": [
      {
        "kind": "shell",
        "command": "escalate.sh",
        "args": ["${JOB_ID}", "0", "primary"]
      }
    ]
  },
  "sessionTarget": "isolated",
  "enabled": true,
  "deleteAfterRun": false
}
```

**升级脚本** (`~/.openclaw/scripts/escalate.sh`):

```bash
#!/bin/bash
# escalate.sh - 升级告警到备用联系人

set -e

JOB_ID="$1"
LEVEL="${2:-0}"
CONTACT_TYPE="${3:-primary}"

WAIT_SECONDS=300  # 5分钟
MAX_LEVEL=2

echo "[Escalate] Level: $LEVEL, Contact: $CONTACT_TYPE"

# 等待处理
sleep "$WAIT_SECONDS"

# 检查是否已处理
HISTORY=$(openclaw sessions history --sessionKey main --limit 20 2>/dev/null || echo "")

if echo "$HISTORY" | grep -qiE "已处理|已修复|ok|fixed|done"; then
  echo "[Escalate] ✅ Alert resolved. Stopping escalation."
  exit 0
fi

# 升级到下一级
NEXT_LEVEL=$((LEVEL + 1))

if [ "$NEXT_LEVEL" -gt "$MAX_LEVEL" ]; then
  echo "[Escalate] ⚠️ Max escalation level reached. Notifying admin."

  openclaw message send \
    --channel telegram \
    --to "admin-telegram-id" \
    --message "🚨 **严重告警升级**\n\n用户 5723990716 未在规定时间内处理系统告警，请直接介入处理。"

  exit 0
fi

# 根据级别选择联系人和消息
case "$NEXT_LEVEL" in
  1)
    ESCALATION_MSG="⏰ **首次升级提醒** - 系统 CPU 告警仍未处理，请优先处理！"
    ESCALATION_TO="backup-user-telegram-id"
    ;;
  2)
    ESCALATION_MSG="🚨 **二次升级提醒** - 系统 CPU 告警已超时，请立即处理！"
    ESCALATION_TO="manager-telegram-id"
    ;;
esac

echo "[Escalate] 🔄 Escalating to level $NEXT_LEVEL, contact: $ESCALATION_TO"

# 发送升级通知
openclaw message send \
  --channel telegram \
  --to "$ESCALATION_TO" \
  --message "$ESCALATION_MSG\n\n原告警: CPU 使用率超过 90%"

# 继续监控
NEXT_WAIT=600  # 10分钟

cat <<EOF | openclaw cron add --stdin
{
  "name": "系统告警-升级监控$LENGTH",
  "schedule": { "kind": "at", "atMs": $(($(date +%s)000 + NEXT_WAIT * 1000)) },
  "payload": {
    "kind": "agentTurn",
    "message": "⏰ **告警未处理** - 请立即处理 CPU 告警问题",
    "deliver": true,
    "channel": "telegram",
    "to": "5723990716"
  },
  "hooks": {
    "post": [
      {
        "kind": "shell",
        "command": "escalate.sh",
        "args": ["\${JOB_ID}", "$NEXT_LEVEL"]
      }
    ]
  },
  "sessionTarget": "isolated",
  "deleteAfterRun": true
}
EOF
```

---

### Implementation Plan

#### Phase 1: Core Hooks System
1. Add `hooks` field to cron job schema
2. Create hook executor service
3. Execute pre hooks before payload
4. Execute post hooks after success
5. Execute onError hooks on failure

#### Phase 2: Shell Hooks
1. Implement shell command execution
2. Add timeout (default 30s) and security constraints
3. Support environment variables injection
4. Sandbox commands (optional: Docker/container)

#### Phase 3: Webhook Hooks
1. HTTP POST/GET support
2. Configurable timeout and retries
3. Secret management for sensitive URLs
4. Response validation

---

### CLI Usage

```bash
# Create cron job with hooks
openclaw cron add \
  --name "会议提醒" \
  --schedule "at 2026-02-06T09:00:00+08:00" \
  --payload '{"kind":"agentTurn","message":"会议即将开始"}' \
  --hooks-pre '{"kind":"shell","command":"check_weather.sh"}' \
  --hooks-post '{"kind":"shell","command":"check_reply.sh","args":["300"]}' \
  --sessionTarget isolated

# Create from file
openclaw cron add --file meeting-reminder.json

# List jobs with hooks info
openclaw cron list --verbose

# Show job details including hooks
openclaw cron describe <job-id>

# Manually trigger a job (runs hooks)
openclaw cron run --jobId <job-id>
```

---

### Configuration File Examples

#### Minimal Hook Configuration

```json
{
  "schedule": { "kind": "at", "atMs": 1738828800000 },
  "payload": { "kind": "systemEvent", "text": "Hello" },
  "hooks": {
    "pre": [{ "kind": "shell", "command": "validate.sh" }]
  }
}
```

#### Full Hook Configuration

```json
{
  "id": "complex-job",
  "name": "Complex Job with Multiple Hooks",
  "schedule": { "kind": "cron", "expr": "0 */4 * * *" },
  "payload": {
    "kind": "agentTurn",
    "message": "定时任务执行",
    "model": "anthropic/claude-sonnet-4-20250514"
  },
  "hooks": {
    "pre": [
      {
        "kind": "shell",
        "command": "preflight_check.sh",
        "env": { "LOG_LEVEL": "debug" }
      },
      {
        "kind": "webhook",
        "url": "https://api.example.com/health",
        "method": "GET"
      }
    ],
    "post": [
      {
        "kind": "shell",
        "command": "cleanup.sh",
        "args": ["${JOB_ID}"]
      },
      {
        "kind": "webhook",
        "url": "https://api.example.com/metrics",
        "method": "POST",
        "body": {
          "jobId": "${JOB_ID}",
          "triggerTime": "${TRIGGER_TIME}",
          "status": "success"
        }
      }
    ],
    "onError": [
      {
        "kind": "webhook",
        "url": "https://api.example.com/alerts",
        "method": "POST",
        "body": {
          "jobId": "${JOB_ID}",
          "error": "${ERROR_MESSAGE}"
        }
      }
    ]
  },
  "sessionTarget": "isolated"
}
```

---

### Security Considerations

1. **Shell Commands**
   - Default timeout: 30 seconds
   - Configurable timeout per hook
   - Optional: Docker sandbox for untrusted scripts
   - Environment variables sanitized
   - Command injection protection (whitelist allowed commands)

2. **Webhooks**
   - HTTPS required by default
   - Configurable timeout (default 10s)
   - Retry count limit (default 3)
   - Secret headers support for authentication
   - Response validation (optional)

3. **User Data**
   - Shell output not logged by default
   - Sensitive data in environment variables masked
   - User opt-in for detailed logging

4. **Rate Limiting**
   - Prevent hook loops (max 3 recursions)
   - Global hook execution rate limit
   - Per-user hook quota

---

### Example: Forced Reminder Implementation (Complete)

With this hooks system, a forced reminder can be configured in multiple ways:

**Option A: Using Shell Hook (Most Flexible)**

```bash
# ~/.openclaw/scripts/forced_reminder.sh
#!/bin/bash
# 检查用户是否回复，未回复则触发重试

set -e

JOB_ID="$1"
TIMEOUT_MINUTES="${TIMEOUT:-5}"
MAX_RETRIES="${MAX_RETRIES:-3}"

# 等待
sleep $((TIMEOUT_MINUTES * 60))

# 检查回复
HISTORY=$(openclaw sessions history --sessionKey main --limit 50)

if echo "$HISTORY" | grep -qiE "收到|确认|ok|好的"; then
  echo "✅ 用户已确认"
  exit 0
fi

# 检查重试次数
RETRY_FILE="/tmp/.retry_${JOB_ID}"
RETRY_COUNT=$(cat "$RETRY_FILE" 2>/dev/null || echo "0")

if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
  echo "⚠️ 达到最大重试次数，停止"
  rm -f "$RETRY_FILE"
  exit 0
fi

# 更新重试计数
echo $((RETRY_COUNT + 1)) > "$RETRY_FILE"

# 触发重试
openclaw cron run --jobId "$JOB_ID"
```

**Option B: Using Built-in "Forced" Mode (Simpler)**

For users who want forced reminders without writing scripts, offer a simpler built-in option:

```typescript
interface CronJob {
  // ... existing fields

  // NEW: Built-in forced reminder mode (alternative to hooks)
  forced?: {
    enabled: boolean;
    intervalMinutes: number;
    maxRetries: number;
    ackKeywords?: string[];  // ["收到", "确认", "ok"]
    escalationMessage?: string;  // Change message on retry
  };
}
```

**使用示例**:

```json
{
  "name": "起床提醒",
  "schedule": { "kind": "at", "atMs": 1738828800000 },
  "payload": {
    "kind": "agentTurn",
    "message": "⏰ 早上8点起床时间到！",
    "deliver": true,
    "channel": "telegram",
    "to": "5723990716"
  },
  "forced": {
    "enabled": true,
    "intervalMinutes": 5,
    "maxRetries": 3,
    "ackKeywords": ["收到", "好", "ok", "起床了"]
  }
}
```

---

### Comparison: Hooks vs Built-in Mode

| Aspect | Hooks System | Built-in Mode |
|--------|--------------|---------------|
| Flexibility | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Ease of use | 需要写脚本 | 一键配置 |
| Use cases | 无限 | 仅强制提醒 |
| Learning curve | 中等 | 低 |
| Extensibility | 可扩展任何场景 | 仅内置逻辑 |

**Recommendation**: Implement both options:
- **Hooks system** for power users and complex scenarios
- **Built-in forced mode** for simple use cases

### Example: Forced Reminder Implementation

With this hooks system, a forced reminder script could work like:

```bash
#!/bin/bash
# check_user_reply.sh
JOB_ID=$1
TIMEOUT=$2

# Wait for user reply
sleep $TIMEOUT

# Check if user replied
if ! openclaw sessions history --sessionKey main | grep -q "已收到\|确认"; then
  # Trigger retry
  openclaw cron run --jobId $JOB_ID
fi
```

## Alternative: Built-in "Forced" Mode

Simpler approach - add native support for forced reminders:

```typescript
interface CronJob {
  // ... existing fields

  // NEW: Built-in forced reminder mode
  forced?: {
    enabled: boolean;
    intervalMinutes: number;
    maxRetries: number;
    escalationMessage?: string; // Change message on each retry
  };
}
```

This is simpler but less flexible than hooks.

## Recommendation

**Implement hooks system** because:
1. More flexible - supports any use case
2. User-extensible - users can write their own scripts
3. Future-proof - new hooks can be added easily
4. Composability - combine multiple hooks

## Related Issues

- #1234: Feature request: Snooze/dismiss for reminders
- #567: Enhancement: Escalation support for critical alerts
- #890: Idea: Conditional cron execution

## Testing Plan

1. Unit tests for hook execution order
2. Integration tests for pre/post hooks
3. Security tests for shell command sandboxing
4. E2E tests for forced reminder use case

## Changelog Entry

### Features
- Added hooks system to cron jobs (`hooks.pre`, `hooks.post`, `hooks.onError`)
- Hooks support agent turns, system events, shell commands, and webhooks
- Shell hooks receive environment variables: `JOB_ID`, `JOB_NAME`, `TRIGGER_TIME`

### Breaking Changes
- None

### Migration Guide
- Existing cron jobs work unchanged
- Add `hooks` field to enable new functionality

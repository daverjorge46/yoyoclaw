---
summary: "Feishu（飞书/Lark）渠道配置与能力说明（含多媒体与图片双写发送）"
---

## 概览

OpenClaw 支持通过飞书机器人接收/发送消息，并支持图片、文件、音频、视频等多媒体能力。

- **推荐接收模式**：WebSocket（无需公网回调 URL）
- **多媒体**：支持入站下载到本地媒体缓存，并在出站时自动按媒体类型选择发送方式
- **图片双写发送**：可选将同一张图片同时以“图片消息 + 文件附件”发送，兼顾预览与可下载/保真

## 最小配置（单账号）

Install the Feishu plugin:

```bash
openclaw plugins install @openclaw/feishu
```

Local checkout (when running from a git repo):

```bash
openclaw plugins install ./extensions/feishu
```

---

## Quickstart

There are two ways to add the Feishu channel:

### Method 1: onboarding wizard (recommended)

If you just installed OpenClaw, run the wizard:

```bash
openclaw onboard
```

The wizard guides you through:

1. Creating a Feishu app and collecting credentials
2. Configuring app credentials in OpenClaw
3. Starting the gateway

✅ **After configuration**, check gateway status:

- `openclaw gateway status`
- `openclaw logs --follow`

### Method 2: CLI setup

If you already completed initial install, add the channel via CLI:

```bash
openclaw channels add
```

Choose **Feishu**, then enter the App ID and App Secret.

✅ **After configuration**, manage the gateway:

- `openclaw gateway status`
- `openclaw gateway restart`
- `openclaw logs --follow`

---

## Step 1: Create a Feishu app

### 1. Open Feishu Open Platform

Visit [Feishu Open Platform](https://open.feishu.cn/app) and sign in.

Lark (global) tenants should use [https://open.larksuite.com/app](https://open.larksuite.com/app) and set `domain: "lark"` in the Feishu config.

### 2. Create an app

1. Click **Create enterprise app**
2. Fill in the app name + description
3. Choose an app icon

![Create enterprise app](../images/feishu-step2-create-app.png)

### 3. Copy credentials

From **Credentials & Basic Info**, copy:

- **App ID** (format: `cli_xxx`)
- **App Secret**

❗ **Important:** keep the App Secret private.

![Get credentials](../images/feishu-step3-credentials.png)

### 4. Configure permissions

On **Permissions**, click **Batch import** and paste:

```json
{
  "channels": {
    "feishu": {
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "eventMode": "websocket"
    }
  }
}
```

## 多账号配置

```json
{
  "channels": {
    "feishu": {
      "accounts": {
        "default": {
          "appId": "cli_xxx",
          "appSecret": "xxx",
          "eventMode": "websocket"
        }
      }
    }
  }
}
```

## 入站（用户 → OpenClaw）

- **消息类型**：`text` 直接进入对话；`image/file/audio/media(video)` 会触发下载
- **媒体下载**：下载后落在本地 `~/.openclaw/media/inbound/`，并写入上下文：
  - `MediaPath`：本地文件路径
  - `MediaType`：推断出的 mime
  - `Body`：若原消息无文本，会用占位符（例如 `<media:image>`）触发 agent
- **大小限制**：`channels.feishu.mediaMaxMb`（默认 20MB）

## 出站（OpenClaw → 飞书）

当回复 payload 里包含 `mediaUrl/mediaUrls` 时：

- **图片**：默认发 `image`（可预览）
  - 可选开启 **图片双写发送**：先发 `image`，再发 `file` 附件（便于下载/保真）
    - 配置：`channels.feishu.imageDoubleSend: true`
- **音频**：OPUS/OGG 优先发 `audio`；否则按 `file` 附件发送
- **视频**：mp4 优先发 `media`；否则按 `file` 附件发送
- **其他文件**：按 `file` 附件发送

## 相关配置项（常用）

- **`channels.feishu.eventMode`**：`"websocket"`（推荐）或 `"webhook"`
- **`channels.feishu.mediaMaxMb`**：入站下载与出站抓取媒体的大小上限（MB）
- **`channels.feishu.imageDoubleSend`**：是否启用图片双写发送
- **`channels.feishu.groups.<chatId>.requireMention`**：群聊是否要求 @ 机器人（默认由通用 group policy 决定）

## 进一步阅读

- 渠道总览：`/channels`
- 配置总览：`/cli/config`

### 2. Send a test message

In Feishu, find your bot and send a message.

### 3. Approve pairing

By default, the bot replies with a pairing code. Approve it:

```bash
openclaw pairing approve feishu <CODE>
```

After approval, you can chat normally.

---

## Overview

- **Feishu bot channel**: Feishu bot managed by the gateway
- **Deterministic routing**: replies always return to Feishu
- **Session isolation**: DMs share a main session; groups are isolated
- **WebSocket connection**: long connection via Feishu SDK, no public URL needed

---

## Access control

### Direct messages

- **Default**: `dmPolicy: "pairing"` (unknown users get a pairing code)
- **Approve pairing**:

  ```bash
  openclaw pairing list feishu
  openclaw pairing approve feishu <CODE>
  ```

- **Allowlist mode**: set `channels.feishu.allowFrom` with allowed Open IDs

### Group chats

**1. Group policy** (`channels.feishu.groupPolicy`):

- `"open"` = allow everyone in groups (default)
- `"allowlist"` = only allow `groupAllowFrom`
- `"disabled"` = disable group messages

**2. Mention requirement** (`channels.feishu.groups.<chat_id>.requireMention`):

- `true` = require @mention (default)
- `false` = respond without mentions

---

## Group configuration examples

### Allow all groups, require @mention (default)

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
      // Default requireMention: true
    },
  },
}
```

### Allow all groups, no @mention required

```json5
{
  channels: {
    feishu: {
      groups: {
        oc_xxx: { requireMention: false },
      },
    },
  },
}
```

### Allow specific users in groups only

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["ou_xxx", "ou_yyy"],
    },
  },
}
```

---

## Get group/user IDs

### Group IDs (chat_id)

Group IDs look like `oc_xxx`.

**Method 1 (recommended)**

1. Start the gateway and @mention the bot in the group
2. Run `openclaw logs --follow` and look for `chat_id`

**Method 2**

Use the Feishu API debugger to list group chats.

### User IDs (open_id)

User IDs look like `ou_xxx`.

**Method 1 (recommended)**

1. Start the gateway and DM the bot
2. Run `openclaw logs --follow` and look for `open_id`

**Method 2**

Check pairing requests for user Open IDs:

```bash
openclaw pairing list feishu
```

---

## Common commands

| Command   | Description       |
| --------- | ----------------- |
| `/status` | Show bot status   |
| `/reset`  | Reset the session |
| `/model`  | Show/switch model |

> Note: Feishu does not support native command menus yet, so commands must be sent as text.

## Gateway management commands

| Command                    | Description                   |
| -------------------------- | ----------------------------- |
| `openclaw gateway status`  | Show gateway status           |
| `openclaw gateway install` | Install/start gateway service |
| `openclaw gateway stop`    | Stop gateway service          |
| `openclaw gateway restart` | Restart gateway service       |
| `openclaw logs --follow`   | Tail gateway logs             |

---

## Troubleshooting

### Bot does not respond in group chats

1. Ensure the bot is added to the group
2. Ensure you @mention the bot (default behavior)
3. Check `groupPolicy` is not set to `"disabled"`
4. Check logs: `openclaw logs --follow`

### Bot does not receive messages

1. Ensure the app is published and approved
2. Ensure event subscription includes `im.message.receive_v1`
3. Ensure **long connection** is enabled
4. Ensure app permissions are complete
5. Ensure the gateway is running: `openclaw gateway status`
6. Check logs: `openclaw logs --follow`

### App Secret leak

1. Reset the App Secret in Feishu Open Platform
2. Update the App Secret in your config
3. Restart the gateway

### Message send failures

1. Ensure the app has `im:message:send_as_bot` permission
2. Ensure the app is published
3. Check logs for detailed errors

---

## Advanced configuration

### Multiple accounts

```json5
{
  channels: {
    feishu: {
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          botName: "Primary bot",
        },
        backup: {
          appId: "cli_yyy",
          appSecret: "yyy",
          botName: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

### Message limits

- `textChunkLimit`: outbound text chunk size (default: 2000 chars)
- `mediaMaxMb`: media upload/download limit (default: 30MB)

### Streaming

Feishu supports streaming replies via interactive cards. When enabled, the bot updates a card as it generates text.

```json5
{
  channels: {
    feishu: {
      streaming: true, // enable streaming card output (default true)
      blockStreaming: true, // enable block-level streaming (default true)
    },
  },
}
```

Set `streaming: false` to wait for the full reply before sending.

### Multi-agent routing

Use `bindings` to route Feishu DMs or groups to different agents.

```json5
{
  agents: {
    list: [
      { id: "main" },
      {
        id: "clawd-fan",
        workspace: "/home/user/clawd-fan",
        agentDir: "/home/user/.openclaw/agents/clawd-fan/agent",
      },
      {
        id: "clawd-xi",
        workspace: "/home/user/clawd-xi",
        agentDir: "/home/user/.openclaw/agents/clawd-xi/agent",
      },
    ],
  },
  bindings: [
    {
      agentId: "main",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_xxx" },
      },
    },
    {
      agentId: "clawd-fan",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_yyy" },
      },
    },
    {
      agentId: "clawd-xi",
      match: {
        channel: "feishu",
        peer: { kind: "group", id: "oc_zzz" },
      },
    },
  ],
}
```

Routing fields:

- `match.channel`: `"feishu"`
- `match.peer.kind`: `"direct"` or `"group"`
- `match.peer.id`: user Open ID (`ou_xxx`) or group ID (`oc_xxx`)

See [Get group/user IDs](#get-groupuser-ids) for lookup tips.

---

## Configuration reference

Full configuration: [Gateway configuration](/gateway/configuration)

Key options:

| Setting                                           | Description                     | Default   |
| ------------------------------------------------- | ------------------------------- | --------- |
| `channels.feishu.enabled`                         | Enable/disable channel          | `true`    |
| `channels.feishu.domain`                          | API domain (`feishu` or `lark`) | `feishu`  |
| `channels.feishu.accounts.<id>.appId`             | App ID                          | -         |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                      | -         |
| `channels.feishu.accounts.<id>.domain`            | Per-account API domain override | `feishu`  |
| `channels.feishu.dmPolicy`                        | DM policy                       | `pairing` |
| `channels.feishu.allowFrom`                       | DM allowlist (open_id list)     | -         |
| `channels.feishu.groupPolicy`                     | Group policy                    | `open`    |
| `channels.feishu.groupAllowFrom`                  | Group allowlist                 | -         |
| `channels.feishu.groups.<chat_id>.requireMention` | Require @mention                | `true`    |
| `channels.feishu.groups.<chat_id>.enabled`        | Enable group                    | `true`    |
| `channels.feishu.textChunkLimit`                  | Message chunk size              | `2000`    |
| `channels.feishu.mediaMaxMb`                      | Media size limit                | `30`      |
| `channels.feishu.streaming`                       | Enable streaming card output    | `true`    |
| `channels.feishu.blockStreaming`                  | Enable block streaming          | `true`    |

---

## dmPolicy reference

| Value         | Behavior                                                        |
| ------------- | --------------------------------------------------------------- |
| `"pairing"`   | **Default.** Unknown users get a pairing code; must be approved |
| `"allowlist"` | Only users in `allowFrom` can chat                              |
| `"open"`      | Allow all users (requires `"*"` in allowFrom)                   |
| `"disabled"`  | Disable DMs                                                     |

---

## Supported message types

### Receive

- ✅ Text
- ✅ Rich text (post)
- ✅ Images
- ✅ Files
- ✅ Audio
- ✅ Video
- ✅ Stickers

### Send

- ✅ Text
- ✅ Images
- ✅ Files
- ✅ Audio
- ⚠️ Rich text (partial support)

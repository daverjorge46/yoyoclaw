# OpenClaw 中国通讯平台插件移植记录

## 移植日期

2026-02-03

## 概述

将 `.mastwet-workspace` 中的中国通讯平台代码整合为 OpenClaw 原生插件，共创建 6 个独立的 extension。

## 源项目信息

### 1. moltbot-china

- **路径**: `.mastwet-workspace/moltbot-china/`
- **来源**: https://github.com/BytePioneer-AI/moltbot-china
- **包含内容**:
  - `extensions/feishu` - 飞书/Lark 渠道插件
  - `extensions/dingtalk` - 钉钉渠道插件
  - `extensions/wecom` - 企业微信渠道插件
  - `packages/shared` - 共享工具库

### 2. qqbot

- **路径**: `.mastwet-workspace/qqbot/`
- **来源**: https://github.com/sliverp/qqbot
- **包含内容**: QQ 开放平台官方机器人 API 插件

### 3. qq-Napcat

- **路径**: `.mastwet-workspace/qq-Napcat/`
- **包含内容**: QQ 第三方协议 (NapCatQQ/OneBot v11) 插件

## 创建的 Extensions

### 1. @openclaw/china-shared

- **路径**: `extensions/china-shared/`
- **用途**: 共享工具库，提供 logger、policy、http、file、media 等功能
- **依赖关系**: 被 feishu、dingtalk、wecom 依赖

### 2. @openclaw/feishu

- **路径**: `extensions/feishu/`
- **Channel ID**: `feishu`
- **别名**: `lark`
- **Order**: 70
- **功能**:
  - WebSocket 长连接模式
  - 文本/Markdown 消息
  - 图片/文件接收
  - 私聊/群聊支持
  - Markdown 卡片发送

### 3. @openclaw/dingtalk

- **路径**: `extensions/dingtalk/`
- **Channel ID**: `dingtalk`
- **别名**: `ding`
- **Order**: 71
- **功能**:
  - Stream 长连接模式
  - AI Card 流式输出
  - 文本/Markdown 消息
  - 图片/文件/语音消息
  - 私聊/群聊支持

### 4. @openclaw/wecom

- **路径**: `extensions/wecom/`
- **Channel ID**: `wecom`
- **别名**: `wechatwork`, `wework`, `qywx`
- **Order**: 85
- **功能**:
  - HTTPS 回调模式
  - 被动回复（不支持主动发送）
  - 文本/Markdown 消息
  - 图片/文件/语音接收
  - 多账户支持

### 5. @openclaw/qqbot

- **路径**: `extensions/qqbot/`
- **Channel ID**: `qqbot`
- **别名**: `qq-official`
- **Order**: 80
- **功能**:
  - QQ 开放平台官方 API
  - WebSocket 自动重连
  - C2C 单聊、群聊 @消息
  - 频道公开消息、频道私信
  - Session Resume 支持

### 6. @openclaw/qq

- **路径**: `extensions/qq/`
- **Channel ID**: `qq`
- **别名**: `napcat`, `onebot`
- **Order**: 81
- **功能**:
  - NapCatQQ/OneBot v11 协议
  - WebSocket 连接模式
  - 私聊/群聊支持
  - 多账户管理

## 文件变更清单

### 新增文件

```
extensions/china-shared/
├── package.json
└── src/
    ├── index.ts
    ├── file/
    ├── http/
    ├── logger/
    ├── media/
    ├── policy/
    └── types/

extensions/feishu/
├── package.json
├── index.ts
├── openclaw.plugin.json
├── README.md
└── src/
    ├── bot.ts
    ├── bot.test.ts
    ├── channel.ts
    ├── client.ts
    ├── config.ts
    ├── config.test.ts
    ├── gateway.ts
    ├── logger.ts
    ├── outbound.ts
    ├── runtime.ts
    ├── send.ts
    └── types.ts

extensions/dingtalk/
├── package.json
├── index.ts
├── openclaw.plugin.json
├── README.md
└── src/
    ├── bot.ts
    ├── bot.test.ts
    ├── card.ts
    ├── channel.ts
    ├── client.ts
    ├── client.test.ts
    ├── config.ts
    ├── config.test.ts
    ├── inbound-context.property.test.ts
    ├── logger.ts
    ├── media.ts
    ├── media-errors.test.ts
    ├── media-integration.test.ts
    ├── media-parsing.test.ts
    ├── monitor.ts
    ├── onboarding.ts
    ├── outbound.ts
    ├── runtime.ts
    ├── send.ts
    └── types.ts

extensions/wecom/
├── package.json
├── index.ts
├── openclaw.plugin.json
├── README.md
└── src/
    ├── bot.ts
    ├── channel.ts
    ├── config.ts
    ├── crypto.ts
    ├── crypto.test.ts
    ├── monitor.ts
    ├── monitor.test.ts
    ├── runtime.ts
    └── types.ts

extensions/qqbot/
├── package.json
├── index.ts
├── openclaw.plugin.json
├── README.md
└── src/
    ├── api.ts
    ├── channel.ts
    ├── config.ts
    ├── gateway.ts
    ├── image-server.ts
    ├── onboarding.ts
    ├── outbound.ts
    ├── runtime.ts
    └── types.ts

extensions/qq/
├── package.json
├── index.ts
├── openclaw.plugin.json
├── README.md
└── src/
    ├── accounts.ts
    ├── accounts.test.ts
    ├── channel.ts
    ├── config-schema.ts
    ├── connection.ts
    ├── connection.test.ts
    ├── monitor.ts
    ├── monitor.test.ts
    ├── normalize.ts
    ├── normalize.test.ts
    ├── onboarding.ts
    ├── onebot/
    ├── runtime.ts
    ├── send.ts
    ├── send.test.ts
    └── types.ts
```

## 代码修改

### 导入路径替换

- `@openclaw-china/shared` → `@openclaw/china-shared`
- `clawdbot/plugin-sdk` → `openclaw/plugin-sdk`
- `moltbot/plugin-sdk` → `openclaw/plugin-sdk`

### package.json 配置

所有 extension 的 `package.json` 均配置了：

- `openclaw.extensions`: 入口文件路径
- `openclaw.channel`: 渠道元数据 (id, label, selectionLabel, docsPath, blurb, aliases, order)
- `openclaw.install`: 安装配置 (npmSpec, localPath, defaultChoice)
- `devDependencies`: `"openclaw": "workspace:*"`

## 验证结果

| 检查项       | 结果 |
| ------------ | ---- |
| pnpm install | 通过 |
| pnpm build   | 通过 |
| pnpm check   | 通过 |

## 后续工作

1. 为每个渠道创建文档 (`docs/channels/feishu.md` 等)
2. 添加到 `.github/labeler.yml` 的标签配置
3. 完善 onboarding 流程的中文本地化
4. 添加集成测试

## 注意事项

- 企业微信仅支持被动回复模式，不支持主动发送消息
- QQ 官方机器人新创建默认在沙箱模式，需添加测试用户
- QQ 第三方协议需要先安装配置 NapCatQQ
- 飞书需开启机器人能力并使用「长连接接收消息」模式

# OpenClaw Python 接口契约

> 每个批次完成后由 /done 命令自动更新。
> 新批次开始时由 /start 命令自动读取。
> 最后更新：批次 1（2026-02-13）

---

## openclaw_py.types.base
路径: openclaw_py/types/base.py

```python
from openclaw_py.types import (
    ChatType,
    DmPolicy,
    DmScope,
    GroupPolicy,
    LogLevel,
    MarkdownTableMode,
    ReplyMode,
    ReplyToMode,
    SessionMaintenanceMode,
    SessionResetMode,
    SessionScope,
    SessionSendPolicyAction,
    TypingMode,
    normalize_chat_type,
)
```

### 类型定义

**ChatType**: Literal["direct", "group", "channel"]
- 聊天类型：直接消息、群组、频道

**ReplyMode**: Literal["text", "command"]
- 回复模式

**TypingMode**: Literal["never", "instant", "thinking", "message"]
- 打字状态显示模式

**SessionScope**: Literal["per-sender", "global"]
- 会话作用域

**DmScope**: Literal["main", "per-peer", "per-channel-peer", "per-account-channel-peer"]
- 直接消息作用域

**ReplyToMode**: Literal["off", "first", "all"]
- 回复引用模式

**GroupPolicy**: Literal["open", "disabled", "allowlist"]
- 群组消息策略

**DmPolicy**: Literal["pairing", "allowlist", "open", "disabled"]
- 直接消息策略

**MarkdownTableMode**: Literal["off", "bullets", "code"]
- Markdown 表格渲染模式

**SessionResetMode**: Literal["daily", "idle"]
- 会话重置模式

**SessionSendPolicyAction**: Literal["allow", "deny"]
- 会话发送策略动作

**SessionMaintenanceMode**: Literal["enforce", "warn"]
- 会话维护模式

**LogLevel**: Literal["silent", "fatal", "error", "warn", "info", "debug", "trace"]
- 日志级别

### 函数

```python
def normalize_chat_type(raw: str | None) -> ChatType | None:
    """将字符串规范化为 ChatType。

    - "dm" 会转换为 "direct"
    - 大小写不敏感
    - 自动去除前后空白
    - 无效值返回 None
    """
```

---

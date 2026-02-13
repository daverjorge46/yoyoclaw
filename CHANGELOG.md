# 迁移日志

> 每批次完成后由 /done 命令自动追加。

---

## 批次 1：项目骨架 + 核心类型（2026-02-13）

**新增文件**：
- openclaw_py/types/base.py - 核心基础类型定义
- openclaw_py/types/__init__.py - 类型模块导出
- openclaw_py/__init__.py - 包根模块
- tests/types/test_base.py - 核心类型单元测试

**核心变更**：
- 创建了 openclaw_py/ 项目目录结构（types, config, logging, utils, sessions, gateway, agents, channels, routing, users, cli）
- 定义了 14 个核心基础类型（ChatType, ReplyMode, TypingMode, SessionScope, DmScope, ReplyToMode, GroupPolicy, DmPolicy, MarkdownTableMode, SessionResetMode, SessionSendPolicyAction, SessionMaintenanceMode, LogLevel）
- 实现了 normalize_chat_type() 辅助函数（支持 "dm" -> "direct" 别名转换）
- 使用 typing.Literal 替代 TypeScript 的联合类型，保持类型安全
- 配置 Poetry 依赖管理（Python 3.13, Pydantic v2, aiogram 3.x, FastAPI, anthropic SDK, openai SDK, litellm）

**依赖的已有模块**：
- 无（批次 1 是基础，无依赖）

**已知问题**：
- 无

**测试结果**：22 passed

---

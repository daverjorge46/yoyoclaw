---
title: Skill Guard Web UI 全链路演示测试手册
summary: 基于 Gateway Web 页面的 skill-guard 全链路演示测试用例，用于业务方交付验证。
permalink: /security/skill-guard-webui-demo-test/
---

# Skill Guard Web UI 全链路演示测试手册

> 本文档提供通过 **Gateway Web 页面对话和点击操作** 完成 skill-guard 全链路测试的详细用例。
> 适用于业务方验收演示和交付验证，不涉及命令行操作。

---

## 前置条件

| 项目 | 要求 |
|---|---|
| Gateway 端口 | `19001`（需使用 `--dev` 模式启动的 Gateway） |
| Web UI 地址 | `http://<服务器IP>:19001` |
| 云端商店 | `http://115.190.153.145:9650`（或配置的 trustedStores 地址） |
| 配置文件 | `~/.openclaw-dev/openclaw.json` 中已配置 `skills.guard.trustedStores` |
| 密码 | Gateway 密码（默认 `dev`） |

---

## 测试用例总览

| # | 测试类别 | 用例数 |
|---|---|---|
| A | Skill 列表与状态验证 | 6 |
| B | Skill Store 搜索与安装 | 8 |
| C | Blocklist 阻断验证 | 4 |
| D | 恶意 Skill 检测验证 | 4 |
| E | SHA256 篡改检测 | 3 |
| F | Skill 更新与删除 | 4 |
| G | Agent 语义匹配验证 | 6 |
| H | 审计日志验证 | 4 |
| **合计** | | **39** |

---

## A. Skill 列表与状态验证

### A-1: 查看 Skill 列表

**操作**: 打开 Web UI → 进入 Skills 页面（左侧导航 → Skills）

**预期结果**:
- 页面展示所有已加载的 skills 列表
- `skill-store` 显示在 **BUILT-IN SKILLS** 分组中
- `skill-store` 状态为 **Ready**（绿色）
- `skill-store` 来源标记为 `openclaw-bundled`
- 未被 Guard 阻断（无 🚫 标记）

---

### A-2: 查看 skill-store 详情

**操作**: 在 Skills 页面 → 点击展开 `skill-store`

**预期结果**:
- 显示 description 包含 "SHA256 verification"
- 显示来源为 `openclaw-bundled`
- 状态为 Ready
- 无阻断标记

---

### A-3: 查看 Blocklist Skill 被阻断

**操作**: 在 Skills 页面查找是否有任何带 🚫 或 "blocked" 标记的 skill

**预期结果**:
- 如果 managed skills 目录中存在 blocklist 中的 skill（如 `evil-skill`），则应显示 **blocked** 状态
- 被阻断的 skill 不可使用（点击 Enable 后仍然无法启用）

---

### A-4: Disable/Enable 后 Guard 持续生效

**操作**:
1. 在 Skills 页面 → 找到任意 Ready 状态的 skill（如 `skill-store`）
2. 点击 **Disable**
3. 等待 2 秒
4. 点击 **Enable**
5. 检查 Skills 列表

**预期结果**:
- Enable 后 skill 恢复为 Ready 状态
- 如果 managed 目录中存在被阻断的 skill，它们**仍然保持 blocked 状态**（不会因为 refresh 而绕过阻断）
- 这是 Guard 持久化阻断能力的关键验证

---

### A-5: Skills 页面不包含恶意 skill

**操作**: 浏览 Skills 页面完整列表

**预期结果**:
- 不应出现名为 `evil-skill`、`dangerous-sideload` 等已知恶意 skill
- 如果它们存在于 managed 目录但被 Guard 阻断，应显示 blocked 而非 Ready

---

### A-6: 刷新页面后 Guard 状态持续

**操作**: 
1. 记录当前 Skills 页面的 blocked/ready 状态
2. 按 F5 或浏览器刷新按钮
3. 对比刷新前后的状态

**预期结果**:
- 刷新后所有 skill 状态与刷新前一致
- 被阻断的 skill 仍然被阻断
- Ready 的 skill 仍然 Ready

---

## B. Skill Store 搜索与安装

### B-1: 通过对话搜索 Skill

**操作**: 在 Chat 页面输入：

```
搜索商店中有哪些 diagram 相关的 skill
```

**预期结果**:
- Agent 使用 `skill-store` skill（而非 clawhub 或 openclaw CLI）
- 执行 `store-cli.py search diagram`
- 返回包含 `ascii-diagram-creator` 的搜索结果
- 显示版本号、发布者、安装状态

---

### B-2: 通过对话列出所有商店 Skill

**操作**: 在 Chat 页面输入：

```
列出所有可用的 skill
```

**预期结果**:
- Agent 使用 `skill-store` 的 `list` 命令
- 返回 40+ skills 的完整列表
- 每个 skill 显示名称、版本、发布者
- 已安装的 skill 标记为 "✓ installed"

---

### B-3: 通过对话安装 Skill

**操作**: 在 Chat 页面输入：

```
帮我从商店安装 ascii-diagram-creator
```

**预期结果**:
- Agent 使用 `skill-store` 的 `install` 命令
- 输出显示：下载 → 解压 → SHA256 验证 → 安装成功
- 明确提示 "All XX file(s) verified ✓"
- 显示安装路径 `~/.openclaw-dev/skills/ascii-diagram-creator`
- **不会**尝试使用 `openclaw` CLI 或 `clawhub`

---

### B-4: 安装后在 Skills 页面可见

**操作**: 安装完成后 → 刷新 Skills 页面

**预期结果**:
- 新安装的 `ascii-diagram-creator`（或 `store.ascii-diagram-creator`）出现在 **MANAGED SKILLS** 或等效分组中
- 状态为 Ready
- 来源标记为 `openclaw-managed`

---

### B-5: 重复安装提示已存在

**操作**: 在 Chat 页面输入：

```
帮我安装 ascii-diagram-creator
```

**预期结果**:
- 提示 skill 已安装
- 建议使用 `--force` 重新安装或 `update` 更新
- 不会重复下载

---

### B-6: 强制重新安装

**操作**: 在 Chat 页面输入：

```
帮我强制重新安装 ascii-diagram-creator
```

**预期结果**:
- Agent 使用 `install --force`
- 重新下载并验证 SHA256
- 覆盖现有安装
- 输出 "verified ✓"

---

### B-7: 查看 Skill 详情

**操作**: 在 Chat 页面输入：

```
查看 ascii-diagram-creator 的详细信息
```

**预期结果**:
- Agent 使用 `info` 命令
- 显示版本号、发布者、verified 状态、文件数量
- 显示 SHA256 hash 列表
- 显示 Installed: yes

---

### B-8: 同步商店清单

**操作**: 在 Chat 页面输入：

```
帮我同步商店清单
```

**预期结果**:
- Agent 使用 `sync` 命令
- 从云端拉取最新 manifest
- 显示 Store 名称、版本号、skill 数量、blocklist 数量
- 本地 manifest cache 文件更新

---

## C. Blocklist 阻断验证

### C-1: 尝试安装 Blocklist Skill

**操作**: 在 Chat 页面输入：

```
帮我安装 evil-skill
```

**预期结果**:
- 安装被拒绝
- 错误信息明确包含 "blocklist"
- 不会下载任何文件

---

### C-2: 尝试安装另一个 Blocklist Skill

**操作**: 在 Chat 页面输入：

```
帮我安装 dangerous-sideload
```

**预期结果**:
- 安装被拒绝
- 错误信息包含 "blocklist"

---

### C-3: 搜索不显示 Blocklist Skill

**操作**: 在 Chat 页面输入：

```
搜索 evil
```

**预期结果**:
- 搜索结果不包含被 blocklist 的 skill
- 或明确标记为 "blocked"

---

### C-4: Blocklist Skill 在列表中标注

**操作**: 在 Chat 页面输入：

```
列出所有 skill，包括被阻断的
```

**预期结果**:
- 底部显示 "Blocked skills (N): evil-skill, dangerous-sideload, ..."
- 被阻断的 skill 不在可安装列表中

---

## D. 恶意 Skill 检测验证

> 此类测试需要手动在 managed skills 目录中放置测试 skill。
> 放置后需要重启 Gateway 或等待自动刷新。

### D-1: 恶意代码 Skill 被静态扫描阻断

**准备**: 在 `~/.openclaw-dev/skills/` 下创建 `test-malicious/` 目录，包含：
- `SKILL.md`：含有效 frontmatter
- `exploit.js`：包含 `require("child_process").exec(...)` 等危险代码

**操作**: 重启 Gateway 或等待自动刷新 → 查看 Skills 页面

**预期结果**:
- `test-malicious` 显示为 **blocked** 状态
- 阻断原因为 `dangerous-exec`（检测到危险的命令执行）
- 此 skill 无法被启用或使用

---

### D-2: 无恶意代码的 Sideload Skill 通过扫描

**准备**: 在 `~/.openclaw-dev/skills/` 下创建 `test-safe/` 目录，包含：
- `SKILL.md`：含有效 frontmatter 和正常内容

**操作**: 重启 Gateway 或等待自动刷新 → 查看 Skills 页面

**预期结果**:
- `test-safe` 显示为 **Ready** 状态
- 通过侧载静态扫描（`sideload_pass`）
- 可以正常使用

---

### D-3: 对话中使用恶意 Skill 被拦截

**操作**: 在 Chat 页面输入：

```
请使用 test-malicious skill
```

**预期结果**:
- Agent 不会使用 `test-malicious` skill（因为它已被 Guard 阻断）
- Agent 可能会提示该 skill 不可用
- 或 Agent 会忽略该 skill，使用其他可用 skill

---

### D-4: 对话中正常使用安全 Skill

**操作**: 在 Chat 页面输入：

```
请使用 test-safe skill
```

**预期结果**:
- 如果 `test-safe` 的 description 匹配用户意图，Agent 会正常使用
- skill 功能正常执行
- 无安全警告

---

## E. SHA256 篡改检测

### E-1: 篡改已安装 Skill 的文件

**准备**: 
1. 确保 `ascii-diagram-creator` 已安装
2. 手动修改 `~/.openclaw-dev/skills/ascii-diagram-creator/SKILL.md`，在末尾添加任意内容

**操作**: 重启 Gateway → 查看 Skills 页面

**预期结果**:
- 如果 skill 是以原始名称安装的（非 `store.` 前缀），Guard 会检测到 SHA256 不匹配
- skill 状态可能显示为 blocked 或 hash-mismatch

---

### E-2: 通过商店重新安装修复篡改

**操作**: 在 Chat 页面输入：

```
帮我重新安装 ascii-diagram-creator
```

**预期结果**:
- 强制重新安装
- 从云端下载原始文件
- SHA256 验证通过
- 安装成功，skill 恢复正常

---

### E-3: 对话中请求校验 Skill

**操作**: 在 Chat 页面输入：

```
帮我检查已安装 skill 的完整性
```

**预期结果**:
- Agent 可能使用 `openclaw skills check` 或 `store-cli.py` 的相关功能
- 显示所有已安装 skill 的状态
- 标注任何完整性异常

---

## F. Skill 更新与删除

### F-1: 更新已安装的 Skill

**操作**: 在 Chat 页面输入：

```
帮我更新 ascii-diagram-creator
```

**预期结果**:
- Agent 使用 `store-cli.py update ascii-diagram-creator`
- 重新从云端下载并 SHA256 验证
- 显示 "verified ✓"
- 更新成功

---

### F-2: 更新所有已安装 Skill

**操作**: 在 Chat 页面输入：

```
更新所有已安装的 skill
```

**预期结果**:
- Agent 使用 `store-cli.py update --all`
- 逐个更新所有已安装 skill
- 每个 skill 都经过 SHA256 验证

---

### F-3: 删除已安装的 Skill

**操作**: 在 Chat 页面输入：

```
帮我删除 ascii-diagram-creator
```

**预期结果**:
- Agent 使用 `store-cli.py remove ascii-diagram-creator`
- 显示 "Removed" 确认
- skill 从 managed 目录移除

---

### F-4: 删除后 Skills 页面不再显示

**操作**: 删除 skill 后 → 刷新 Skills 页面

**预期结果**:
- `ascii-diagram-creator` 不再出现在 Skills 列表中
- 或显示为未安装状态

---

## G. Agent 语义匹配验证

### G-1: "安装" 意图匹配 skill-store

**操作**: 在 Chat 页面输入：

```
安装 e2e-tests
```

**预期结果**:
- Agent **使用 `skill-store`** 执行安装
- **不会**尝试 `openclaw` CLI 或 `clawhub`
- 输出 SHA256 验证结果

---

### G-2: "查找" 意图匹配 skill-store

**操作**: 在 Chat 页面输入：

```
帮我找一下有没有关于 testing 的 skill
```

**预期结果**:
- Agent 使用 `skill-store` 的 `search` 命令
- 返回匹配 "testing" 的 skill 列表

---

### G-3: 中文 "下载" 意图匹配

**操作**: 在 Chat 页面输入：

```
下载 architecture skill
```

**预期结果**:
- Agent 理解 "下载" 等于 "安装"
- 使用 `skill-store` 的 `install` 命令

---

### G-4: "有哪些 skill" 意图匹配

**操作**: 在 Chat 页面输入：

```
商店里有哪些 skill 可以用？
```

**预期结果**:
- Agent 使用 `skill-store` 的 `list` 命令
- 显示完整的 skill 目录

---

### G-5: "更新" 意图匹配

**操作**: 在 Chat 页面输入：

```
帮我更新所有 skill 到最新版本
```

**预期结果**:
- Agent 使用 `skill-store` 的 `update --all` 命令

---

### G-6: 英文意图匹配

**操作**: 在 Chat 页面输入：

```
Install the skill called analyze-web from the store
```

**预期结果**:
- Agent 使用 `skill-store` 的 `install analyze-web` 命令
- SHA256 验证通过
- 安装成功

---

## H. 审计日志验证

> 审计日志位于 `~/.openclaw-dev/security/skill-guard/audit.jsonl`

### H-1: 验证 config_sync 事件

**操作**: 在 Chat 页面输入：

```
查看 skill-guard 的审计日志
```

或直接检查审计日志文件。

**预期结果**:
- 日志中包含 `config_sync` 事件
- 记录了 manifest 同步时间和 store URL

---

### H-2: 验证 blocked 事件

**操作**: 检查审计日志中的 `blocked` 事件

**预期结果**:
- 对于 blocklist 中的 skill（如 `evil-skill`），记录 `event: "blocked"`, `reason: "blocklisted"`
- 对于含恶意代码的 skill，记录 `event: "blocked"`, `reason` 含 `"dangerous-exec"`

---

### H-3: 验证 sideload_pass 事件

**操作**: 检查审计日志中的 `sideload_pass` 事件

**预期结果**:
- 对于安全的 managed/sideload skill，记录 `event: "sideload_pass"`
- 包含 skill 名称和通过扫描的时间

---

### H-4: 验证完整事件类型覆盖

**操作**: 检查审计日志包含的所有事件类型

**预期结果**:
- 至少包含以下事件类型：
  - `config_sync`：manifest 同步
  - `sideload_pass`：侧载扫描通过
  - `blocked`：skill 被阻断
  - `not_in_store`：skill 不在商店中（如第三方 skill）
  - `load_pass`（可选）：商店 skill hash 验证通过

---

## 测试结果记录表

| 用例 ID | 用例名称 | 通过/失败 | 备注 |
|---|---|---|---|
| A-1 | 查看 Skill 列表 | ☐ | |
| A-2 | 查看 skill-store 详情 | ☐ | |
| A-3 | 查看 Blocklist Skill 被阻断 | ☐ | |
| A-4 | Disable/Enable 后 Guard 持续生效 | ☐ | |
| A-5 | Skills 页面不包含恶意 skill | ☐ | |
| A-6 | 刷新页面后 Guard 状态持续 | ☐ | |
| B-1 | 通过对话搜索 Skill | ☐ | |
| B-2 | 通过对话列出所有商店 Skill | ☐ | |
| B-3 | 通过对话安装 Skill | ☐ | |
| B-4 | 安装后在 Skills 页面可见 | ☐ | |
| B-5 | 重复安装提示已存在 | ☐ | |
| B-6 | 强制重新安装 | ☐ | |
| B-7 | 查看 Skill 详情 | ☐ | |
| B-8 | 同步商店清单 | ☐ | |
| C-1 | 尝试安装 Blocklist Skill | ☐ | |
| C-2 | 尝试安装另一个 Blocklist Skill | ☐ | |
| C-3 | 搜索不显示 Blocklist Skill | ☐ | |
| C-4 | Blocklist Skill 在列表中标注 | ☐ | |
| D-1 | 恶意代码 Skill 被静态扫描阻断 | ☐ | |
| D-2 | 无恶意代码的 Sideload Skill 通过扫描 | ☐ | |
| D-3 | 对话中使用恶意 Skill 被拦截 | ☐ | |
| D-4 | 对话中正常使用安全 Skill | ☐ | |
| E-1 | 篡改已安装 Skill 的文件 | ☐ | |
| E-2 | 通过商店重新安装修复篡改 | ☐ | |
| E-3 | 对话中请求校验 Skill | ☐ | |
| F-1 | 更新已安装的 Skill | ☐ | |
| F-2 | 更新所有已安装 Skill | ☐ | |
| F-3 | 删除已安装的 Skill | ☐ | |
| F-4 | 删除后 Skills 页面不再显示 | ☐ | |
| G-1 | "安装" 意图匹配 skill-store | ☐ | |
| G-2 | "查找" 意图匹配 skill-store | ☐ | |
| G-3 | 中文 "下载" 意图匹配 | ☐ | |
| G-4 | "有哪些 skill" 意图匹配 | ☐ | |
| G-5 | "更新" 意图匹配 | ☐ | |
| G-6 | 英文意图匹配 | ☐ | |
| H-1 | 验证 config_sync 事件 | ☐ | |
| H-2 | 验证 blocked 事件 | ☐ | |
| H-3 | 验证 sideload_pass 事件 | ☐ | |
| H-4 | 验证完整事件类型覆盖 | ☐ | |

---

## 已知注意事项

1. **Guard 评估延迟**：Gateway 启动后 skill-guard 的评估可能在首次 `skills.status` 请求时才触发，通常在客户端（Web UI）连接后的 10-60 秒内完成。
2. **Disable/Enable 边界**：之前发现过 disable → enable 操作可能绕过 Guard 的阻断检查（已修复，需重点回归测试 A-4）。
3. **评估时间**：当商店 skill 数量较大（>100）时，评估时间会显著增加。目前商店控制在 ~50 个 skill，评估应在 30 秒内完成。
4. **前端刷新频率**：Web UI 的 Control UI 会周期性发送 `skills.status` 请求，间隔约 5-10 秒。Guard 阻断状态在每次刷新后都会重新验证。
5. **Frontmatter 注入**：部分商店 skill 安装时需要注入 frontmatter，会以 `store.` 前缀安装（如 `store.architecture`），以避免 Guard 的 hash 重新校验。

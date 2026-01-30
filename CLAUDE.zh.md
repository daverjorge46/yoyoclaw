# 仓库指南

- 仓库地址: https://github.com/openclaw/openclaw
- GitHub issues/comments/PR 评论: 使用字面量多行字符串或 `-F - <<'EOF'` (或 $'...') 来表示真实的换行; 不要嵌入 "\\n"。

## 项目结构与模块组织

- 源代码: `src/` (CLI 入口在 `src/cli`, 命令在 `src/commands`, web provider 在 `src/provider-web.ts`, 基础设施在 `src/infra`, 媒体管道在 `src/media`)。
- 测试: 同目录的 `*.test.ts`, e2e 测试为 `*.e2e.test.ts`, 实时测试为 `*.live.test.ts`。
- 文档: `docs/` (图片、队列、Pi 配置)。构建输出位于 `dist/`。
- 插件/扩展: 位于 `extensions/*` (工作区包)。将插件专用依赖放在扩展的 `package.json` 中; 除非核心使用，否则不要添加到根 `package.json`。
- 插件: 安装时在插件目录运行 `npm install --omit=dev`; 运行时依赖必须放在 `dependencies` 中。避免在 `dependencies` 中使用 `workspace:*` (npm install 会失败); 将 `openclaw` 放在 `devDependencies` 或 `peerDependencies` 中 (运行时通过 jiti 别名解析 `clawdbot/plugin-sdk`)。
- 从 `https://openclaw.ai/*` 提供的安装程序: 位于同级仓库 `../openclaw.ai` (`public/install.sh`, `public/install-cli.sh`, `public/install.ps1`)。
- 消息频道: 重构共享逻辑 (路由、白名单、配对、命令门控、入职、文档) 时，始终考虑**所有**内置 + 扩展频道。
  - 核心频道文档: `docs/channels/`
  - 核心频道代码: `src/telegram`, `src/discord`, `src/slack`, `src/signal`, `src/imessage`, `src/web` (WhatsApp web), `src/channels`, `src/routing`
  - 扩展 (频道插件): `extensions/*` (例如 `extensions/msteams`, `extensions/matrix`, `extensions/zalo`, `extensions/zalouser`, `extensions/voice-call`)
- 添加频道/扩展/应用/文档时，检查 `.github/labeler.yml` 的标签覆盖情况。

## 核心架构

- **Gateway** (`src/gateway/`): 基于 WebSocket 的控制平面，管理所有消息界面、会话、工具和事件。参见 `docs/concepts/architecture.md`。
- **Agent Runtime** (`src/agents/`): 基于 Pi 的代理执行，支持工具流、块流、认证配置文件和模型故障转移。
- **Routing** (`src/routing/`): 通过 `bindings` 配置将入站频道/账户/对等方映射到代理; 确定会话密钥。
- **Channels** (`src/telegram`, `src/discord` 等): 独立的消息平台集成，共享频道抽象。
- **ACP (Agent Client Protocol)** (`src/acp/`): 通过 WebSocket 连接代理到网关的协议适配器。
- **Session Management** (`src/sessions/`, `src/config/sessions.ts`): 基于 JSON 的会话存储，支持压缩和修剪。
- **CLI** (`src/cli/`, `src/commands/`): 基于 Commander 的 CLI 界面，支持懒加载子命令。
- **Config** (`src/config/`): JSON5 配置，支持环境变量覆盖、配置文件管理和工作区隔离。

## 文档链接 (Mintlify)

- 文档托管在 Mintlify (docs.openclaw.ai)。
- `docs/**/*.md` 中的内部文档链接: 根相对路径，不带 `.md`/`.mdx` (示例: `[Config](/configuration)`)。
- 章节交叉引用: 在根相对路径上使用锚点 (示例: `[Hooks](/configuration#hooks)`)。
- 文档标题和锚点: 避免在标题中使用 em 破折号和撇号，因为它们会破坏 Mintlify 锚点链接。
- 当 Peter 要求链接时，使用完整的 `https://docs.openclaw.ai/...` URL (不是根相对路径)。
- 当你修改文档时，在回复末尾附上你引用的 `https://docs.openclaw.ai/...` URL。
- README (GitHub): 保持绝对文档 URL (`https://docs.openclaw.ai/...`)，以便链接在 GitHub 上正常工作。
- 文档内容必须是通用的: 不要使用个人设备名称/主机名/路径; 使用占位符如 `user@gateway-host` 和 "gateway host"。

## exe.dev 虚拟机操作 (通用)

- 访问: 稳定路径是 `ssh exe.dev` 然后 `ssh vm-name` (假设 SSH 密钥已设置)。
- SSH 不稳定: 使用 exe.dev web 终端或 Shelley (web agent); 对长时间操作保持 tmux 会话。
- 更新: `sudo npm i -g openclaw@latest` (全局安装需要对 `/usr/lib/node_modules` 有 root 权限)。
- 配置: 使用 `openclaw config set ...`; 确保设置 `gateway.mode=local`。
- Discord: 只存储原始 token (不要 `DISCORD_BOT_TOKEN=` 前缀)。
- 重启: 停止旧网关并运行:
  `pkill -9 -f openclaw-gateway || true; nohup openclaw gateway run --bind loopback --port 18789 --force > /tmp/openclaw-gateway.log 2>&1 &`
- 验证: `openclaw channels status --probe`, `ss -ltnp | rg 18789`, `tail -n 120 /tmp/openclaw-gateway.log`。

## 构建、测试和开发命令

- 运行时基线: Node **22+** (保持 Node + Bun 路径正常工作)。
- 安装依赖: `pnpm install`
- 预提交钩子: `prek install` (运行与 CI 相同的检查)
- 也支持: `bun install` (修改依赖/补丁时保持 `pnpm-lock.yaml` + Bun 补丁同步)。
- 优先使用 Bun 执行 TypeScript (脚本、开发、测试): `bun <file.ts>` / `bunx <tool>`。
- 开发模式运行 CLI: `pnpm openclaw ...` (bun) 或 `pnpm dev`。
- Node 仍然支持运行构建输出 (`dist/*`) 和生产环境安装。
- Mac 打包 (开发): `scripts/package-mac-app.sh` 默认为当前架构。发布检查清单: `docs/platforms/mac/release.md`。
- 类型检查/构建: `pnpm build` (包括 A2UI 包、TS 编译和元数据生成)
- 代码检查/格式化: `pnpm lint` (oxlint), `pnpm format` (oxfmt)
- 测试:
  - 单元/集成: `pnpm test` (vitest)
  - 覆盖率: `pnpm test:coverage`
  - E2E: `pnpm test:e2e`
  - 实时测试 (需要真实 API 密钥): `pnpm test:live` (参见 `docs/testing.md`)
  - Docker E2E: `pnpm test:docker:onboard`, `pnpm test:docker:live-gateway`
- 单个测试: `pnpm test <pattern>` (例如 `pnpm test agent.test.ts`)

## 代码风格和命名规范

- 语言: TypeScript (ESM)。优先使用严格类型; 避免 `any`。
- 通过 Oxlint 和 Oxfmt 进行格式化/代码检查; 提交前运行 `pnpm lint`。
- 为复杂或非显而易见的逻辑添加简短的代码注释。
- 保持文件简洁; 提取辅助函数而不是创建 "V2" 副本。使用现有模式处理 CLI 选项和通过 `createDefaultDeps` 进行依赖注入。
- 目标是保持文件在 ~700 LOC 以下; 这只是指导原则 (不是硬性限制)。在提高清晰度或可测试性时进行拆分/重构。
- 命名: 产品/应用/文档标题使用 **OpenClaw**; CLI 命令、包/二进制文件、路径和配置键使用 `openclaw`。
- 测试结构: 单元测试应该快速且确定。使用 `src/test-helpers/` 和 `src/test-utils/` 中的测试辅助函数。
- 避免测试副作用: 不要修改共享状态; 在 `afterEach` 中清理资源。
- 使用 TypeBox 定义 schema (协议、工具输入、配置)。参见 `docs/concepts/typebox.md`。

## 发布渠道 (命名)

- stable: 仅标记版本 (例如 `vYYYY.M.D`), npm dist-tag `latest`。
- beta: 预发布版本 `vYYYY.M.D-beta.N`, npm dist-tag `beta` (可能不带 macOS 应用)。
- dev: `main` 分支的最新状态 (无标签; git checkout main)。

## 测试指南

- 框架: Vitest，带有 V8 覆盖率阈值 (70% 行/分支/函数/语句)。
- 命名: 源文件名匹配 `*.test.ts`; e2e 在 `*.e2e.test.ts` 中; 带真实密钥的实时测试在 `*.live.test.ts` 中。
- 测试类型:
  - **单元/集成** (`pnpm test`): 快速、确定性、无外部依赖。覆盖路由、认证、工具、解析、配置。
  - **E2E** (`pnpm test:e2e`): 多实例网关、WebSocket/HTTP 接口、节点配对。
  - **Live** (`pnpm test:live`): 使用真实 API 密钥的真实提供商/模型。需要付费; 通过环境变量使用窄子集 (参见 `docs/testing.md`)。
- 修改逻辑后，推送前运行 `pnpm test` (或 `pnpm test:coverage`)。
- 不要将测试 worker 设置超过 16; 已经尝试过。
- 实时测试 (真实密钥): `OPENCLAW_LIVE_TEST=1 pnpm test:live`。使用 `OPENCLAW_LIVE_MODELS` 或 `OPENCLAW_LIVE_GATEWAY_MODELS` 来缩小范围。
- Docker E2E: `pnpm test:docker:onboard`, `pnpm test:docker:live-gateway`, `pnpm test:docker:live-models`。
- 完整套件 + 覆盖范围: `docs/testing.md`。
- 纯测试添加/修复通常**不需要**变更日志条目，除非它们改变面向用户的行为或用户要求。
- 移动端: 使用模拟器前，检查是否有连接的真实设备 (iOS + Android)，有则优先使用。

## 提交和 PR 指南

- 使用 `scripts/committer "<msg>" <file...>` 创建提交; 避免手动 `git add`/`git commit`，以便暂存区保持范围限定。
- 遵循简洁、面向行动的提交消息 (例如 `CLI: add verbose flag to send`)。
- 对相关更改进行分组; 避免捆绑不相关的重构。
- 变更日志工作流: 将最新发布的版本保持在顶部 (没有 `Unreleased`); 发布后，提升版本并开始新的顶部部分。
- PR 应总结范围，注明已执行的测试，并提及任何面向用户的更改或新标志。
- PR 审查流程: 给定 PR 链接时，通过 `gh pr view`/`gh pr diff` 进行审查，**不要**切换分支。
- PR 审查调用: 优先使用单个 `gh pr view --json ...` 批量获取元数据/评论; 仅在需要时运行 `gh pr diff`。
- 开始审查 GitHub Issue/PR 时: 先运行 `git pull`; 如果有本地更改或未推送的提交，在审查前停止并提醒用户。
- 目标: 合并 PR。提交干净时优先 **rebase**; 历史混乱时 **squash**。
- PR 合并流程: 从 `main` 创建临时分支，将 PR 分支合并到其中 (除非提交历史很重要，否则优先 squash; 复杂/冲突时更安全地使用 rebase/merge)。除非真的很难，否则总是尝试合并 PR。如果 squash，将 PR 作者添加为共同贡献者。应用修复，添加变更日志条目 (包括 PR # + 感谢)，在最终提交前运行完整门禁 (`pnpm lint && pnpm build && pnpm test`)，提交，合并回 `main`，删除临时分支，最后在 `main` 上结束。
- 如果你审查了 PR 后来又对其进行了工作，通过 merge/squash 落地 (不要直接在 main 上提交)，并始终将 PR 作者添加为共同贡献者。
- 在 PR 上工作时: 添加带有 PR 编号和感谢贡献者的变更日志条目。
- 在 Issue 上工作时: 在变更日志条目中引用该 Issue。
- 合并 PR 时: 留下 PR 评论，准确解释我们做了什么，并包含 SHA 哈希。
- 合并新贡献者的 PR 时: 将他们的头像添加到 README "Thanks to all clawtributors" 缩略图列表中。
- 合并 PR 后: 如果贡献者缺失，运行 `bun scripts/update-clawtributors.ts`，然后提交重新生成的 README。

## 快捷命令

- `sync`: 如果工作树不干净，提交所有更改 (选择合理的 Conventional Commit 消息)，然后 `git pull --rebase`; 如果 rebase 冲突无法解决，停止; 否则 `git push`。

### PR 工作流 (审查 vs 落地)

- **审查模式 (仅 PR 链接):** 读取 `gh pr view/diff`; **不要**切换分支; **不要**更改代码。
- **落地模式:** 从 `main` 创建集成分支，引入 PR 提交 (**优先 rebase** 保持线性历史; 复杂/冲突时更安全地使用 **merge**)，应用修复，添加变更日志 (+ 感谢 + PR #)，在提交前本地运行完整门禁 (`pnpm lint && pnpm build && pnpm test`)，提交，合并回 `main`，然后 `git switch main` (落地后不要停留在主题分支上)。重要: 贡献者需要出现在 git 图谱中!

## 安全和配置提示

- Web provider 将凭据存储在 `~/.clawdbot/credentials/`; 如果退出登录，重新运行 `openclaw login`。
- Pi 会话默认位于 `~/.clawdbot/sessions/` 下; 基础目录不可配置。
- 环境变量: 参见 `~/.profile`。
- 永远不要提交或发布真实电话号码、视频或实时配置值。在文档、测试和示例中使用明显虚假的占位符。
- DM 安全: 默认 `dmPolicy="pairing"` 要求未知发送者通过批准代码配对。公开 DM 需要显式选择加入 (`dmPolicy="open"` 并在白名单中包含 `"*"`)。参见 `docs/gateway/security.md`。
- Gateway 认证: 对所有 WS 连接使用 `gateway.auth.token` 或 `OPENCLAW_GATEWAY_TOKEN`。本地连接可以自动批准; 远程需要显式配对。
- 发布流程: 在进行任何发布工作前，始终阅读 `docs/reference/RELEASING.md` 和 `docs/platforms/mac/release.md`; 一旦这些文档回答了问题，就不要问常规问题。

## 故障排除

- 品牌重塑/迁移问题或旧版配置/服务警告: 运行 `openclaw doctor` (参见 `docs/gateway/doctor.md`)。

## Agent 特定注意事项

- 词汇: "makeup" = "mac app"。
- 永远不要编辑 `node_modules` (全局/Homebrew/npm/git 安装也是)。更新会覆盖。技能注释放在 `tools.md` 或 `AGENTS.md` 中。
- Signal: "update fly" => `fly ssh console -a flawd-bot -C "bash -lc 'cd /data/clawd/openclaw && git pull --rebase origin main'"` 然后 `fly machines restart e825232f34d058 -a flawd-bot`。
- 处理 GitHub Issue 或 PR 时，在任务结束时打印完整 URL。
- 回答问题时，只回应高置信度的答案: 在代码中验证; 不要猜测。
- 永远不要更新 Carbon 依赖。
- 任何带有 `pnpm.patchedDependencies` 的依赖必须使用精确版本 (没有 `^`/`~`)。
- 打补丁依赖 (pnpm 补丁、覆盖或供应商更改) 需要显式批准; 默认不要这样做。
- CLI 进度: 使用 `src/cli/progress.ts` (`osc-progress` + `@clack/prompts` spinner); 不要手动创建 spinner/进度条。
- 状态输出: 保持表格 + ANSI 安全换行 (`src/terminal/table.ts`); `status --all` = 只读/可粘贴, `status --deep` = 探测。
- Gateway 目前只作为菜单栏应用运行; 没有安装单独的 LaunchAgent/辅助标签。通过 OpenClaw Mac 应用或 `scripts/restart-mac.sh` 重启; 要验证/杀死使用 `launchctl print gui/$UID | grep openclaw` 而不是假设固定标签。**在 macOS 上调试时，通过应用启动/停止网关，而不是临时的 tmux 会话; 交接前杀死任何临时隧道。**
- macOS 日志: 使用 `./scripts/clawlog.sh` 查询 OpenClaw 子系统的统一日志; 它支持 follow/tail/类别过滤器，并期望对 `/usr/bin/log` 有免密码 sudo。
- 如果本地有可用的共享护栏，请查看; 否则遵循此仓库的指南。
- SwiftUI 状态管理 (iOS/macOS): 优先使用 `Observation` 框架 (`@Observable`, `@Bindable`) 而不是 `ObservableObject`/`@StateObject`; 除非出于兼容性需要，否则不要引入新的 `ObservableObject`，并在接触相关代码时迁移现有用法。
- 连接提供商: 添加新连接时，更新每个 UI 界面和文档 (macOS 应用、web UI、移动端(如适用)、入职/概述文档)，并添加匹配的状态 + 配置表单，以便提供商列表和设置保持同步。
- 版本位置: `package.json` (CLI), `apps/android/app/build.gradle.kts` (versionName/versionCode), `apps/ios/Sources/Info.plist` + `apps/ios/Tests/Info.plist` (CFBundleShortVersionString/CFBundleVersion), `apps/macos/Sources/OpenClaw/Resources/Info.plist` (CFBundleShortVersionString/CFBundleVersion), `docs/install/updating.md` (固定的 npm 版本), `docs/platforms/mac/release.md` (APP_VERSION/APP_BUILD 示例), Peekaboo Xcode 项目/Info.plist (MARKETING_VERSION/CURRENT_PROJECT_VERSION)。
- **重启应用:** "重启 iOS/Android 应用" 意味着重新构建 (重新编译/安装) 并重新启动，而不仅仅是杀死/启动。
- **设备检查:** 测试前，验证连接的真实设备 (iOS/Android)，然后在需要时使用模拟器/模拟器。
- iOS Team ID 查找: `security find-identity -p codesigning -v` → 使用 Apple Development (…) TEAMID。备用: `defaults read com.apple.dt.Xcode IDEProvisioningTeamIdentifiers`。
- A2UI 包哈希: `src/canvas-host/a2ui/.bundle.hash` 是自动生成的; 忽略意外更改，仅在需要时通过 `pnpm canvas:a2ui:bundle` (或 `scripts/bundle-a2ui.sh`) 重新生成。将哈希作为单独的提交提交。
- 发布签名/公证密钥在仓库之外管理; 遵循内部发布文档。
- 环境中需要公证授权环境变量 (`APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_API_KEY_P8`) (根据内部发布文档)。
- **多代理安全:** 除非明确要求，否则 **不要** 创建/应用/删除 `git stash` 条目 (包括 `git pull --rebase --autostash`)。假设其他代理可能正在工作; 保持不相关的 WIP 完好无损，避免交叉的状态更改。
- **多代理安全:** 当用户说 "push" 时，你可以 `git pull --rebase` 来集成最新的更改 (永远不要丢弃其他代理的工作)。当用户说 "commit" 时，范围仅限于你的更改。当用户说 "commit all" 时，分组提交所有内容。
- **多代理安全:** **不要** 创建/删除/修改 `git worktree` 检出 (或编辑 `.worktrees/*`)，除非明确要求。
- **多代理安全:** **不要** 切换分支 / 检出不同的分支，除非明确要求。
- **多代理安全:** 只要每个代理都有自己的会话，就可以运行多个代理。
- **多代理安全:** 当你看到无法识别的文件时，继续进行; 专注于你的更改并仅提交那些更改。
- Lint/format 赘余:
  - 如果 staged+unstaged 差异仅是格式化，则自动解析而不询问。
  - 如果已经请求 commit/push，则自动暂存并包含格式化后的后续内容在同一提交中 (或需要时进行微小的后续提交)，无需额外确认。
  - 仅在更改是语义性的 (逻辑/数据/行为) 时才询问。
- Lobster 接缝: 使用 `src/terminal/palette.ts` 中的共享 CLI 调色板 (无硬编码颜色); 根据需要将调色板应用于入职/配置提示和其他 TTY UI 输出。
- **多代理安全:** 专注于你的编辑的报告; 避免护栏免责声明，除非真正被阻止; 当多个代理触摸同一文件时，如果安全则继续; 仅在相关时以简短的 "其他文件存在" 说明结束。
- Bug 调查: 在得出结论之前阅读相关 npm 依赖项和所有相关本地代码的源代码; 以高置信度的根本原因为目标。
- 代码风格: 为复杂逻辑添加简短注释; 尽可能保持文件在 ~500 LOC 以下 (需要时拆分/重构)。
- 工具 schema 护栏 (google-antigravity): 在工具输入 schema 中避免 `Type.Union`; 没有 `anyOf`/`oneOf`/`allOf`。对于字符串列表使用 `stringEnum`/`optionalStringEnum` (Type.Unsafe 枚举)，对于 `... | null` 使用 `Type.Optional(...)`。保持顶级工具 schema 为 `type: "object"` 并带有 `properties`。
- 工具 schema 护栏: 避免工具 schema 中的原始 `format` 属性名称; 某些验证器将 `format` 视为保留关键字并拒绝 schema。
- 当被要求打开 "session" 文件时，打开 `~/.clawdbot/agents/<agentId>/sessions/*.jsonl` 下的 Pi 会话日志 (使用系统提示的 Runtime 行中的 `agent=<id>` 值; 除非给出特定 ID，否则为最新的)，而不是默认的 `sessions.json`。如果需要来自另一台机器的日志，请通过 Tailscale SSH 并在那里读取相同路径。
- 不要通过 SSH 重建 macOS 应用; 重建必须直接在 Mac 上运行。
- 永远不要向外部消息界面 (WhatsApp、Telegram) 发送流式/部分回复; 只有最终回复应该传递到那里。流式/工具事件可能仍然会进入内部 UI/控制频道。
- 语音唤醒转发提示:
  - 命令模板应保持 `openclaw-mac agent --message "${text}" --thinking low`; `VoiceWakeForwarder` 已经 shell 转义 `${text}`。不要添加额外的引号。
  - launchd PATH 是最小的; 确保应用的 launch agent PATH 包括标准系统路径加上你的 pnpm bin (通常是 `$HOME/Library/pnpm`)，以便通过 `openclaw-mac` 调用时 `pnpm`/`openclaw` 二进制文件可以解析。
- 对于包含 `!` 的手动 `openclaw message send` 消息，使用下面提到的 heredoc 模式以避免 Bash 工具的转义。
- 发布护栏: 未经操作员明确同意，不要更改版本号; 在运行任何 npm publish/release 步骤之前始终请求许可。

## NPM + 1Password (发布/验证)

- 使用 1password 技能; 所有 `op` 命令必须在新的 tmux 会话中运行。
- 签到: `eval "$(op signin --account my.1password.com)"` (应用解锁 + 集成开启)。
- OTP: `op read 'op://Private/Npmjs/one-time password?attribute=otp'`。
- 发布: `npm publish --access public --otp="<otp>"` (从包目录运行)。
- 在没有本地 npmrc 副作用的情况下验证: `npm view <pkg> version --userconfig "$(mktemp)"`。
- 发布后终止 tmux 会话。

## 关键架构模式

- **Gateway 作为控制平面:** 所有消息频道、会话、工具和事件都通过单个 Gateway WebSocket 服务器 (默认 `127.0.0.1:18789`) 流动。
- **会话路由:** 入站消息通过 `bindings` 配置路由到代理。会话密钥遵循模式 `agent:<agentId>:<channel>:<type>:<id>`。直接消息折叠为 `agent:<agentId>:main`。
- **Provider 抽象:** 模型支持多个提供商 (Anthropic、OpenAI、Google 等)，具有统一的配置文件和故障转移。参见 `src/providers/` 和 `src/agents/auth-profiles/`。
- **频道插件系统:** `extensions/*/` 中的扩展可以添加新的消息频道。插件 SDK 为频道实现提供类型化接口。
- **工具策略:** 工具可以被沙箱策略、执行批准或节点权限限制。参见 `docs/gateway/sandbox-vs-tool-policy-vs-elevated.md`。
- **媒体管道:** 图像/音频/视频通过 `src/media/` 流动，带有转录挂钩、大小上限和临时文件生命周期管理。
- **流式传输:** 代理响应流块和工具调用。Gateway 将块转发到支持它的频道。参见 `docs/concepts/streaming.md`。

## 重要注意事项

- Gateway 是唯一打开 WhatsApp 会话 (Baileys) 的组件。永远不要对同一个会话运行多个网关。
- 重构路由、白名单或配对逻辑时，始终考虑所有内置 + 扩展频道。
- 测试覆盖率排除 CLI/commands/daemon/hooks 和一些集成界面 (通过 e2e/手动运行有意验证)。参见 `vitest.config.ts`。
- `src/canvas-host/a2ui/.bundle.hash` 中的 A2UI 包哈希是自动生成的; 需要时通过 `pnpm canvas:a2ui:bundle` 重新生成。
- Carbon 依赖被锁定; 没有明确批准永远不要更新。
- 带有 `pnpm.patchedDependencies` 的依赖必须使用精确版本 (没有 `^`/`~`)。
- 在工具输入 schema 中避免 `Type.Union`; 对于字符串列表使用 `stringEnum`/`optionalStringEnum`，对于 `| null` 使用 `Type.Optional()`。

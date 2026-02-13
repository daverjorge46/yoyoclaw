# Windows-Only 分支重构状态

## 已完成的工作

### 1. 核心基础设施模块 (✅ 完成)
- `src/infra/tmp-opencl-dir.ts`: Windows-only, 使用 `%TEMP%/openclaw`
- `src/infra/ssh-tunnel.ts`: Windows OpenSSH only
- `src/infra/shell-env.ts`: PowerShell 环境变量加载
- `src/infra/path-env.ts`: Windows PATH 管理
- `src/infra/restart.ts`: 移除 systemd/launchd 支持

### 2. Windows 平台层 (✅ 完成)
- `src/platform/windows/paths.ts`: Windows 路径处理
- `src/platform/windows/ssh.ts`: Windows SSH 支持
- `src/platform/windows/shell-env.ts`: PowerShell 集成
- `src/platform/windows/paths-and-env.ts`: Windows PATH 和工具
- `src/platform/windows/index.ts`: 统一导出

### 3. Windows 服务管理 (✅ 完成)
- `src/daemon/service.ts`: 只保留 Windows Task Scheduler
- `src/daemon/service-windows.ts`: Windows 服务实现
- `src/daemon/windows-hints.ts`: Windows 服务提示

### 4. 删除的 Unix/Linux 文件
- `src/daemon/launchd.ts` - macOS LaunchAgent
- `src/daemon/systemd.ts` - Linux systemd 服务
- `src/infra/wsl.ts` - WSL 支持
- `src/infra/brew.ts` - Homebrew 支持
- `src/commands/systemd-linger.ts` - systemd linger
- `src/daemon/launchd-plist.ts` - macOS plist
- `src/daemon/systemd-hints.ts` - systemd 提示
- `src/commands/oauth-env.ts` - OAuth 环境检查
- `src/cli/node-cli/daemon.ts` - Linux 节点服务
- `src/cli/daemon-cli/status.print.ts` - Linux 状态打印

### 5. 测试文件 (✅ 完成)
- ✅ Windows 平台测试: 50 个测试全部通过
- ✅ 更新了所有 Windows 特定的测试

## 当前状态

### 构建状态
- ❌ **构建失败** - 仍有一些文件有编译错误
  - `doctor-gateway-daemon.ts` - 有语法错误（清理时引入）
  - `onboard-non-interactive/local/daemon-install.ts` - 引用错误

### 待完成的工作

### 高优先级（必须修复）
1. **修复 `doctor-gateway-daemon.ts` 的语法错误**
2. **修复 `onboard-non-interactive/local/daemon-install.ts`**
3. **修复其他引用已删除模块的文件**
4. **确保项目可以成功构建**

### 中优先级（需要完成）
5. **移除所有平台检查代码**
   - `if (process.platform === 'win32')` 的 else 分支
   - `if (process.platform !== 'win32')`` 的代码路径
   - 只保留 win32 逻辑

6. **硬编码 Windows 路径**
   - `/tmp/` → `os.tmpdir()` 或 `%TEMP%`
   - `/usr/bin/ssh` → Windows OpenSSH path
   - `/home/` → `process.env.USERPROFILE` 或 `os.homedir()`
   - `/bin/sh` → `cmd.exe` 或 `powershell.exe`

7. **移除 Unix socket 相关代码**
   - 配置文件中删除 unixsocket、launchd 等字段
   - 移除所有 `process.platform !== "win32"` 的条件分支

### 低优先级（优化）
8. **更新文档**
   - README: 说明 Windows-only 要求
   - 更新所有 `.md` 文档
   - 移除 Linux/macOS 安装说明
   - 添加 Windows 特定说明

9. **更新 Chrome 用户数据目录**
   - 使用 Windows `--user-data-dir` 而非 `~/.config`

10. **清理所有平台检查的命令文件**
    - agents/ 中的平台相关代码
    - commands/ 中的平台检查
    - 大量 CLI 命令中的平台分支

## Windows 架构设计

### 路径规范
```
配置目录:  %USERPROFILE%\AppData\Local\openclaw
临时目录:  %TEMP%\openclaw
日志:     %TEMP%\openclaw\logs
缓存:     %USERPROFILE%\AppData\Local\openclaw\cache
工作区:    %USERPROFILE%\.openclaw\workspaces\<agent-id>
```

### 服务管理
- **Windows Task Scheduler**: 使用 `schtasks.exe` 管理 Gateway 服务
- 启动方式: Windows Task Scheduler on logon
- 任务名称: `OpenClawGateway`

### Shell 环境
- **PowerShell**: 用于环境变量加载
- 命令执行: `spawn("powershell.exe", ["-NoProfile", "-Command", <cmd>])`

### SSH 隧道
- **Windows OpenSSH**: 内置于 Windows 10+
- 路径检测: PowerShell `Get-Command ssh` 或 `where ssh`
- 选项: `ssh -N -L <localPort>:127.0.0.1:<remotePort> -p <port>`

### 浏览器
- 用户数据目录: Windows 路径
- Chrome 参数: `--user-data-dir=<path>`

## 下一步行动

1. **立即修复构建错误**
   - 修复 `doctor-gateway-daemon.ts` 语法错误
   - 修复 `daemon-install.ts` 引用错误
   - 确保项目可以构建

2. **继续移除平台检查**
   - 搜索所有 `process.platform` 引用
   - 删除所有非 Windows 代码路径
   - 更新所有条件判断

3. **更新配置文档**
   - 移除 Unix socket 配置
   - 更新默认值
   - 添加 Windows 说明

4. **测试和验证**
   - 运行所有 Windows 测试
   - 实际运行 Gateway 验证功能
   - 更新 CI/CD 配置

## 注意事项

- **不要保留 Linux 回退逻辑** - 如 try `/tmp` -> fallback，直接 Windows 实现
- **配置文件删除 Unix 特定字段** - unixsocket、launchd 等
- **Chrome 使用 Windows 路径** - `--user-data-dir` 而非 `~/.config`
- **所有路径使用 Windows 规范** - 反斜杠、驱动器号等

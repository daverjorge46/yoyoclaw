"""Bash 命令执行工具。

提供 exec 工具（命令执行）功能。
"""

import asyncio
import shlex
import subprocess
from typing import Any

from openclaw_py.agents.tools.bash_shared import (
    DEFAULT_MAX_OUTPUT_CHARS,
    DEFAULT_TIMEOUT_SECONDS,
    build_env_dict,
    resolve_workdir,
    truncate_output,
    validate_host_env,
)
from openclaw_py.agents.tools.common import error_result, read_string_param
from openclaw_py.agents.tools.types import AgentTool, ToolContext, ToolResult
from openclaw_py.logging import log_debug, log_warn


async def _execute_command(
    command: str,
    cwd: str,
    timeout: float,
    max_output: int,
    env: dict[str, str] | None = None,
    sandboxed: bool = False,
) -> ToolResult:
    """执行命令（内部函数）。

    Args:
        command: 要执行的命令
        cwd: 工作目录
        timeout: 超时（秒）
        max_output: 最大输出字符数
        env: 环境变量
        sandboxed: 是否为沙箱环境

    Returns:
        ToolResult 对象
    """
    # 构建环境变量
    exec_env = build_env_dict(extra_env=env)

    # 非沙箱环境下验证环境变量安全性
    if not sandboxed and env:
        try:
            validate_host_env(env)
        except ValueError as e:
            return error_result(str(e))

    log_debug(f"Executing command: {command[:100]}")

    try:
        # 使用 asyncio.create_subprocess_shell 执行命令
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,  # 合并 stderr 到 stdout
            cwd=cwd,
            env=exec_env,
        )

        # 等待命令完成（带超时）
        try:
            stdout_data, _ = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            # 超时，终止进程
            process.kill()
            await process.wait()
            return error_result(
                f"Command timed out after {timeout} seconds.\n\nCommand: {command}"
            )

        # 解码输出
        output = stdout_data.decode("utf-8", errors="replace")

        # 截断输出
        truncated_output, was_truncated = truncate_output(output, max_output)

        # 检查退出码
        exit_code = process.returncode or 0

        if exit_code != 0:
            result_text = f"Command exited with code {exit_code}.\n\nOutput:\n{truncated_output}"
            if was_truncated:
                result_text += f"\n\n(Output was truncated to {max_output} characters)"
            return ToolResult(content=result_text, is_error=True)

        # 成功
        result_text = truncated_output
        if was_truncated:
            result_text += f"\n\n(Output was truncated to {max_output} characters)"

        return ToolResult(content=result_text, is_error=False)

    except FileNotFoundError:
        return error_result(f"Shell not found. Cannot execute command.\n\nCommand: {command}")
    except Exception as e:
        log_warn(f"Command execution failed: {e}")
        return error_result(f"Command execution failed: {e}\n\nCommand: {command}")


async def exec_tool_execute(
    params: dict[str, Any],
    context: ToolContext | None = None,
) -> ToolResult:
    """执行 exec 工具。

    Args:
        params: 工具参数（command, timeout_seconds, max_output_chars 等）
        context: 工具上下文

    Returns:
        ToolResult 对象
    """
    # 读取参数
    try:
        command = read_string_param(params, "command", required=True)
    except ValueError as e:
        return error_result(str(e))

    # 可选参数
    timeout_seconds = params.get("timeout_seconds", DEFAULT_TIMEOUT_SECONDS)
    max_output_chars = params.get("max_output_chars", DEFAULT_MAX_OUTPUT_CHARS)

    # 从上下文获取信息
    context = context or ToolContext()
    cwd_path = resolve_workdir(context.cwd, context.sandbox_root)
    sandboxed = context.sandboxed

    # 执行命令
    return await _execute_command(
        command=command,
        cwd=str(cwd_path),
        timeout=float(timeout_seconds),
        max_output=int(max_output_chars),
        sandboxed=sandboxed,
    )


def create_exec_tool() -> AgentTool:
    """创建 exec 工具。

    Returns:
        AgentTool 对象
    """
    return AgentTool(
        name="exec",
        description="""Execute a bash command in the system shell.

Returns:
- stdout/stderr output (merged)
- exit code
- execution time

Security:
- On non-sandboxed hosts, dangerous environment variables are blocked
- Custom PATH is not allowed on host execution
- Commands run with timeout protection""",
        input_schema={
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The bash command to execute",
                },
                "timeout_seconds": {
                    "type": "number",
                    "description": f"Timeout in seconds (default: {DEFAULT_TIMEOUT_SECONDS})",
                    "default": DEFAULT_TIMEOUT_SECONDS,
                },
                "max_output_chars": {
                    "type": "number",
                    "description": f"Maximum output characters (default: {DEFAULT_MAX_OUTPUT_CHARS})",
                    "default": DEFAULT_MAX_OUTPUT_CHARS,
                },
            },
            "required": ["command"],
        },
        execute=exec_tool_execute,
    )

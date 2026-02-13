"""OpenClaw 工具集成器。

提供创建完整工具集的函数。
"""

from typing import Any

from openclaw_py.agents.tools.bash_exec import create_exec_tool
from openclaw_py.agents.tools.types import AnyAgentTool, ToolContext
from openclaw_py.agents.tools.web_fetch import create_web_fetch_tool
from openclaw_py.agents.tools.web_search import create_web_search_tool
from openclaw_py.config.types import OpenClawConfig


def create_openclaw_tools(
    *,
    config: OpenClawConfig | None = None,
    sandboxed: bool = False,
    agent_session_key: str | None = None,
    agent_channel: str | None = None,
    agent_account_id: str | None = None,
    cwd: str | None = None,
    sandbox_root: str | None = None,
) -> list[AnyAgentTool]:
    """创建 OpenClaw 工具集。

    Args:
        config: OpenClaw 配置
        sandboxed: 是否为沙箱环境
        agent_session_key: Agent 会话密钥
        agent_channel: Agent 频道
        agent_account_id: Agent 账号 ID
        cwd: 工作目录
        sandbox_root: Sandbox 根目录

    Returns:
        AnyAgentTool 列表
    """
    tools: list[AnyAgentTool] = []

    # 1. Bash 工具
    exec_tool = create_exec_tool()
    tools.append(exec_tool)

    # 2. Web 工具
    web_search_tool = create_web_search_tool()
    web_fetch_tool = create_web_fetch_tool()
    tools.append(web_search_tool)
    tools.append(web_fetch_tool)

    # 3. 其他工具（将来添加）:
    # - image_tool
    # - message_tool
    # - session_tools (list, history, send, spawn, status)
    # - agents_list_tool
    # - gateway_tool

    return tools


def create_coding_tools(
    *,
    config: OpenClawConfig | None = None,
    cwd: str | None = None,
    sandbox_root: str | None = None,
) -> list[AnyAgentTool]:
    """创建编码工具集（Bash + File 操作）。

    Args:
        config: OpenClaw 配置
        cwd: 工作目录
        sandbox_root: Sandbox 根目录

    Returns:
        AnyAgentTool 列表
    """
    # 简化版：仅包含 exec 工具
    # 完整版需要添加：read, write, edit, apply_patch 等
    return [create_exec_tool()]


def get_tool_context(
    *,
    config: OpenClawConfig | None = None,
    sandboxed: bool = False,
    cwd: str | None = None,
    sandbox_root: str | None = None,
    agent_session_key: str | None = None,
    agent_channel: str | None = None,
    agent_account_id: str | None = None,
) -> ToolContext:
    """创建工具执行上下文。

    Args:
        config: OpenClaw 配置
        sandboxed: 是否为沙箱环境
        cwd: 工作目录
        sandbox_root: Sandbox 根目录
        agent_session_key: Agent 会话密钥
        agent_channel: Agent 频道
        agent_account_id: Agent 账号 ID

    Returns:
        ToolContext 对象
    """
    return ToolContext(
        config=config,
        sandboxed=sandboxed,
        cwd=cwd,
        sandbox_root=sandbox_root,
        agent_session_key=agent_session_key,
        agent_channel=agent_channel,
        agent_account_id=agent_account_id,
    )

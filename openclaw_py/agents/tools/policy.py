"""工具策略和权限控制。

提供工具过滤、授权检查、工具组等功能。
"""

from typing import Literal

from openclaw_py.agents.tools.types import AnyAgentTool, ToolPolicy, ToolProfile

# 工具名称别名（规范化用）
TOOL_NAME_ALIASES: dict[str, str] = {
    "bash": "exec",
    "apply-patch": "apply_patch",
}

# 工具组定义
TOOL_GROUPS: dict[str, list[str]] = {
    # 核心工具组
    "group:memory": ["memory_search", "memory_get"],
    "group:web": ["web_search", "web_fetch"],
    "group:fs": ["read", "write", "edit", "apply_patch"],
    "group:runtime": ["exec", "process"],
    "group:sessions": [
        "sessions_list",
        "sessions_history",
        "sessions_send",
        "sessions_spawn",
        "session_status",
    ],
    "group:ui": ["browser", "canvas"],
    "group:automation": ["cron", "gateway"],
    "group:messaging": ["message"],
    "group:nodes": ["nodes"],
    # OpenClaw 所有原生工具
    "group:openclaw": [
        "browser",
        "canvas",
        "nodes",
        "cron",
        "message",
        "gateway",
        "agents_list",
        "sessions_list",
        "sessions_history",
        "sessions_send",
        "sessions_spawn",
        "session_status",
        "memory_search",
        "memory_get",
        "web_search",
        "web_fetch",
        "image",
    ],
}

# Owner-only 工具（需要所有者权限）
OWNER_ONLY_TOOL_NAMES: set[str] = {"whatsapp_login"}

# 工具配置文件（预设策略）
TOOL_PROFILES: dict[Literal["minimal", "coding", "messaging", "full"], ToolPolicy] = {
    "minimal": ToolPolicy(allow=["session_status"]),
    "coding": ToolPolicy(
        allow=[
            "group:fs",
            "group:runtime",
            "group:sessions",
            "group:memory",
            "image",
        ]
    ),
    "messaging": ToolPolicy(
        allow=[
            "group:messaging",
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "session_status",
        ]
    ),
    "full": ToolPolicy(allow=[], deny=[]),  # 允许所有工具
}


def normalize_tool_name(name: str) -> str:
    """规范化工具名称。

    Args:
        name: 原始工具名称

    Returns:
        规范化后的工具名称（小写，应用别名）
    """
    normalized = name.strip().lower()
    return TOOL_NAME_ALIASES.get(normalized, normalized)


def is_owner_only_tool_name(name: str) -> bool:
    """检查工具是否需要所有者权限。

    Args:
        name: 工具名称

    Returns:
        True 如果工具需要所有者权限
    """
    return normalize_tool_name(name) in OWNER_ONLY_TOOL_NAMES


def expand_tool_groups(names: list[str]) -> set[str]:
    """展开工具组为具体工具名称。

    Args:
        names: 工具名称列表（可能包含 group:xxx）

    Returns:
        展开后的工具名称集合
    """
    expanded: set[str] = set()

    for name in names:
        norm_name = normalize_tool_name(name)

        # 如果是工具组，展开
        if norm_name in TOOL_GROUPS:
            group_tools = TOOL_GROUPS[norm_name]
            expanded.update(group_tools)
        else:
            expanded.add(norm_name)

    return expanded


def is_tool_allowed_by_policy(
    tool_name: str,
    policy: ToolPolicy,
) -> bool:
    """检查工具是否被策略允许。

    Args:
        tool_name: 工具名称
        policy: 工具策略

    Returns:
        True 如果工具被允许
    """
    norm_name = normalize_tool_name(tool_name)

    # 展开 allow 和 deny 列表
    allowed = expand_tool_groups(policy.allow)
    denied = expand_tool_groups(policy.deny)

    # 如果 allow 为空，表示允许所有（除非在 deny 中）
    if not allowed:
        return norm_name not in denied

    # 如果工具在 deny 中，拒绝
    if norm_name in denied:
        return False

    # 检查是否在 allow 中
    return norm_name in allowed


def filter_tools_by_policy(
    tools: list[AnyAgentTool],
    policy: ToolPolicy,
) -> list[AnyAgentTool]:
    """根据策略过滤工具列表。

    Args:
        tools: 工具列表
        policy: 工具策略

    Returns:
        过滤后的工具列表
    """
    return [tool for tool in tools if is_tool_allowed_by_policy(tool.name, policy)]


def apply_owner_only_tool_policy(
    tools: list[AnyAgentTool],
    sender_is_owner: bool,
) -> list[AnyAgentTool]:
    """应用 owner-only 工具策略。

    如果用户不是所有者，owner-only 工具会被替换为返回错误的版本。

    Args:
        tools: 工具列表
        sender_is_owner: 发送者是否为所有者

    Returns:
        应用策略后的工具列表
    """
    if sender_is_owner:
        return tools

    result: list[AnyAgentTool] = []

    for tool in tools:
        if not is_owner_only_tool_name(tool.name):
            result.append(tool)
            continue

        if not tool.execute:
            result.append(tool)
            continue

        # 创建受保护版本（返回错误）
        async def _owner_only_error(_params: dict, _ctx: None = None):
            from openclaw_py.agents.tools.common import error_result

            return error_result(
                f"Tool '{tool.name}' is restricted to the bot owner. "
                "Non-owner users cannot invoke this tool."
            )

        protected_tool = tool.model_copy(update={"execute": _owner_only_error})
        result.append(protected_tool)

    return result


def resolve_tool_profile_policy(
    profile_id: Literal["minimal", "coding", "messaging", "full"] | None,
) -> ToolPolicy:
    """解析工具配置文件策略。

    Args:
        profile_id: 配置文件 ID

    Returns:
        ToolPolicy 对象
    """
    if profile_id is None or profile_id == "full":
        return TOOL_PROFILES["full"]

    return TOOL_PROFILES.get(profile_id, TOOL_PROFILES["full"])


def get_tool_profile(
    profile_id: Literal["minimal", "coding", "messaging", "full"] | None,
) -> ToolProfile:
    """获取工具配置文件。

    Args:
        profile_id: 配置文件 ID

    Returns:
        ToolProfile 对象
    """
    policy = resolve_tool_profile_policy(profile_id)
    return ToolProfile(id=profile_id or "full", policy=policy)

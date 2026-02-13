"""Agent 工具系统。

提供 AI Agent 可调用的各种工具：
- Bash 命令执行
- Web 搜索和获取
- Telegram 操作
- 会话管理
- Skills 系统
"""

# 类型
from openclaw_py.agents.tools.types import (
    AnyAgentTool,
    ToolContext,
    ToolExecuteFunc,
    ToolParameter,
    ToolPolicy,
    ToolProfile,
    ToolResult,
)

# 通用函数
from openclaw_py.agents.tools.common import (
    error_result,
    json_result,
    read_bool_param,
    read_dict_param,
    read_int_param,
    read_list_param,
    read_number_param,
    read_string_or_number_param,
    read_string_param,
    success_result,
    text_result,
)

# 策略
from openclaw_py.agents.tools.policy import (
    apply_owner_only_tool_policy,
    expand_tool_groups,
    filter_tools_by_policy,
    get_tool_profile,
    is_owner_only_tool_name,
    is_tool_allowed_by_policy,
    normalize_tool_name,
    resolve_tool_profile_policy,
    TOOL_GROUPS,
    TOOL_PROFILES,
)

# Bash 工具
from openclaw_py.agents.tools.bash_exec import create_exec_tool

# Web 工具
from openclaw_py.agents.tools.web_fetch import create_web_fetch_tool
from openclaw_py.agents.tools.web_search import create_web_search_tool

# 工具集成
from openclaw_py.agents.tools.create_tools import (
    create_coding_tools,
    create_openclaw_tools,
    get_tool_context,
)

__all__ = [
    # 类型
    "AnyAgentTool",
    "ToolContext",
    "ToolExecuteFunc",
    "ToolParameter",
    "ToolPolicy",
    "ToolProfile",
    "ToolResult",
    # 通用函数
    "error_result",
    "json_result",
    "read_bool_param",
    "read_dict_param",
    "read_int_param",
    "read_list_param",
    "read_number_param",
    "read_string_or_number_param",
    "read_string_param",
    "success_result",
    "text_result",
    # 策略
    "apply_owner_only_tool_policy",
    "expand_tool_groups",
    "filter_tools_by_policy",
    "get_tool_profile",
    "is_owner_only_tool_name",
    "is_tool_allowed_by_policy",
    "normalize_tool_name",
    "resolve_tool_profile_policy",
    "TOOL_GROUPS",
    "TOOL_PROFILES",
    # Bash 工具
    "create_exec_tool",
    # Web 工具
    "create_web_fetch_tool",
    "create_web_search_tool",
    # 工具集成
    "create_coding_tools",
    "create_openclaw_tools",
    "get_tool_context",
]

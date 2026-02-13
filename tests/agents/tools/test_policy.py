"""测试工具策略系统。"""

from openclaw_py.agents.tools.policy import (
    expand_tool_groups,
    filter_tools_by_policy,
    is_tool_allowed_by_policy,
    normalize_tool_name,
    resolve_tool_profile_policy,
)
from openclaw_py.agents.tools.types import AgentTool, ToolPolicy


class TestNormalizeToolName:
    """测试工具名称规范化"""

    def test_normalize_lowercase(self):
        assert normalize_tool_name("Exec") == "exec"
        assert normalize_tool_name("EXEC") == "exec"

    def test_normalize_alias(self):
        assert normalize_tool_name("bash") == "exec"
        assert normalize_tool_name("apply-patch") == "apply_patch"


class TestExpandToolGroups:
    """测试工具组展开"""

    def test_expand_single_tool(self):
        names = ["exec"]
        expanded = expand_tool_groups(names)
        assert "exec" in expanded

    def test_expand_group(self):
        names = ["group:fs"]
        expanded = expand_tool_groups(names)
        assert "read" in expanded
        assert "write" in expanded
        assert "edit" in expanded
        assert "apply_patch" in expanded

    def test_expand_mixed(self):
        names = ["exec", "group:web"]
        expanded = expand_tool_groups(names)
        assert "exec" in expanded
        assert "web_search" in expanded
        assert "web_fetch" in expanded


class TestIsToolAllowedByPolicy:
    """测试工具策略检查"""

    def test_allow_all_empty_policy(self):
        policy = ToolPolicy(allow=[], deny=[])
        assert is_tool_allowed_by_policy("exec", policy)
        assert is_tool_allowed_by_policy("web_search", policy)

    def test_allow_specific_tools(self):
        policy = ToolPolicy(allow=["exec", "read"], deny=[])
        assert is_tool_allowed_by_policy("exec", policy)
        assert is_tool_allowed_by_policy("read", policy)
        assert not is_tool_allowed_by_policy("web_search", policy)

    def test_deny_tools(self):
        policy = ToolPolicy(allow=[], deny=["exec"])
        assert not is_tool_allowed_by_policy("exec", policy)
        assert is_tool_allowed_by_policy("web_search", policy)

    def test_allow_group(self):
        policy = ToolPolicy(allow=["group:fs"], deny=[])
        assert is_tool_allowed_by_policy("read", policy)
        assert is_tool_allowed_by_policy("write", policy)
        assert not is_tool_allowed_by_policy("exec", policy)


class TestFilterToolsByPolicy:
    """测试工具列表过滤"""

    def test_filter_tools(self):
        tools = [
            AgentTool(name="exec", description="Execute command", input_schema={}),
            AgentTool(name="read", description="Read file", input_schema={}),
            AgentTool(name="web_search", description="Search web", input_schema={}),
        ]
        policy = ToolPolicy(allow=["exec", "read"], deny=[])
        filtered = filter_tools_by_policy(tools, policy)
        assert len(filtered) == 2
        assert filtered[0].name == "exec"
        assert filtered[1].name == "read"


class TestResolveToolProfilePolicy:
    """测试工具配置文件"""

    def test_resolve_minimal_profile(self):
        policy = resolve_tool_profile_policy("minimal")
        assert "session_status" in expand_tool_groups(policy.allow)

    def test_resolve_coding_profile(self):
        policy = resolve_tool_profile_policy("coding")
        expanded = expand_tool_groups(policy.allow)
        assert "read" in expanded
        assert "write" in expanded
        assert "exec" in expanded

    def test_resolve_full_profile(self):
        policy = resolve_tool_profile_policy("full")
        assert policy.allow == []
        assert policy.deny == []

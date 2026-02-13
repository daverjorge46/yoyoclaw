"""测试工具集成器。"""

from openclaw_py.agents.tools.create_tools import (
    create_coding_tools,
    create_openclaw_tools,
    get_tool_context,
)
from openclaw_py.agents.tools.types import ToolContext


class TestCreateOpenClawTools:
    """测试 create_openclaw_tools"""

    def test_create_openclaw_tools_basic(self):
        tools = create_openclaw_tools()
        assert len(tools) > 0

        tool_names = [t.name for t in tools]
        assert "exec" in tool_names
        assert "web_search" in tool_names
        assert "web_fetch" in tool_names

    def test_create_openclaw_tools_with_config(self):
        tools = create_openclaw_tools(sandboxed=True)
        assert len(tools) > 0


class TestCreateCodingTools:
    """测试 create_coding_tools"""

    def test_create_coding_tools(self):
        tools = create_coding_tools()
        assert len(tools) > 0

        tool_names = [t.name for t in tools]
        assert "exec" in tool_names


class TestGetToolContext:
    """测试 get_tool_context"""

    def test_get_tool_context(self):
        context = get_tool_context(sandboxed=True, cwd="/tmp")
        assert isinstance(context, ToolContext)
        assert context.sandboxed is True
        assert context.cwd == "/tmp"

    def test_get_tool_context_defaults(self):
        context = get_tool_context()
        assert isinstance(context, ToolContext)
        assert context.sandboxed is False

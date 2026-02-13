"""测试 Bash exec 工具。"""

import pytest

from openclaw_py.agents.tools.bash_exec import create_exec_tool
from openclaw_py.agents.tools.types import ToolContext


class TestExecTool:
    """测试 exec 工具"""

    def test_create_exec_tool(self):
        tool = create_exec_tool()
        assert tool.name == "exec"
        assert tool.description is not None
        assert tool.execute is not None
        assert "command" in tool.input_schema["properties"]

    @pytest.mark.asyncio
    async def test_exec_simple_command(self):
        tool = create_exec_tool()
        params = {"command": "echo 'Hello, World!'"}
        context = ToolContext(sandboxed=True)

        result = await tool.execute(params, context)
        assert result.is_error is False
        assert "Hello, World!" in result.content

    @pytest.mark.asyncio
    async def test_exec_command_with_exit_code(self):
        tool = create_exec_tool()
        params = {"command": "exit 1"}
        context = ToolContext(sandboxed=True)

        result = await tool.execute(params, context)
        assert result.is_error is True
        assert "exited with code 1" in result.content

    @pytest.mark.asyncio
    async def test_exec_missing_command(self):
        tool = create_exec_tool()
        params = {}
        context = ToolContext(sandboxed=True)

        result = await tool.execute(params, context)
        assert result.is_error is True
        assert "required" in result.content.lower()

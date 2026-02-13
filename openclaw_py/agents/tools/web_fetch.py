"""Web Fetch 工具。

提供 URL 获取和内容提取功能（简化版）。
"""

from typing import Any

from openclaw_py.agents.tools.common import error_result, read_int_param, read_string_param
from openclaw_py.agents.tools.types import AgentTool, ToolContext, ToolResult

DEFAULT_MAX_CHARS = 50_000
DEFAULT_TIMEOUT = 30


async def web_fetch_execute(
    params: dict[str, Any],
    context: ToolContext | None = None,
) -> ToolResult:
    """执行 web_fetch 工具。

    Args:
        params: 工具参数（url, max_chars 等）
        context: 工具上下文

    Returns:
        ToolResult 对象
    """
    try:
        # 读取参数
        url = read_string_param(params, "url", required=True)
        max_chars = read_int_param(params, "max_chars") or DEFAULT_MAX_CHARS

        # 导入 httpx（延迟导入）
        try:
            import httpx
        except ImportError:
            return error_result(
                "httpx library not installed. Install with: pip install httpx"
            )

        # 获取 URL
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()

            content = response.text

            # 截断内容
            if len(content) > max_chars:
                content = content[:max_chars] + f"\n\n... [truncated to {max_chars} chars]"

            return ToolResult(
                content=f"URL: {url}\n\nContent:\n{content}",
                is_error=False,
            )

    except ValueError as e:
        return error_result(str(e))
    except Exception as e:
        return error_result(f"Failed to fetch URL: {e}")


def create_web_fetch_tool() -> AgentTool:
    """创建 web_fetch 工具。

    Returns:
        AgentTool 对象
    """
    return AgentTool(
        name="web_fetch",
        description="Fetch content from a URL and extract readable text",
        input_schema={
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "HTTP or HTTPS URL to fetch",
                },
                "max_chars": {
                    "type": "number",
                    "description": f"Maximum characters to return (default: {DEFAULT_MAX_CHARS})",
                    "default": DEFAULT_MAX_CHARS,
                },
            },
            "required": ["url"],
        },
        execute=web_fetch_execute,
    )

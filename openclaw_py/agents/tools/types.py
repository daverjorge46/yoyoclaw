"""工具系统类型定义。"""

from typing import Any, Awaitable, Callable, Literal, TypeVar

from pydantic import BaseModel, Field

# 工具参数类型
ToolParameterType = Literal["string", "number", "boolean", "array", "object"]

T = TypeVar("T")


class ToolParameter(BaseModel):
    """工具参数定义。

    与 Anthropic SDK 的工具参数格式兼容。
    """

    type: ToolParameterType
    description: str | None = None
    required: bool = False
    default: Any = None
    # 对于 array 类型
    items: dict[str, Any] | None = None
    # 对于 object 类型
    properties: dict[str, Any] | None = None
    # 对于 string 类型
    enum: list[str] | None = None
    # 数字范围
    minimum: float | None = None
    maximum: float | None = None


class ToolResult(BaseModel):
    """工具执行结果。"""

    # 文本内容（必需）
    content: str
    # 是否为错误
    is_error: bool = False
    # 图片列表（可选，用于支持视觉模型）
    images: list[dict[str, Any]] = Field(default_factory=list)
    # 额外元数据
    metadata: dict[str, Any] | None = None


class ToolContext(BaseModel):
    """工具执行上下文。

    提供工具执行所需的环境信息。
    """

    # 工作目录
    cwd: str | None = None
    # Sandbox 根目录
    sandbox_root: str | None = None
    # 是否为沙箱环境
    sandboxed: bool = False
    # Agent 会话密钥
    agent_session_key: str | None = None
    # Agent 频道（如 "telegram"）
    agent_channel: str | None = None
    # Agent 账号 ID
    agent_account_id: str | None = None
    # 配置（避免循环导入，用 Any）
    config: Any = None


# 工具执行函数类型
ToolExecuteFunc = Callable[[dict[str, Any], ToolContext | None], Awaitable[ToolResult]]


class AgentTool(BaseModel):
    """Agent 工具定义。

    与 Anthropic SDK 的 Tool 格式兼容。
    """

    model_config = {"arbitrary_types_allowed": True}

    # 工具名称（唯一标识符）
    name: str
    # 工具描述
    description: str
    # 参数 schema（JSON Schema 格式）
    input_schema: dict[str, Any] = Field(default_factory=dict)
    # 执行函数（Python 可调用对象，非序列化）
    execute: ToolExecuteFunc | None = None


# 任意工具类型（类型别名）
AnyAgentTool = AgentTool


class ToolPolicy(BaseModel):
    """工具策略配置。"""

    # 允许的工具列表（工具名或 group:name）
    allow: list[str] = Field(default_factory=list)
    # 拒绝的工具列表
    deny: list[str] = Field(default_factory=list)


class ToolProfile(BaseModel):
    """工具配置文件（预设策略）。"""

    # 配置文件 ID
    id: Literal["minimal", "coding", "messaging", "full"]
    # 配置文件策略
    policy: ToolPolicy

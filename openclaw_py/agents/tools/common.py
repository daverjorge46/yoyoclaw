"""工具通用函数。

提供参数读取、结果格式化等通用功能。
"""

import json
from typing import Any, overload

import orjson

from openclaw_py.agents.tools.types import ToolResult


# ============================================================================
# 参数读取函数
# ============================================================================


@overload
def read_string_param(
    params: dict[str, Any],
    key: str,
    *,
    required: bool = True,
    trim: bool = True,
    label: str | None = None,
    allow_empty: bool = False,
) -> str: ...


@overload
def read_string_param(
    params: dict[str, Any],
    key: str,
    *,
    required: bool = False,
    trim: bool = True,
    label: str | None = None,
    allow_empty: bool = False,
) -> str | None: ...


def read_string_param(
    params: dict[str, Any],
    key: str,
    *,
    required: bool = False,
    trim: bool = True,
    label: str | None = None,
    allow_empty: bool = False,
) -> str | None:
    """从参数中读取字符串。

    Args:
        params: 参数字典
        key: 参数键
        required: 是否必需
        trim: 是否去除前后空白
        label: 参数标签（用于错误消息）
        allow_empty: 是否允许空字符串

    Returns:
        字符串值，如果不存在且 required=False 则返回 None

    Raises:
        ValueError: 如果参数缺失或无效
    """
    label = label or key
    raw = params.get(key)

    if not isinstance(raw, str):
        if required:
            raise ValueError(f"{label} required")
        return None

    value = raw.strip() if trim else raw

    if not value and not allow_empty:
        if required:
            raise ValueError(f"{label} required")
        return None

    return value


def read_string_or_number_param(
    params: dict[str, Any],
    key: str,
    *,
    required: bool = False,
    label: str | None = None,
) -> str | None:
    """从参数中读取字符串或数字（转为字符串）。

    Args:
        params: 参数字典
        key: 参数键
        required: 是否必需
        label: 参数标签

    Returns:
        字符串值，如果不存在且 required=False 则返回 None

    Raises:
        ValueError: 如果参数缺失或无效
    """
    label = label or key
    raw = params.get(key)

    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        return str(raw)

    if isinstance(raw, str):
        value = raw.strip()
        if value:
            return value

    if required:
        raise ValueError(f"{label} required")
    return None


def read_number_param(
    params: dict[str, Any],
    key: str,
    *,
    required: bool = False,
    label: str | None = None,
    min_value: float | None = None,
    max_value: float | None = None,
) -> float | None:
    """从参数中读取数字。

    Args:
        params: 参数字典
        key: 参数键
        required: 是否必需
        label: 参数标签
        min_value: 最小值
        max_value: 最大值

    Returns:
        数字值，如果不存在且 required=False 则返回 None

    Raises:
        ValueError: 如果参数缺失、无效或超出范围
    """
    label = label or key
    raw = params.get(key)

    if raw is None:
        if required:
            raise ValueError(f"{label} required")
        return None

    if not isinstance(raw, (int, float)) or isinstance(raw, bool):
        raise ValueError(f"{label} must be a number")

    value = float(raw)

    if min_value is not None and value < min_value:
        raise ValueError(f"{label} must be >= {min_value}")

    if max_value is not None and value > max_value:
        raise ValueError(f"{label} must be <= {max_value}")

    return value


def read_int_param(
    params: dict[str, Any],
    key: str,
    *,
    required: bool = False,
    label: str | None = None,
    min_value: int | None = None,
    max_value: int | None = None,
) -> int | None:
    """从参数中读取整数。

    Args:
        params: 参数字典
        key: 参数键
        required: 是否必需
        label: 参数标签
        min_value: 最小值
        max_value: 最大值

    Returns:
        整数值，如果不存在且 required=False 则返回 None

    Raises:
        ValueError: 如果参数缺失、无效或超出范围
    """
    num = read_number_param(
        params,
        key,
        required=required,
        label=label,
        min_value=min_value,
        max_value=max_value,
    )
    return int(num) if num is not None else None


def read_bool_param(
    params: dict[str, Any],
    key: str,
    *,
    default: bool | None = None,
) -> bool | None:
    """从参数中读取布尔值。

    Args:
        params: 参数字典
        key: 参数键
        default: 默认值

    Returns:
        布尔值，如果不存在则返回 default
    """
    raw = params.get(key)

    if isinstance(raw, bool):
        return raw

    if raw is None:
        return default

    # 尝试解析字符串
    if isinstance(raw, str):
        lower = raw.strip().lower()
        if lower in ("true", "1", "yes"):
            return True
        if lower in ("false", "0", "no"):
            return False

    return default


def read_list_param(
    params: dict[str, Any],
    key: str,
    *,
    required: bool = False,
    label: str | None = None,
) -> list[Any] | None:
    """从参数中读取列表。

    Args:
        params: 参数字典
        key: 参数键
        required: 是否必需
        label: 参数标签

    Returns:
        列表值，如果不存在且 required=False 则返回 None

    Raises:
        ValueError: 如果参数缺失或无效
    """
    label = label or key
    raw = params.get(key)

    if raw is None:
        if required:
            raise ValueError(f"{label} required")
        return None

    if not isinstance(raw, list):
        raise ValueError(f"{label} must be an array")

    return raw


def read_dict_param(
    params: dict[str, Any],
    key: str,
    *,
    required: bool = False,
    label: str | None = None,
) -> dict[str, Any] | None:
    """从参数中读取字典。

    Args:
        params: 参数字典
        key: 参数键
        required: 是否必需
        label: 参数标签

    Returns:
        字典值，如果不存在且 required=False 则返回 None

    Raises:
        ValueError: 如果参数缺失或无效
    """
    label = label or key
    raw = params.get(key)

    if raw is None:
        if required:
            raise ValueError(f"{label} required")
        return None

    if not isinstance(raw, dict):
        raise ValueError(f"{label} must be an object")

    return raw


# ============================================================================
# 结果格式化函数
# ============================================================================


def text_result(content: str, is_error: bool = False) -> ToolResult:
    """创建纯文本工具结果。

    Args:
        content: 文本内容
        is_error: 是否为错误

    Returns:
        ToolResult 对象
    """
    return ToolResult(content=content, is_error=is_error)


def json_result(
    data: Any,
    *,
    is_error: bool = False,
    pretty: bool = False,
) -> ToolResult:
    """创建 JSON 工具结果。

    Args:
        data: 要序列化的数据
        is_error: 是否为错误
        pretty: 是否格式化输出

    Returns:
        ToolResult 对象
    """
    if pretty:
        content = json.dumps(data, indent=2, ensure_ascii=False)
    else:
        content = orjson.dumps(data).decode("utf-8")

    return ToolResult(content=content, is_error=is_error)


def error_result(message: str, details: dict[str, Any] | None = None) -> ToolResult:
    """创建错误工具结果。

    Args:
        message: 错误消息
        details: 错误详情

    Returns:
        ToolResult 对象（is_error=True）
    """
    if details:
        content = f"{message}\n\nDetails:\n{json.dumps(details, indent=2)}"
    else:
        content = message

    return ToolResult(content=content, is_error=True, metadata=details)


def success_result(message: str, data: dict[str, Any] | None = None) -> ToolResult:
    """创建成功工具结果。

    Args:
        message: 成功消息
        data: 额外数据

    Returns:
        ToolResult 对象
    """
    return ToolResult(content=message, is_error=False, metadata=data)

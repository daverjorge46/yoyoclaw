"""Bash 工具共享函数。"""

import os
from pathlib import Path

# 危险环境变量（在非沙箱环境中禁止）
DANGEROUS_HOST_ENV_VARS: set[str] = {
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
    "LD_AUDIT",
    "DYLD_INSERT_LIBRARIES",
    "DYLD_LIBRARY_PATH",
    "NODE_OPTIONS",
    "NODE_PATH",
    "PYTHONPATH",
    "PYTHONHOME",
    "RUBYLIB",
    "PERL5LIB",
    "BASH_ENV",
    "ENV",
    "GCONV_PATH",
    "IFS",
    "SSLKEYLOGFILE",
}

DANGEROUS_HOST_ENV_PREFIXES: list[str] = ["DYLD_", "LD_"]

# 默认值
DEFAULT_MAX_OUTPUT_CHARS = 200_000
DEFAULT_TIMEOUT_SECONDS = 120


def validate_host_env(env: dict[str, str]) -> None:
    """验证环境变量是否安全（非沙箱环境）。

    Args:
        env: 环境变量字典

    Raises:
        ValueError: 如果检测到危险环境变量
    """
    for key in env.keys():
        upper_key = key.upper()

        # 检查危险前缀
        for prefix in DANGEROUS_HOST_ENV_PREFIXES:
            if upper_key.startswith(prefix):
                raise ValueError(
                    f"Security Violation: Environment variable '{key}' is forbidden during host execution."
                )

        # 检查危险变量
        if upper_key in DANGEROUS_HOST_ENV_VARS:
            raise ValueError(
                f"Security Violation: Environment variable '{key}' is forbidden during host execution."
            )

        # 禁止修改 PATH（在主机上）
        if upper_key == "PATH":
            raise ValueError(
                "Security Violation: Custom 'PATH' variable is forbidden during host execution."
            )


def resolve_workdir(cwd: str | None, sandbox_root: str | None) -> Path:
    """解析工作目录。

    Args:
        cwd: 当前工作目录
        sandbox_root: Sandbox 根目录

    Returns:
        解析后的工作目录 Path 对象
    """
    if cwd:
        return Path(cwd).resolve()

    if sandbox_root:
        return Path(sandbox_root).resolve()

    return Path.cwd()


def truncate_output(output: str, max_chars: int) -> tuple[str, bool]:
    """截断输出到最大字符数。

    Args:
        output: 原始输出
        max_chars: 最大字符数

    Returns:
        (截断后的输出, 是否被截断)
    """
    if len(output) <= max_chars:
        return output, False

    # 从中间截断
    half = max_chars // 2
    truncated = output[:half] + f"\n\n... [truncated {len(output) - max_chars} chars] ...\n\n" + output[-half:]
    return truncated, True


def build_env_dict(
    base_env: dict[str, str] | None = None,
    extra_env: dict[str, str] | None = None,
) -> dict[str, str]:
    """构建环境变量字典。

    Args:
        base_env: 基础环境变量（默认使用 os.environ）
        extra_env: 额外环境变量

    Returns:
        合并后的环境变量字典
    """
    env = dict(base_env or os.environ)

    if extra_env:
        env.update(extra_env)

    return env

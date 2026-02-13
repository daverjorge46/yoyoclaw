"""Skills 系统类型定义。"""

from typing import Any, Literal

from pydantic import BaseModel, Field


class SkillInstallSpec(BaseModel):
    """Skill 安装规范。"""

    id: str | None = None
    kind: Literal["brew", "node", "go", "uv", "download"]
    label: str | None = None
    bins: list[str] = Field(default_factory=list)
    os: list[str] = Field(default_factory=list)  # ["darwin", "linux", "win32"]
    formula: str | None = None  # brew formula
    package: str | None = None  # npm package
    module: str | None = None  # python module
    url: str | None = None  # download URL
    archive: str | None = None  # archive type
    extract: bool = False  # extract archive
    strip_components: int | None = None
    target_dir: str | None = None


class OpenClawSkillMetadata(BaseModel):
    """OpenClaw Skill 元数据。"""

    always: bool = False  # 是否总是加载
    skill_key: str | None = None  # Skill 唯一键
    primary_env: str | None = None  # 主要环境变量
    emoji: str | None = None  # Emoji 图标
    homepage: str | None = None  # 主页 URL
    os: list[str] = Field(default_factory=list)  # 支持的操作系统

    # 依赖要求
    requires: dict[str, Any] = Field(default_factory=dict)
    # - bins: list[str] - 必需的二进制文件
    # - any_bins: list[str] - 任一二进制文件
    # - env: list[str] - 环境变量
    # - config: list[str] - 配置路径

    # 安装规范
    install: list[SkillInstallSpec] = Field(default_factory=list)


class SkillInvocationPolicy(BaseModel):
    """Skill 调用策略。"""

    user_invocable: bool = True  # 用户可调用
    disable_model_invocation: bool = False  # 禁用模型调用


class SkillCommandDispatchSpec(BaseModel):
    """Skill 命令分发规范。"""

    kind: Literal["tool"]
    tool_name: str  # 要调用的工具名称
    arg_mode: Literal["raw"] | None = None  # 参数转发模式


class SkillCommandSpec(BaseModel):
    """Skill 命令规范。"""

    name: str  # 命令名称（如 "/commit"）
    skill_name: str  # Skill 名称
    description: str  # 命令描述
    dispatch: SkillCommandDispatchSpec | None = None  # 分发配置


class SkillsInstallPreferences(BaseModel):
    """Skills 安装偏好。"""

    prefer_brew: bool = True  # 优先使用 Homebrew
    node_manager: Literal["npm", "pnpm", "yarn", "bun"] = "npm"


class Skill(BaseModel):
    """Skill 定义（简化版）。"""

    name: str  # Skill 名称
    description: str  # Skill 描述
    content: str  # Skill 内容（Markdown）
    meta: OpenClawSkillMetadata = Field(default_factory=OpenClawSkillMetadata)


class SkillEntry(BaseModel):
    """Skill 条目。"""

    skill: Skill
    frontmatter: dict[str, str] = Field(default_factory=dict)  # YAML frontmatter
    metadata: OpenClawSkillMetadata | None = None
    invocation: SkillInvocationPolicy | None = None


class SkillEligibilityContext(BaseModel):
    """Skill 资格上下文。"""

    remote: dict[str, Any] | None = None
    # - platforms: list[str]
    # - has_bin: (bin: str) => bool
    # - has_any_bin: (bins: list[str]) => bool
    # - note: str | None


class SkillSnapshot(BaseModel):
    """Skill 快照。"""

    prompt: str  # Skills prompt 文本
    skills: list[dict[str, Any]] = Field(default_factory=list)  # Skill 列表
    resolved_skills: list[Skill] | None = None  # 解析后的 skills
    version: int | None = None  # 快照版本

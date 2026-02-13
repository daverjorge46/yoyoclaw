"""Skills 系统。

提供自定义 Skill 加载和管理功能。
"""

from openclaw_py.agents.skills.types import (
    OpenClawSkillMetadata,
    Skill,
    SkillCommandSpec,
    SkillEntry,
    SkillInstallSpec,
    SkillInvocationPolicy,
    SkillSnapshot,
    SkillsInstallPreferences,
)
from openclaw_py.agents.skills.workspace import (
    build_workspace_skill_snapshot,
    build_workspace_skills_prompt,
    load_workspace_skill_entries,
)

__all__ = [
    "OpenClawSkillMetadata",
    "Skill",
    "SkillCommandSpec",
    "SkillEntry",
    "SkillInstallSpec",
    "SkillInvocationPolicy",
    "SkillSnapshot",
    "SkillsInstallPreferences",
    "build_workspace_skill_snapshot",
    "build_workspace_skills_prompt",
    "load_workspace_skill_entries",
]

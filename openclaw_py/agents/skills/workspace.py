"""Workspace Skills 管理（简化版）。"""

from pathlib import Path

from openclaw_py.agents.skills.types import SkillEntry, SkillSnapshot
from openclaw_py.logging import log_debug


async def load_workspace_skill_entries(
    workspace_dir: str | Path,
) -> list[SkillEntry]:
    """从工作区加载 Skill 条目。

    Args:
        workspace_dir: 工作区目录

    Returns:
        SkillEntry 列表
    """
    workspace_path = Path(workspace_dir)
    skills_dir = workspace_path / ".claude" / "skills"

    if not skills_dir.exists():
        log_debug(f"Skills directory not found: {skills_dir}")
        return []

    # 简化版：返回空列表（完整实现需要扫描 .md 文件并解析 frontmatter）
    log_debug(f"Loading skills from: {skills_dir}")
    return []


async def build_workspace_skill_snapshot(
    workspace_dir: str | Path,
) -> SkillSnapshot:
    """构建工作区 Skill 快照。

    Args:
        workspace_dir: 工作区目录

    Returns:
        SkillSnapshot 对象
    """
    entries = await load_workspace_skill_entries(workspace_dir)

    # 构建 prompt
    if not entries:
        prompt = "No custom skills loaded."
    else:
        prompt = f"Loaded {len(entries)} custom skill(s)."

    return SkillSnapshot(
        prompt=prompt,
        skills=[{"name": entry.skill.name} for entry in entries],
        resolved_skills=[entry.skill for entry in entries],
        version=1,
    )


def build_workspace_skills_prompt(
    snapshot: SkillSnapshot,
) -> str:
    """构建工作区 Skills prompt。

    Args:
        snapshot: Skill 快照

    Returns:
        Skills prompt 字符串
    """
    return snapshot.prompt

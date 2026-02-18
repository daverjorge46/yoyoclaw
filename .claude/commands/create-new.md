---
description: Create new feature with spec, tasks, and intelligent orchestration
---

# Create New Feature

Create a new feature with full specification workflow and task generation using Yoyo-AI orchestration.

## Usage

```bash
/create-new [feature-description]
```

## Description

Streamlined feature creation workflow with intelligent orchestration:

1. **Feature Discovery** - Identify from roadmap or capture user idea
2. **Context Gathering** - Load mission-lite.md, tech-stack.md
3. **Background Research** - Fire librarian agent (parallel)
4. **Requirements Clarification** - Use spec-shaper for detailed questions
5. **Spec Creation** - Generate comprehensive specification
6. **User Review** - Approve specification
7. **Task Generation** - Create strategic task breakdown
8. **Execution Readiness** - Ready for /execute-tasks

## Yoyo-AI Integration (v5.0)

**Phase 0: Intent Classification**

- Classifies as "Planning" intent
- Routes to Discovery workflow

**Phase 2A: Parallel Research**

- Fires background research automatically:
  ```typescript
  background_task({
    agent: "librarian",
    prompt: "Research best practices for ${feature}",
    name: "Feature Research",
  });
  ```

**Phase 2B: Requirements Gathering**

- Delegates to spec-shaper for user questions
- Continues while research runs
- Retrieves research when needed

**Phase 3: Spec & Tasks**

- spec-writer creates specification
- tasks-list-creator generates tasks
- Yoyo-AI reviews for completeness

## Examples

```bash
# Simple feature description
/create-new "Add user authentication"

# Detailed feature request
/create-new "Implement real-time collaboration with presence indicators"

# From roadmap item
/create-new "Phase 2.1 - Multi-user workspaces"
```

## Workflow Steps

1. **Discovery**
   - Check roadmap for matching item
   - Or capture user description

2. **Context Loading**
   - Read `.yoyo-dev/product/mission-lite.md`
   - Read `.yoyo-dev/product/tech-stack.md`
   - Review existing specs

3. **Research (Background)**
   - Librarian researches best practices
   - Finds implementation patterns
   - Gathers documentation

4. **Requirements (Interactive)**
   - spec-shaper asks numbered questions
   - User provides answers
   - Clarifies edge cases

5. **Specification**
   - spec-writer creates detailed spec
   - Includes technical decisions
   - Documents API changes if needed

6. **User Review**
   - User approves specification
   - Can request changes
   - Confirms scope

7. **Task Generation**
   - tasks-list-creator breaks down work
   - Strategic grouping by phase
   - Dependency analysis

8. **Ready for Execution**
   - Run `/execute-tasks` to begin
   - Or review tasks first

## Output

Creates spec directory:

```
.yoyo-dev/specs/YYYY-MM-DD-feature-name/
├── spec.md              # Full specification
├── spec-lite.md         # Condensed for AI agents
├── tasks.md             # Task breakdown
├── decisions.md         # Technical decisions
├── state.json           # Workflow state
└── sub-specs/
    ├── technical-spec.md    # Implementation details
    ├── database-schema.md   # If database changes
    └── api-spec.md          # If API changes
```

## Integration with Execute-Tasks

After creation:

```bash
# Execute with Yoyo-AI (default)
/execute-tasks

# Execute with legacy workflow
/execute-tasks --orchestrator legacy
```

## Refer to Instructions

**Core Workflow:** `@.yoyo-dev/instructions/core/create-new.md`

**Orchestration:** `@.yoyo-dev/instructions/core/yoyo-ai-orchestration.md`

---

**Note:** Uses Yoyo-AI orchestration for intelligent delegation and parallel research. Legacy single-agent workflow still available via core instructions.

# Output Formatting Standards

## Context

Visual formatting guidelines for Yoyo Dev command outputs to create a superior developer experience with structured, color-coded, and easily scannable information.

## Design Principles

1. **Information Hierarchy** - Most important info stands out first
2. **Visual Scanning** - Use colors, icons, and structure for quick parsing
3. **Actionable** - Clear next steps and options
4. **Professional** - Clean, consistent formatting
5. **Terminal-Native** - Works in any CLI environment

---

## Color Palette

### Semantic Colors (ANSI Escape Codes)

```
RED:     \033[31m   # Errors, critical issues, blockers
GREEN:   \033[32m   # Success, completed, passing
YELLOW:  \033[33m   # Warnings, attention needed
BLUE:    \033[34m   # Info, steps, processes
MAGENTA: \033[35m   # Highlights, special items
CYAN:    \033[36m   # Secondary info, metadata
WHITE:   \033[37m   # Default text
GRAY:    \033[90m   # Muted, less important

BOLD:    \033[1m    # Emphasis
DIM:     \033[2m    # De-emphasis
RESET:   \033[0m    # Reset all formatting

# Backgrounds
BG_RED:     \033[41m
BG_GREEN:   \033[42m
BG_YELLOW:  \033[43m
BG_BLUE:    \033[44m
BG_MAGENTA: \033[45m
BG_CYAN:    \033[46m
```

### Usage Guidelines

| Element          | Color          | Example                        |
| ---------------- | -------------- | ------------------------------ |
| Success messages | GREEN          | ✓ Feature created successfully |
| Error messages   | RED + BOLD     | ✗ Failed to create spec        |
| Warnings         | YELLOW         | ⚠ Missing database schema      |
| Info/Steps       | BLUE           | → Step 1: Task Assignment      |
| Highlights       | MAGENTA + BOLD | ★ Next Action Required         |
| Metadata         | CYAN           | 📅 Created: 2025-01-15         |
| Muted text       | GRAY           | (optional)                     |
| Critical blocks  | BG_RED + WHITE | 🚨 CRITICAL ISSUE              |

---

## Icons & Symbols

### Status Icons

```
✓  Success / Complete / Pass
✗  Error / Failed / Blocked
⚠  Warning / Attention needed
→  Arrow / Next step / In progress
★  Important / Highlight
•  Bullet point / List item
▸  Nested item / Sub-bullet
□  Unchecked / Todo
■  Checked / Done
⟳  In progress / Working
⏸  Paused / Waiting
```

### Content Icons

```
📋 Spec / Document / List
📝 Task / Note / Edit
🔍 Search / Analyze / Review
🚀 Execute / Deploy / Launch
🐛 Bug / Issue / Problem
🔒 Security / Auth / Private
⚡ Performance / Speed / Optimization
📊 Report / Stats / Metrics
💡 Tip / Suggestion / Idea
🎯 Goal / Target / Objective
📦 Package / Module / Component
🔧 Config / Settings / Tools
```

---

## Output Structures

### 1. Command Header

Every command should start with a clear, branded header:

```
┌────────────────────────────────────────────────┐
│  🚀 YOYO DEV - CREATE NEW FEATURE              │
│  ────────────────────────────────────────────  │
│  Streamlined feature creation workflow         │
└────────────────────────────────────────────────┘
```

**Formatting:**

```
\033[1m\033[36m┌────────────────────────────────────────────────┐\033[0m
\033[1m\033[36m│\033[0m  🚀 \033[1mYOYO DEV - CREATE NEW FEATURE\033[0m              \033[1m\033[36m│\033[0m
\033[1m\033[36m│\033[0m  ────────────────────────────────────────────  \033[1m\033[36m│\033[0m
\033[1m\033[36m│\033[0m  \033[2mStreamlined feature creation workflow\033[0m         \033[1m\033[36m│\033[0m
\033[1m\033[36m└────────────────────────────────────────────────┘\033[0m
```

### 2. Progress Steps

Show clear progress through workflow phases:

```
┌─ PHASE 1: SPECIFICATION CREATION ─────────────┐
│                                                │
│  → Step 1: Feature Discovery         ✓        │
│  → Step 2: Requirements Clarification ⟳       │
│  → Step 3: Technical Spec Generation  □       │
│  → Step 4: User Review               □       │
│                                                │
└────────────────────────────────────────────────┘
```

**With colors:**

```
\033[1m\033[34m┌─ PHASE 1: SPECIFICATION CREATION ─────────────┐\033[0m
\033[34m│\033[0m                                                \033[34m│\033[0m
\033[34m│\033[0m  \033[34m→\033[0m Step 1: Feature Discovery         \033[32m✓\033[0m        \033[34m│\033[0m
\033[34m│\033[0m  \033[34m→\033[0m Step 2: Requirements Clarification \033[33m⟳\033[0m       \033[34m│\033[0m
\033[34m│\033[0m  \033[34m→\033[0m Step 3: Technical Spec Generation  \033[90m□\033[0m       \033[34m│\033[0m
\033[34m│\033[0m  \033[34m→\033[0m Step 4: User Review               \033[90m□\033[0m       \033[34m│\033[0m
\033[34m│\033[0m                                                \033[34m│\033[0m
\033[1m\033[34m└────────────────────────────────────────────────┘\033[0m
```

### 3. Information Tables

Use aligned tables for structured data:

```
╔═══════════════════════════════════════════════════════════╗
║  📊 TASK SUMMARY                                          ║
╠═══════════════════════════════════════════════════════════╣
║  Total Tasks       │  5                                   ║
║  Completed         │  3  ████████████░░░░  60%           ║
║  In Progress       │  1  ████░░░░░░░░░░░░  20%           ║
║  Pending           │  1  ████░░░░░░░░░░░░  20%           ║
╠═══════════════════════════════════════════════════════════╣
║  Estimated Time    │  4-6 hours remaining                ║
║  Current Branch    │  feature/user-profile               ║
║  Last Updated      │  2025-01-15 14:30:00                ║
╚═══════════════════════════════════════════════════════════╝
```

### 4. Decision Trees / Options

Present clear options for user decisions:

```
┌─ 💡 NEXT STEPS ────────────────────────────────┐
│                                                │
│  What would you like to do?                   │
│                                                │
│  [1] 📋 Review Specification                  │
│      Preview the generated spec before        │
│      creating tasks                           │
│                                                │
│  [2] 🚀 Continue to Task Creation             │
│      Automatically create tasks breakdown     │
│                                                │
│  [3] ✏️  Edit Specification                   │
│      Make changes to requirements             │
│                                                │
│  [4] ❌ Cancel                                │
│      Exit without saving                      │
│                                                │
└────────────────────────────────────────────────┘

> Enter your choice (1-4): _
```

### 5. Critical Alerts

High-visibility blocks for critical information:

```
╔═══════════════════════════════════════════════════════════╗
║  🚨 CRITICAL ISSUE - ACTION REQUIRED                      ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  3 critical security vulnerabilities found                ║
║                                                           ║
║  ▸ SQL Injection in user login (auth.ts:45)             ║
║  ▸ Hardcoded API key in config (config.ts:12)           ║
║  ▸ Missing authentication check (api/users.ts:89)       ║
║                                                           ║
║  These must be fixed before deployment.                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

**With colors:**

```
\033[1m\033[41m\033[37m╔═══════════════════════════════════════════════════════════╗\033[0m
\033[1m\033[41m\033[37m║  🚨 CRITICAL ISSUE - ACTION REQUIRED                      ║\033[0m
\033[1m\033[41m\033[37m╠═══════════════════════════════════════════════════════════╣\033[0m
\033[41m\033[37m║                                                           ║\033[0m
\033[41m\033[37m║  3 critical security vulnerabilities found                ║\033[0m
\033[41m\033[37m║                                                           ║\033[0m
\033[41m\033[37m║  ▸ SQL Injection in user login (auth.ts:45)             ║\033[0m
\033[41m\033[37m║  ▸ Hardcoded API key in config (config.ts:12)           ║\033[0m
\033[41m\033[37m║  ▸ Missing authentication check (api/users.ts:89)       ║\033[0m
\033[41m\033[37m║                                                           ║\033[0m
\033[41m\033[37m║  These must be fixed before deployment.                  ║\033[0m
\033[41m\033[37m║                                                           ║\033[0m
\033[1m\033[41m\033[37m╚═══════════════════════════════════════════════════════════╝\033[0m
```

### 6. Review Report Summary

Structured review findings with severity indicators:

```
┌─ 🔍 REVIEW REPORT: DEVIL MODE ────────────────┐
│                                                │
│  Scope: Authentication System                 │
│  Date:  2025-01-15                            │
│                                                │
├─ FINDINGS SUMMARY ────────────────────────────┤
│                                                │
│  🔴 Critical  │ 2  │ ████████████████████      │
│  🟠 High      │ 5  │ ████████████              │
│  🟡 Medium    │ 8  │ ████████                  │
│  🟢 Low       │ 3  │ ██                        │
│                                                │
├─ TOP 3 CRITICAL ISSUES ───────────────────────┤
│                                                │
│  1. 🔴 No rate limiting on login endpoint     │
│     File: src/api/auth.ts:45                  │
│     Impact: Brute force attack vulnerability  │
│                                                │
│  2. 🔴 Password stored in plain text          │
│     File: src/models/user.ts:23               │
│     Impact: Data breach exposure              │
│                                                │
│  3. 🟠 Missing session timeout                │
│     File: src/middleware/auth.ts:67           │
│     Impact: Session hijacking risk            │
│                                                │
├─ RECOMMENDED ACTIONS ─────────────────────────┤
│                                                │
│  [1] 🔧 Create fix tasks for critical issues  │
│  [2] 📊 View full report                      │
│  [3] 📋 Export findings to file               │
│                                                │
└────────────────────────────────────────────────┘
```

### 7. Progress Bars

Visual progress indicators:

```
Installing dependencies...
████████████████████░░░░░░░░  75%  (15/20 packages)

Running tests...
████████████████████████████ 100%  (48/48 passing) ✓

Building project...
███████████████░░░░░░░░░░░░░  50%  (compiling...)
```

### 8. Task Breakdown Display

Hierarchical task visualization:

```
┌─ 📋 TASK BREAKDOWN ────────────────────────────┐
│                                                │
│  ■ Task 1: Database Schema Updates            │
│    ├─ ✓ 1.1 Create user_profiles table        │
│    ├─ ⟳ 1.2 Add migration scripts             │
│    ├─ □ 1.3 Update indexes                    │
│    └─ □ 1.4 Run tests                         │
│                                                │
│  □ Task 2: API Endpoint Implementation        │
│    ├─ □ 2.1 Write API tests                   │
│    ├─ □ 2.2 Implement GET /profile            │
│    ├─ □ 2.3 Implement PUT /profile            │
│    └─ □ 2.4 Add validation middleware         │
│                                                │
│  □ Task 3: Frontend Components                │
│    ├─ □ 3.1 Create ProfileCard component      │
│    ├─ □ 3.2 Add profile form                  │
│    └─ □ 3.3 Integrate with API                │
│                                                │
├─ PROGRESS ────────────────────────────────────┤
│                                                │
│  Completed:    2/12 subtasks  ████░░░░░░  17% │
│  In Progress:  1/12 subtasks  ██░░░░░░░░   8% │
│  Remaining:    9/12 subtasks  ██████████  75% │
│                                                │
└────────────────────────────────────────────────┘
```

### 9. File Changes Summary

Show what files were created/modified:

```
┌─ 📝 FILE CHANGES ──────────────────────────────┐
│                                                │
│  ✚ Created (5)                                 │
│    • src/components/ProfileCard.tsx           │
│    • src/api/profile.ts                       │
│    • src/types/profile.ts                     │
│    • tests/profile.test.ts                    │
│    • migrations/001_add_profiles.sql          │
│                                                │
│  ✎ Modified (3)                                │
│    • src/App.tsx                  (+15, -3)   │
│    • src/routes/index.ts          (+8, -0)    │
│    • package.json                 (+2, -0)    │
│                                                │
│  ✗ Deleted (1)                                 │
│    • src/legacy/old-profile.ts                │
│                                                │
├─ STATISTICS ──────────────────────────────────┤
│                                                │
│  Total files:      9                          │
│  Lines added:      +342                       │
│  Lines removed:    -78                        │
│  Net change:       +264                       │
│                                                │
└────────────────────────────────────────────────┘
```

### 10. Command Completion Summary

Final summary with next steps:

```
╔═══════════════════════════════════════════════════════════╗
║  ✓ FEATURE CREATED SUCCESSFULLY                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Feature:      User Profile Management                   ║
║  Branch:       feature/user-profile                      ║
║  Tasks:        12 subtasks created                       ║
║  Estimated:    6-8 hours implementation time             ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║  📁 FILES CREATED                                         ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  ✓ .yoyo-dev/specs/2025-01-15-user-profile/              ║
║    ├─ spec.md                  Full specification        ║
║    ├─ spec-lite.md             Condensed summary         ║
║    ├─ tasks.md                 Task breakdown            ║
║    ├─ decisions.md             Technical decisions       ║
║    └─ sub-specs/                                         ║
║       ├─ technical-spec.md     Implementation details    ║
║       ├─ database-schema.md    Schema changes            ║
║       └─ api-spec.md           API endpoints             ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║  🚀 NEXT STEPS                                            ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Ready to start implementation!                          ║
║                                                           ║
║  → Run:  /execute-tasks                                  ║
║                                                           ║
║  This will:                                              ║
║    • Set up git branch                                   ║
║    • Execute all 12 tasks using TDD                      ║
║    • Run full test suite                                 ║
║    • Create commit and PR                                ║
║    • Update roadmap                                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

## Formatting Templates

### Error Message Template

```
┌─ ✗ ERROR ──────────────────────────────────────┐
│                                                │
│  Failed to create specification                │
│                                                │
│  Reason: Missing required file mission.md      │
│                                                │
│  To fix:                                       │
│    1. Run /plan-product first                  │
│    2. Or run /analyze-product for existing     │
│       codebase                                 │
│                                                │
└────────────────────────────────────────────────┘
```

### Warning Message Template

```
┌─ ⚠ WARNING ────────────────────────────────────┐
│                                                │
│  No tests found for this feature               │
│                                                │
│  It's recommended to add tests before          │
│  continuing. This improves code quality        │
│  and catches bugs early.                       │
│                                                │
│  Continue anyway? (y/n): _                     │
│                                                │
└────────────────────────────────────────────────┘
```

### Success Message Template

```
┌─ ✓ SUCCESS ────────────────────────────────────┐
│                                                │
│  All tests passing! (48/48) ✓                 │
│                                                │
│  Coverage: 87% ██████████████████░░░░          │
│                                                │
└────────────────────────────────────────────────┘
```

### Info Message Template

```
┌─ ℹ INFO ───────────────────────────────────────┐
│                                                │
│  Loading context from mission-lite.md...      │
│                                                │
│  Product: Task Management App                 │
│  Target: Remote teams                         │
│  Stack:  React + Convex + Clerk               │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Special Elements

### 1. Code Blocks

```
┌─ 📝 GENERATED CODE ────────────────────────────┐
│                                                │
│  File: src/components/ProfileCard.tsx         │
│                                                │
│  1  import React from 'react';                │
│  2  import { User } from '@/types';           │
│  3                                             │
│  4  interface ProfileCardProps {              │
│  5    user: User;                             │
│  6  }                                          │
│  7                                             │
│  8  export function ProfileCard({             │
│  9    user                                     │
│ 10  }: ProfileCardProps) {                    │
│ 11    return (                                 │
│ 12      <div className="profile-card">        │
│ 13        <h2>{user.name}</h2>               │
│ 14      </div>                                 │
│ 15    );                                       │
│ 16  }                                          │
│                                                │
└────────────────────────────────────────────────┘
```

### 2. Timeline/History

```
┌─ 📅 DEVELOPMENT TIMELINE ──────────────────────┐
│                                                │
│  2025-01-10  📋 Spec created                   │
│      │                                         │
│      ├─ User stories defined                  │
│      └─ Technical approach reviewed           │
│      │                                         │
│  2025-01-12  🚀 Implementation started         │
│      │                                         │
│      ├─ Database schema ✓                     │
│      ├─ API endpoints ✓                       │
│      └─ Frontend components ⟳                 │
│      │                                         │
│  2025-01-15  🔍 Code review                    │
│      │                                         │
│      └─ 3 issues found → fixing              │
│                                                │
└────────────────────────────────────────────────┘
```

### 3. Metrics Dashboard

```
╔═══════════════════════════════════════════════════════════╗
║  📊 PROJECT METRICS                                       ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Development Velocity                                    ║
║    • Features completed:  12/15  ████████████░░░░  80%  ║
║    • Bugs fixed:          45     ████████████████  95%  ║
║    • Tech debt items:     8      ████████░░░░░░░░  40%  ║
║                                                           ║
║  Code Quality                                            ║
║    • Test coverage:       87%    ████████████████░░░░    ║
║    • Linting errors:      0      ████████████████████    ║
║    • Security issues:     2      ████████████░░░░░░░░    ║
║                                                           ║
║  Performance                                             ║
║    • Build time:          45s    ████████████░░░░░░░░    ║
║    • Bundle size:         342KB  ████████████░░░░░░░░    ║
║    • Lighthouse score:    94/100 ██████████████████░░    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

## Implementation Guidelines

### When to Use Each Format

| Situation         | Format              | Priority    |
| ----------------- | ------------------- | ----------- |
| Command start     | Header box          | Required    |
| Phase transitions | Progress steps      | Required    |
| User decisions    | Option menu         | Required    |
| Critical issues   | Alert box + BG_RED  | Required    |
| Success           | Success box + GREEN | Required    |
| Errors            | Error box + RED     | Required    |
| Data summary      | Table               | Recommended |
| File changes      | File tree           | Recommended |
| Long processes    | Progress bar        | Recommended |
| Tips/suggestions  | Info box + CYAN     | Optional    |

### Consistency Rules

1. **Always reset colors** after use: `\033[0m`
2. **Box width**: Standard 60 characters for readability
3. **Padding**: 2 spaces inside boxes
4. **Icons**: Use consistently (same icon = same meaning)
5. **Color meanings**: Never change (red = bad, green = good)
6. **Hierarchy**: Headers > Sections > Content > Metadata

### Accessibility Considerations

1. **Never rely on color alone** - Always include text/icons
2. **High contrast** - Text must be readable
3. **Fallback text** - Icons should have text labels
4. **Screen readers** - ANSI codes are ignored, text remains clear

---

## Quick Reference: Common Patterns

### Pattern: Command Header

```
┌──── 🚀 COMMAND NAME ────┐
│  Description here       │
└─────────────────────────┘
```

### Pattern: Status Line

```
→ Step name... ✓ Done
→ Step name... ⟳ Working
→ Step name... ✗ Failed
```

### Pattern: Progress

```
Task: ████████████░░░░  75%  (3/4)
```

### Pattern: Option Menu

```
[1] Option one
[2] Option two
[3] Option three
```

### Pattern: Alert

```
🚨 ALERT: Message here
```

### Pattern: File Path

```
• path/to/file.ts  (+15, -3)
```

---

## Examples by Command

### `/plan-product` Output

- Header: Product planning
- Questions as numbered list
- Progress bar as answers collected
- Final summary in table
- Success box with next steps

### `/create-new` Output

- Header: Feature creation
- Phase progress (spec → tasks)
- Questions with clear formatting
- Generated files tree
- Success box with `/execute-tasks` CTA

### `/execute-tasks` Output

- Header: Task execution
- Real-time progress per task
- File changes as they happen
- Test results with pass/fail
- Completion summary with PR link

### `/yoyo-review` Output

- Header: Review mode
- Findings table by severity
- Critical issues highlighted
- Code snippets with line numbers
- Action options at end

---

## Testing Your Formatting

Before finalizing output, verify:

- [ ] Colors render correctly in terminal
- [ ] Box alignment is perfect
- [ ] Icons display properly
- [ ] Progress bars update smoothly
- [ ] Text remains readable without colors
- [ ] Mobile terminal (80 char width) looks good
- [ ] Screen readers can parse content

---

**Remember: Great formatting enhances developer experience and makes Yoyo Dev a joy to use!**

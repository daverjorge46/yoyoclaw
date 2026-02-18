---
description: Display all Yoyo Dev commands, flags, and usage examples
---

# Yoyo Dev Command Reference

Display comprehensive help for all Yoyo Dev commands and flags.

## Instructions

Show the complete Yoyo Dev v6.2 command reference with all available commands, flags, and usage examples.

```
╔════════════════════════════════════════════════════════════════════╗
║                  YOYO DEV v6.2 - COMMAND REFERENCE                 ║
╚════════════════════════════════════════════════════════════════════╝

🎯 PRODUCT SETUP
─────────────────────────────────────────────────────────────────────

  /yoyo-init
    Initialize Yoyo Dev in current project
    → Checks for .yoyo-dev/ (framework) and .yoyo-dev/memory/ (memory)
    → Handles migration from deprecated .yoyo/ directory
    → Guides through proper setup if not initialized

  /plan-product
    Set mission & roadmap for a new product
    → Creates .yoyo-dev/product/ with mission, roadmap, tech stack

  /analyze-product
    Set up mission & roadmap for existing product
    → Analyzes codebase and creates product documentation

📦 FEATURE DEVELOPMENT
─────────────────────────────────────────────────────────────────────

  /create-new [feature] [--lite]
    Create feature with spec + tasks (streamlined workflow)

    Flags:
      --lite       Skip detailed spec, fast iteration mode

    Example:
      /create-new "User profile page" --lite

  /create-spec [feature]
    Create detailed specification only (no tasks)
    → For when you need comprehensive planning first

  /create-tasks
    Create task breakdown from existing spec
    → Run after /create-spec completes

  /execute-tasks [--all] [--task=N] [--parallel]
    Build and ship code (interactive by default)

    Flags:
      --all        Run without pausing (legacy mode)
      --task=N     Execute specific task only (e.g., --task=2)
      --parallel   Enable parallel task execution

    Examples:
      /execute-tasks                    # Interactive mode
      /execute-tasks --task=3           # Run task 3 only
      /execute-tasks --parallel         # Parallel execution
      /execute-tasks --all              # Legacy batch mode

🐛 BUG FIXES & ISSUES
─────────────────────────────────────────────────────────────────────

  /create-fix [problem] [--quick]
    Analyze and fix bugs, design issues, layout problems

    Flags:
      --quick      Skip investigation (for obvious problems)

    Examples:
      /create-fix "Login button not working"
      /create-fix "Mobile layout broken" --quick

🎨 DESIGN SYSTEM (v1.5.0)
─────────────────────────────────────────────────────────────────────

  /design-init [--analyze] [--minimal]
    Initialize comprehensive design system

    Flags:
      --analyze    Extract from existing codebase
      --minimal    Minimal design system setup

    → Creates .yoyo-dev/design/ with tokens, patterns, Tailwind config

  /design-audit [--colors] [--spacing] [--contrast] [--focus]
    Audit codebase for design consistency violations

    Flags:
      --colors     Audit color usage only
      --spacing    Audit spacing values only
      --contrast   Audit color contrast (WCAG AA)
      --focus      Audit focus states only

    → Generates report: .yoyo-dev/design/audits/YYYY-MM-DD-audit.md

  /design-fix [--colors] [--spacing] [--contrast] [--focus]
    Systematically fix design violations from audit

    Example:
      /design-audit
      /design-fix --colors --contrast

  /design-component [name] [--strict]
    Create UI component with strict design validation

    Flag:
      --strict     Zero violations allowed (block on any issue)

    Example:
      /design-component "User profile card"

🔍 CODE REVIEW (Optional)
─────────────────────────────────────────────────────────────────────

  /yoyo-review [scope] [--devil] [--security] [--performance] [--production]
    Critical code review with specialized modes

    Modes:
      --devil        Devil's advocate (find what breaks)
      --security     Security vulnerabilities, auth issues
      --performance  Bottlenecks, memory leaks, N+1 queries
      --production   Production readiness, error handling
      --premortem    Pre-mortem analysis before building
      --quality      Code quality, maintainability

    Examples:
      /yoyo-review "authentication flow" --security
      /yoyo-review --devil --performance
      /yoyo-review "API endpoints" --production

📊 TUI DASHBOARD (v3.0)
─────────────────────────────────────────────────────────────────────

  Launch TUI:
    yoyo                          # Production-grade Textual TUI

  TUI Features:
    • 3-panel intelligent layout (Active Work, Commands, History)
    • Context-aware command suggestions
    • Real-time progress tracking
    • Proactive error detection
    • MCP server health monitoring
    • Beautiful responsive terminal UI

  Keyboard Shortcuts:
    ?     Help & shortcuts       r     Refresh all panels
    /     Command search         g     Git menu
    t     Focus active work      s     Focus specs/commands
    h     Focus history          q     Quit

🔧 YOYO LAUNCHER FLAGS
─────────────────────────────────────────────────────────────────────

  yoyo                  Launch production-grade Textual TUI dashboard
  yoyo --help           Show this command reference
  yoyo --version        Show Yoyo Dev version
  yoyo --commands       List all available commands

📝 WORKFLOW EXAMPLES
─────────────────────────────────────────────────────────────────────

  Simple Feature (Fast):
    /create-new "Add profile avatar" --lite
    /execute-tasks

  Complex Feature (With Planning):
    /create-new "User authentication"
    /execute-tasks --parallel

  Bug Fix:
    /create-fix "Layout broken on mobile"
    /execute-tasks

  Design System Workflow:
    /design-init --analyze
    /design-audit
    /design-fix --colors --contrast
    /design-component "User profile card"

  Code Review Before Shipping:
    /yoyo-review "payment processing" --security --production

🆕 NEW IN V3.0
─────────────────────────────────────────────────────────────────────

  🚀 Production-grade Textual TUI dashboard
    • Intelligent 3-panel layout with real-time updates
    • Context-aware command suggestions
    • Proactive error detection
    • MCP server health monitoring

  ⚡ Performance optimizations
    • 97% faster startup (9ms vs 300ms)
    • 94% faster status refresh (3ms vs 50ms)
    • 100% CPU reduction during idle (0% vs 2-5%)
    • Smart caching for frequently-accessed data

  🎨 Design system improvements (v1.5.0)
    • Professional UI consistency
    • WCAG AA accessibility compliance
    • Design token system
    • Automated validation

📚 DOCUMENTATION
─────────────────────────────────────────────────────────────────────

  Full Documentation:
    CLAUDE.md                            Project context & architecture
    .yoyo-dev/COMMAND-REFERENCE.md       Complete reference
    ~/.yoyo-dev/standards/               Development standards
    .yoyo-dev/instructions/              Workflow instructions

  Product Documentation:
    .yoyo-dev/product/mission-lite.md    Product vision & context
    .yoyo-dev/product/roadmap.md         Development roadmap
    .yoyo-dev/product/tech-stack.md      Technical architecture

────────────────────────────────────────────────────────────────────

💡 Tips:
  • Use --lite for quick iterations
  • Launch yoyo command for beautiful TUI dashboard
  • Use --parallel for independent tasks (2-3x speedup)
  • Interactive mode is default (pause after each subtask)
  • Use /yoyo-review modes strategically, not by default
  • Press ? in TUI for keyboard shortcuts

────────────────────────────────────────────────────────────────────

Yoyo Dev v6.2 - "Your AI learns. Your AI remembers. Your AI evolves."
```

Display this complete reference and exit.

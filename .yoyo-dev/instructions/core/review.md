---
description: Critical review of code, specs, or implementations using specialized review modes
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Code Review with Critical Analysis

## Overview

Perform critical analysis of code, specifications, or implementations using specialized review modes. This command applies different review lenses (devil's advocate, security, performance, etc.) to identify issues before they become problems.

**Use this when:**

- Projects have accumulated technical debt
- Bugs keep reappearing
- You need pre-mortem analysis before building
- Security or performance audits are needed
- Production incidents require root cause analysis

<pre_flight_check>
EXECUTE: @.yoyo-dev/instructions/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="review_mode_selection">

### Step 1: Review Mode Selection

Identify which review mode(s) to apply based on user request or auto-detection.

<mode_detection>
<user_flags>
--devil → Devil's Advocate (find what will break)
--security → Security Review (vulnerabilities, auth, data leaks)
--performance → Performance Review (bottlenecks, optimization)
--production → Production Readiness (error handling, monitoring)
--premortem → Pre-Mortem Analysis (why will this fail?)
--quality → Code Quality (maintainability, tests, style)
</user_flags>

<auto_detection>
IF user mentions: "security", "auth", "authentication", "vulnerability"
SUGGEST: --security mode

    IF user mentions: "slow", "performance", "optimization", "bottleneck"
      SUGGEST: --performance mode

    IF user mentions: "production", "deployment", "release"
      SUGGEST: --production mode

    IF user mentions: "what could go wrong", "edge cases", "will this break"
      SUGGEST: --devil mode

</auto_detection>
</mode_detection>

<instructions>
  ACTION: Parse user request for explicit review mode flags
  AUTO_DETECT: Suggest appropriate mode if not specified
  CONFIRM: Which review mode(s) to apply
  LOAD: Review mode guidelines from @.yoyo-dev/standards/review-modes.md
</instructions>

</step>

<step number="2" name="scope_identification">

### Step 2: Scope Identification

Determine what to review (code files, spec, feature area, entire project).

<scope_options>
<specific_files>
IF user provides file paths:
REVIEW: Those specific files
</specific_files>

<feature_area>
IF user describes a feature/component:
SEARCH: Find relevant files using Grep/Glob
REVIEW: All files in that feature area
</feature_area>

<spec_review>
IF reviewing a spec before implementation:
LOAD: spec.md, technical-spec.md, database-schema.md, api-spec.md
REVIEW: Specification documents
</spec_review>

<full_project>
IF user says "entire project" or "all code":
ANALYZE: Project structure
IDENTIFY: Critical paths and high-risk areas
REVIEW: Systematically by feature/module
</full_project>
</scope_options>

<instructions>
  ACTION: Identify what needs review
  SEARCH: Find all relevant files/documents
  PRIORITIZE: Critical paths and high-risk areas first
  INFORM: User of review scope before starting
</instructions>

</step>

<step number="3" name="load_review_context">

### Step 3: Load Review Context

Load necessary context for the review based on mode.

<context_by_mode>
<devil_mode>
LOAD: - @.yoyo-dev/standards/review-modes.md (Devil's Advocate section) - Recent bugs from git history (if available) - decisions.md (past decisions that might be flawed)
</devil_mode>

<security_mode>
LOAD: - @.yoyo-dev/standards/review-modes.md (Security Review section) - Authentication/authorization code - Environment variables and secrets - API endpoints and validation logic
</security_mode>

<performance_mode>
LOAD: - @.yoyo-dev/standards/review-modes.md (Performance Review section) - Database queries and schemas - Component render patterns - Large data processing logic
</performance_mode>

<production_mode>
LOAD: - @.yoyo-dev/standards/review-modes.md (Production Readiness section) - Error handling patterns - Logging and monitoring code - Configuration and environment setup
</production_mode>
</context_by_mode>

<instructions>
  ACTION: Load review mode guidelines
  LOAD: Relevant code and documentation
  PREPARE: Review checklist for chosen mode
</instructions>

</step>

<step number="4" name="critical_analysis">

### Step 4: Critical Analysis

Apply the review mode lens to analyze the code/spec systematically.

<review_approach>
<structured_analysis>
FOR each file/component in scope: 1. READ: Understand what it does 2. APPLY: Review mode lens 3. IDENTIFY: Issues, risks, and problems 4. DOCUMENT: Findings with severity and location 5. SUGGEST: Specific fixes or improvements
</structured_analysis>

<checklist_application>
USE: Review mode checklist from review-modes.md
CHECK: Each item systematically
DOCUMENT: Pass/fail for each checklist item
HIGHLIGHT: Failed items as critical findings
</checklist_application>
</review_approach>

<devil_mode_specifics>
ASK:

- What happens when external dependencies fail?
- What edge cases are unhandled?
- What assumptions will break in production?
- What happens with concurrent access?
- What happens at 10x scale?
- What's the worst-case scenario?

CHALLENGE:

- Architectural decisions
- Technology choices
- Implementation approaches
- Error handling strategies
  </devil_mode_specifics>

<security_mode_specifics>
CHECK:

- Authentication on all protected routes
- Authorization for data access
- Input validation and sanitization
- SQL/NoSQL injection vectors
- XSS vulnerabilities
- CSRF protection
- Secrets in code or environment
- Data encryption at rest and in transit
- Rate limiting on APIs
- Audit logging for sensitive operations
  </security_mode_specifics>

<performance_mode_specifics>
ANALYZE:

- Algorithmic complexity (O(n) vs O(n²))
- Database query patterns (N+1 queries)
- Index usage on queries
- Component re-render patterns
- Large list rendering (virtualization)
- Image optimization and lazy loading
- Bundle size impact
- Memory leak potential
- Caching opportunities
  </performance_mode_specifics>

<production_mode_specifics>
VERIFY:

- Error handling completeness
- User-friendly error messages
- Logging for debugging
- Monitoring and alerting
- Rollback procedures
- Feature flags for gradual rollout
- Database migration reversibility
- Configuration externalization
- Health check endpoints
- Load testing results
  </production_mode_specifics>

<instructions>
  ACTION: Apply review mode systematically
  IDENTIFY: Specific issues with severity (critical, high, medium, low)
  DOCUMENT: File path, line number, issue description
  SUGGEST: Concrete fixes for each issue
  PRIORITIZE: Critical and high severity issues first
</instructions>

</step>

<step number="5" name="generate_review_report">

### Step 5: Generate Review Report

Create a structured review report with findings, severity, and recommendations.

<report_structure>

# Review Report: [Scope] - [Mode(s)]

**Review Date:** [Date]
**Review Mode(s):** [Modes applied]
**Scope:** [What was reviewed]
**Reviewer:** Claude Code (Yoyo Dev Review Mode)

---

## Executive Summary

[High-level overview of findings]

- Total issues found: [Count]
- Critical: [Count]
- High: [Count]
- Medium: [Count]
- Low: [Count]

**Key Risks:**
[Top 3-5 most critical issues]

---

## Detailed Findings

### Critical Issues

#### [Issue Title]

- **File:** [path/to/file.ts:line]
- **Severity:** Critical
- **Description:** [What's wrong]
- **Impact:** [What will break]
- **Recommendation:** [How to fix]

[Repeat for each critical issue]

### High Priority Issues

[Same structure as critical]

### Medium Priority Issues

[Same structure]

### Low Priority Issues

[Same structure]

---

## Checklist Results

Review Mode: [Mode Name]

- [✓] Item that passed
- [✗] Item that failed (see finding #N)
- [~] Item partially met

---

## Recommendations

### Immediate Actions (Do Now)

1. [Fix critical issue X]
2. [Address security vulnerability Y]

### Short-term Actions (This Sprint)

1. [Refactor performance bottleneck]
2. [Add missing error handling]

### Long-term Actions (Technical Debt)

1. [Architectural improvement]
2. [Code quality improvements]

---

## Next Steps

[Suggested actions based on findings]
</report_structure>

<instructions>
  ACTION: Generate structured review report
  SAVE: Report to `.yoyo-dev/reviews/YYYY-MM-DD-[scope]-[mode].md`
  PRESENT: Executive summary to user
  OFFER: Create fix tasks for critical issues
</instructions>

</step>

<step number="6" name="offer_fix_creation">

### Step 6: Offer Fix Creation

Ask if user wants to create fix tasks for identified issues.

<fix_workflow_integration>
IF critical or high priority issues found:
ASK: "Would you like me to create fix tasks for the critical issues?"

    IF user agrees:
      FOR each critical/high issue:
        CREATE: Fix task in format compatible with /create-fix

      OPTION 1: Create individual fixes
        /create-fix for each critical issue

      OPTION 2: Create consolidated fix spec
        Group related issues into fix spec
        Create tasks.md with prioritized fixes

</fix_workflow_integration>

<instructions>
  ACTION: Present fix creation options
  WAIT: For user decision
  IF requested: Transition to /create-fix workflow
  OTHERWISE: Complete review process
</instructions>

</step>

</process_flow>

<post_flight_check>
EXECUTE: @.yoyo-dev/instructions/meta/post-flight.md
</post_flight_check>

## Usage Examples

### Basic Review

```bash
/yoyo-review --devil "Review the authentication flow"
/yoyo-review --security "Audit the payment processing"
/yoyo-review --performance "Analyze dashboard performance"
```

### Multiple Modes

```bash
/yoyo-review --security --performance "Review API endpoints"
```

### Full Project Review

```bash
/yoyo-review --devil "Review entire project for edge cases"
```

### Pre-Implementation Review

```bash
# After /create-spec but before /execute-tasks
/yoyo-review --premortem "Review the spec for user-profile feature"
```

## Integration with Other Commands

### With /create-fix

```bash
/yoyo-review --devil → Identifies issues
  ↓
/create-fix → Creates fix for critical issues
```

### With /execute-tasks

```bash
# Review existing code before fixing
/yoyo-review --performance "Dashboard component"
  ↓
/create-fix → Create performance fix
  ↓
/execute-tasks
```

### Before Production

```bash
/yoyo-review --production "Review before release"
  ↓
Fix critical issues
  ↓
/yoyo-review --security "Final security audit"
```

## Review Mode Selection Guide

| Situation                       | Recommended Mode |
| ------------------------------- | ---------------- |
| Before building complex feature | `--premortem`    |
| Bugs keep reappearing           | `--devil`        |
| Auth or payment changes         | `--security`     |
| Page loads slowly               | `--performance`  |
| Before production release       | `--production`   |
| Code review / refactoring       | `--quality`      |
| Something feels wrong           | `--devil`        |

## Notes

- Review modes are **opt-in** - not applied by default
- Multiple modes can be combined
- Reports saved to `.yoyo-dev/reviews/`
- Critical findings should trigger `/create-fix` workflow
- Use strategically when projects go sideways
- Trust normal Yoyo Dev workflow for standard development

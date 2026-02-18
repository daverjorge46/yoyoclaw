---
description: Critical code review (--devil, --security, --performance, --production)
---

# Review Code with Critical Analysis

Perform critical code review using specialized review modes (devil's advocate, security, performance, production readiness).

## Command

```bash
/yoyo-review [--mode] "what to review"
```

## Review Modes

- `--devil` - Devil's Advocate (find what will break, edge cases, assumptions)
- `--security` - Security Review (vulnerabilities, auth, data leaks)
- `--performance` - Performance Review (bottlenecks, N+1 queries, optimization)
- `--production` - Production Readiness (error handling, monitoring, rollback)
- `--premortem` - Pre-Mortem Analysis (why will this fail before building)
- `--quality` - Code Quality (maintainability, tests, documentation)

## Examples

```bash
# Devil's advocate review
/yoyo-review --devil "Review the authentication flow"

# Security audit
/yoyo-review --security "Audit the payment processing system"

# Performance analysis
/yoyo-review --performance "Analyze dashboard query performance"

# Pre-implementation analysis
/yoyo-review --premortem "Review the user-profile spec before building"

# Multiple modes
/yoyo-review --security --performance "Review all API endpoints"

# Full project review
/yoyo-review --devil "Review entire project for edge cases"
```

## When to Use

Use review modes when:

- Projects have accumulated technical debt
- Bugs keep reappearing in the same area
- Before building complex/risky features
- Performance is degrading
- Security audit needed
- Before production deployment
- Something feels wrong but you can't pinpoint it

Don't use for:

- Normal feature development (use `/create-new` -> `/execute-tasks`)
- Simple bug fixes (use `/create-fix`)
- Routine tasks

## Workflow Integration

### Review -> Fix Workflow

```bash
/yoyo-review --devil -> Identifies critical issues
  |
/create-fix -> Creates fix tasks
  |
/execute-tasks -> Implements fixes
```

### Pre-Implementation Review

```bash
/create-spec -> Creates specification
  |
/yoyo-review --premortem -> Analyzes spec for failure modes
  |
Update spec based on findings
  |
/create-tasks -> Create implementation tasks
  |
/execute-tasks -> Build with insights from review
```

## Output

Creates a detailed review report:

- `.yoyo-dev/reviews/YYYY-MM-DD-[scope]-[mode].md`

Report includes:

- Executive summary
- Critical/high/medium/low severity findings
- Specific file locations and line numbers
- Concrete fix recommendations
- Checklist results
- Next steps

## Notes

- Review modes are **opt-in tools**, not default behavior
- Use strategically when you need extra scrutiny
- Multiple modes can be combined
- Reports can feed into `/create-fix` workflow
- Trust normal Yoyo Dev workflow for standard development

---

**Full instruction file:** `.yoyo-dev/instructions/core/review.md`

**Review mode guide:** `.yoyo-dev/standards/review-modes.md`

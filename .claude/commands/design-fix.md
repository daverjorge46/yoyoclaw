---
description: Fix design violations from audit (colors, spacing, contrast, focus)
---

# Design Fix

Systematically fix design system violations found in audit reports.

## What This Command Does

1. Load latest audit report (or run new audit)
2. Present violations grouped by severity
3. Ask user which violations to fix
4. Create fix tasks for selected violations
5. Execute fixes with validation
6. Re-run audit to verify

## Usage

```bash
/design-fix
```

Or fix specific violation types:

```bash
/design-fix --colors      # Fix only color violations
/design-fix --spacing     # Fix only spacing violations
/design-fix --contrast    # Fix only contrast violations
/design-fix --focus       # Fix only focus state violations
```

## Workflow

1. **Load Violations**: Read from latest audit or run new audit
2. **User Selection**: Choose which violations to fix
3. **Task Generation**: Create TDD-based fix tasks
4. **Execution**: Apply fixes with design-validator checking
5. **Verification**: Re-run audit to confirm fixes

## Task Structure

Each fix task follows TDD pattern:

- Write test for expected design token usage
- Implement fix (replace hardcoded value with token)
- Verify test passes
- Run design validator

## Output

- Updated components with design token compliance
- Validation report showing improvements
- Before/after compliance scores

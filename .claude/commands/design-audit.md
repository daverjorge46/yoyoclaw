---
description: Audit design system compliance (tokens, contrast, accessibility)
---

# Design Audit

Audit the codebase for design system compliance and generate a comprehensive report of violations.

## What This Command Does

1. Scans all components in `src/components/`
2. Checks design token compliance (colors, spacing, typography)
3. Validates color contrast ratios (WCAG AA)
4. Verifies focus states on interactive elements
5. Checks semantic HTML usage
6. Validates ARIA labels and accessibility
7. Tests responsive design
8. Checks dark mode implementation
9. Generates detailed violation report with fixes

## Usage

```bash
/design-audit
```

## Output

- Console summary of findings
- Detailed report: `.yoyo-dev/design/audits/YYYY-MM-DD-audit.md`
- JSON data: `.yoyo-dev/design/audits/YYYY-MM-DD-audit.json`
- Severity-categorized violations (critical/medium/minor)
- Specific fix recommendations with file locations

## Next Steps After Audit

- Fix critical violations (required before merge)
- Use `/design-fix` to systematically fix violations
- Re-run `/design-audit` to verify fixes

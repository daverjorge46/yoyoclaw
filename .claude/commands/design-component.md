---
description: Create UI component with strict design token validation and accessibility
---

# Design Component

Create a new UI component with enforced design system consistency.

## What This Command Does

1. Gather component requirements
2. Load design system context (tokens, patterns)
3. Select appropriate component patterns
4. Generate component with variants and states
5. Enforce design token usage
6. Validate accessibility (WCAG AA)
7. Test responsive design
8. Verify dark mode
9. Add to pattern library if reusable

## Usage

```bash
/design-component "User profile card"
/design-component "Primary CTA button"
/design-component "Search input with autocomplete"
```

## Enhanced Requirements Over /create-new

- **Stricter validation**: Zero violations allowed
- **All variants required**: Must implement all size/state variants
- **Pattern library integration**: Component added to patterns if reusable
- **Usage examples**: Must include code examples
- **Accessibility complete**: WCAG AA compliance required

## What You Get

1. Component implementation with all variants
2. Complete state coverage (default, hover, focus, disabled, loading)
3. Responsive design across all breakpoints
4. Dark mode support
5. Accessibility features (ARIA, keyboard nav)
6. Usage documentation
7. Pattern library entry (if reusable)

## Validation

Every component must pass:

- ✓ 100% design token compliance
- ✓ WCAG AA contrast ratios
- ✓ Focus states on all interactive elements
- ✓ Semantic HTML
- ✓ ARIA labels where needed
- ✓ Responsive design (mobile → desktop)
- ✓ Dark mode functionality
- ✓ Keyboard navigation

## Example Output

```tsx
// UserProfileCard.tsx
export function UserProfileCard({ name, role, avatar }: Props) {
  return (
    <div
      className="
      bg-surface-card
      border border-border-default
      rounded-lg
      p-6
      hover:shadow-lg
      transition-shadow duration-200
    "
    >
      <img src={avatar} alt={`${name} profile`} className="h-16 w-16 rounded-full" />
      <h3 className="mt-4 text-lg font-semibold text-text-primary">{name}</h3>
      <p className="text-sm text-text-secondary">{role}</p>
    </div>
  );
}
```

Pattern library automatically updated with this component.

# Design Validation Standards

## Purpose

This document defines the validation rules and processes used to enforce design system consistency. Every design-related change must pass these validation checks before being considered complete.

## Validation Phases

### Phase 1: Pre-Execution Validation

**When:** Before writing any code
**Purpose:** Ensure proper context and understanding

### Phase 2: During-Execution Validation

**When:** While writing code
**Purpose:** Real-time compliance checking

### Phase 3: Post-Execution Validation

**When:** After code is written, before marking complete
**Purpose:** Comprehensive design system compliance verification

---

## Pre-Execution Validation

### Context Loading Checklist

**Required context for UI work:**

- [ ] `design-lite.md` loaded (design system summary)
- [ ] `tokens.json` available (design tokens)
- [ ] Relevant component patterns loaded
- [ ] Accessibility requirements understood
- [ ] Responsive requirements clear

**Validation queries:**

1. What components am I building?
2. Do similar patterns exist in the pattern library?
3. What design tokens are relevant?
4. What accessibility level is required? (WCAG AA minimum)
5. What responsive breakpoints matter?

### Pattern Library Check

**Before creating any component:**

1. Search `component-patterns/` for similar patterns
2. If exists: Reuse pattern, don't reinvent
3. If similar: Adapt existing pattern, document changes
4. If new: Justify why new pattern needed

**Pattern search strategy:**

- Buttons → `component-patterns/buttons.md`
- Cards → `component-patterns/cards.md`
- Forms → `component-patterns/forms.md`
- Layouts → `component-patterns/layouts.md`
- Navigation → `component-patterns/navigation.md`

### Design System State Check

**Verify design system exists:**

```bash
if [ ! -f ".yoyo-dev/design/tokens.json" ]; then
  ERROR: Design system not initialized
  ACTION: Run /design-init first
fi
```

---

## During-Execution Validation

### Real-Time Compliance Checks

**As you write code, enforce:**

#### 1. Color Usage Rules

**✅ CORRECT:**

```tsx
<div className="bg-brand-primary text-white">
<div className="bg-surface-card border-border-default">
<p className="text-text-primary">
<span className="text-semantic-error">
```

**❌ INCORRECT:**

```tsx
<div className="bg-blue-500 text-white">        // Hardcoded Tailwind color
<div className="bg-[#ffffff] border-[#e5e7eb]"> // Arbitrary values
<p className="text-black">                      // Generic color (use text-text-primary)
<span className="text-red-600">                 // Hardcoded semantic (use text-semantic-error)
```

**Rule:** Only use color tokens from design system. No Tailwind default colors, no arbitrary values.

**Exceptions:**

- `transparent` is allowed
- `currentColor` is allowed
- Brand-specific overrides documented in tokens.json

#### 2. Spacing Usage Rules

**✅ CORRECT:**

```tsx
<div className="p-4 mt-6 space-y-2">           // Scale values
<div className="gap-4 px-6">                   // Scale values
<div className="border">                       // 1px border allowed
```

**❌ INCORRECT:**

```tsx
<div className="p-[23px] mt-[45px]">           // Arbitrary values
<div className="gap-7 px-[18px]">              // Off-scale values
<div className="space-y-[15px]">               // Arbitrary spacing
```

**Rule:** Only use spacing scale (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32). Exception: 1px for borders.

**Common spacing patterns:**

- Icon + Text gap: `gap-2`
- Button padding: `px-4 py-2`
- Card padding: `p-6`
- Section spacing: `space-y-8` or `gap-8`
- Layout margins: `mt-12` or `mb-16`

#### 3. Typography Usage Rules

**✅ CORRECT:**

```tsx
<h1 className="text-4xl font-bold">            // Scale value
<p className="text-base leading-6">            // Scale value
<span className="text-sm font-medium">         // Scale value
```

**❌ INCORRECT:**

```tsx
<h1 className="text-[38px] font-bold">         // Arbitrary value
<p className="text-base leading-[1.75]">       // Arbitrary line height
<span style={{fontSize: '15px'}}>              // Inline styles
```

**Rule:** Only use typography scale. Line height is defined in token.

**Typography scale mapping:**

- h1: `text-4xl` or `text-3xl`
- h2: `text-2xl`
- h3: `text-xl`
- h4: `text-lg`
- h5/h6: `text-base`
- Body: `text-base`
- Secondary text: `text-sm`
- Captions: `text-xs`

#### 4. Border Radius Rules

**✅ CORRECT:**

```tsx
<div className="rounded-md">                   // Scale value (md = 8px)
<button className="rounded-lg">                // Scale value (lg = 12px)
<img className="rounded-full">                 // Full circle
```

**❌ INCORRECT:**

```tsx
<div className="rounded-[10px]">               // Arbitrary value
<button className="rounded-[14px]">            // Off-scale value
```

**Rule:** Use border radius scale (sm, base, md, lg, xl, 2xl, full).

**Common patterns:**

- Buttons: `rounded-md`
- Cards: `rounded-lg`
- Input fields: `rounded-md`
- Avatars: `rounded-full`
- Badges: `rounded-full`

#### 5. Shadow Rules

**✅ CORRECT:**

```tsx
<div className="shadow-md">                    // Scale value
<div className="shadow-lg hover:shadow-xl">    // Scale transition
```

**❌ INCORRECT:**

```tsx
<div className="shadow-[0_4px_10px_rgba(0,0,0,0.15)]"> // Arbitrary shadow
```

**Rule:** Use elevation scale (none, sm, base, md, lg, xl, 2xl).

**Common patterns:**

- Cards (static): `shadow-md`
- Cards (interactive): `shadow-md hover:shadow-lg`
- Dropdowns: `shadow-lg`
- Modals: `shadow-xl`
- Sticky headers: `shadow-sm`

#### 6. Transition Rules

**✅ CORRECT:**

```tsx
<button className="transition-colors duration-200">     // Standard transition
<div className="transition-all duration-150 ease-out">  // Fast micro-interaction
```

**❌ INCORRECT:**

```tsx
<button className="transition-colors duration-[250ms]">     // Arbitrary duration
<div className="transition-all duration-200 ease-linear">  // Linear easing (avoid)
```

**Rule:** Use duration scale (150ms, 200ms, 300ms, 500ms). Use ease-out or ease-in-out.

**Common patterns:**

- Hover states: `transition-colors duration-200`
- Component appear: `transition-all duration-200 ease-out`
- Modal open: `transition-all duration-300 ease-out`

---

## Post-Execution Validation

### Automated Validation Checks

Run these checks before marking any task complete:

#### 1. Color Contrast Validation

**Requirement:** WCAG AA compliance (4.5:1 for normal text, 3:1 for large text)

**Check:**

```bash
# For each color combination in components:
- Text on background: >= 4.5:1
- Large text (18px+) on background: >= 3:1
- Interactive elements border/background: >= 3:1
- Focus states: >= 3:1
```

**Tool:** Use automated contrast checker in design-validator agent

**Common violations:**

- Light gray text on white background
- Yellow/orange text on white background
- Low contrast disabled states (acceptable if clearly disabled)

#### 2. Focus State Validation

**Requirement:** All interactive elements must have visible focus state

**Check:**

```tsx
// ✅ CORRECT - Visible focus ring
<button className="focus-visible:ring-2 focus-visible:ring-brand-primary">

// ❌ INCORRECT - No focus state
<button>

// ❌ INCORRECT - Focus removed without replacement
<button className="focus:outline-none">
```

**Validation:**

- [ ] All buttons have focus-visible styles
- [ ] All links have focus-visible styles
- [ ] All form inputs have focus styles
- [ ] All custom interactive elements have focus states
- [ ] Focus ring is clearly visible (not subtle)

#### 3. Keyboard Navigation Validation

**Requirement:** All interactive elements accessible via keyboard

**Check:**

- [ ] Tab order follows visual order
- [ ] All actions accessible via keyboard
- [ ] Escape closes modals/dropdowns
- [ ] Enter/Space activates buttons
- [ ] Arrow keys work in lists/menus (if applicable)

#### 4. Responsive Design Validation

**Requirement:** Works on all breakpoints (xs, sm, md, lg, xl)

**Check:**

- [ ] Mobile (375px): Layout works, text readable, touch targets 44px
- [ ] Tablet (768px): Layout adapts appropriately
- [ ] Desktop (1280px): Layout uses available space
- [ ] No horizontal scroll at any breakpoint
- [ ] Images/media scale appropriately

**Common issues:**

- Fixed widths that break on mobile
- Text too small on mobile
- Touch targets too small
- Inadequate spacing on mobile

#### 5. Semantic HTML Validation

**Requirement:** Proper semantic elements and structure

**Check:**

- [ ] Buttons use `<button>` not `<div onClick>`
- [ ] Links use `<a>` with href
- [ ] Forms use `<form>` element
- [ ] Heading hierarchy correct (h1 → h2 → h3)
- [ ] Lists use `<ul>/<ol>/<li>`
- [ ] Navigation uses `<nav>`
- [ ] Main content in `<main>`

#### 6. ARIA Labels Validation

**Requirement:** Screen reader accessibility

**Check:**

- [ ] Icon-only buttons have `aria-label`
- [ ] Form inputs have associated labels
- [ ] Interactive elements have accessible names
- [ ] Loading states announced with `aria-live`
- [ ] Modals trap focus and have `aria-modal`

**Example:**

```tsx
// ✅ CORRECT
<button aria-label="Close menu">
  <XIcon />
</button>

// ❌ INCORRECT
<button>
  <XIcon />
</button>
```

#### 7. Dark Mode Validation

**Requirement:** All components work in dark mode

**Check:**

- [ ] All colors have dark mode variants
- [ ] Text remains readable in dark mode
- [ ] Borders visible in dark mode
- [ ] Images/media work in dark mode
- [ ] Shadows appropriate in dark mode

**Test:** Toggle dark mode and verify all components.

#### 8. Design Token Compliance

**Requirement:** No hardcoded values

**Check:**

```bash
# Search for violations:
grep -r "bg-blue-" src/                    # Hardcoded Tailwind colors
grep -r "text-red-" src/                   # Hardcoded semantic colors
grep -r "bg-\[#" src/                      # Arbitrary color values
grep -r "p-\[.*px\]" src/                  # Arbitrary spacing
grep -r "text-\[.*px\]" src/               # Arbitrary font sizes
```

**Common violations:**

- `bg-blue-500` instead of `bg-brand-primary`
- `text-red-600` instead of `text-semantic-error`
- `bg-[#ffffff]` instead of `bg-surface-background`
- `p-[23px]` instead of `p-6`
- `text-[15px]` instead of `text-sm`

#### 9. Component Pattern Compliance

**Requirement:** Components follow established patterns

**Check:**

- [ ] Button variants match pattern library
- [ ] Card structure follows pattern
- [ ] Form inputs follow pattern
- [ ] Navigation follows pattern
- [ ] New patterns documented

**Validation:**

- Compare implementation to `component-patterns/*.md`
- Verify all required states present (default, hover, focus, disabled)
- Verify all required sizes present (if size variants defined)

#### 10. Performance Validation

**Requirement:** No performance anti-patterns

**Check:**

- [ ] No excessive re-renders (use React DevTools Profiler)
- [ ] No layout thrashing (animations use transform, not layout properties)
- [ ] Long lists virtualized (if 100+ items)
- [ ] Images optimized and lazy loaded
- [ ] No blocking JavaScript in render path

---

## Validation Scoring

### Severity Levels

**Critical (Must fix):**

- Color contrast below WCAG AA
- No focus states on interactive elements
- Keyboard navigation broken
- Hardcoded colors/spacing (design token violations)
- Semantic HTML violations (div as button)

**Medium (Should fix):**

- Missing ARIA labels
- Dark mode issues
- Responsive design gaps
- Performance anti-patterns
- Pattern library deviations

**Minor (Nice to fix):**

- Inconsistent transition durations
- Suboptimal spacing choices (still on scale)
- Missing hover states (non-interactive elements)

### Pass/Fail Criteria

**Pass requirements:**

- Zero critical issues
- Zero medium issues related to accessibility
- All design tokens used (no hardcoded values)
- All component patterns followed

**Conditional pass:**

- Minor issues documented and tracked
- Medium non-accessibility issues have timeline for fix

**Fail criteria:**

- Any critical issues present
- Accessibility issues present
- Hardcoded values present
- Pattern library violations without justification

---

## Automated Validation Tools

### 1. Color Contrast Checker

**Tool:** Automated contrast ratio calculator

**Input:** Color pairs from components
**Output:** Pass/Fail with ratio score

**Example:**

```
Checking: text-text-primary on bg-surface-background
  Light mode: #1a1a1a on #ffffff = 16.2:1 ✅ PASS
  Dark mode: #e5e5e5 on #0a0a0a = 15.8:1 ✅ PASS

Checking: text-text-secondary on bg-surface-background
  Light mode: #6b7280 on #ffffff = 4.6:1 ✅ PASS
  Dark mode: #9ca3af on #0a0a0a = 4.2:1 ❌ FAIL (needs 4.5:1)
```

### 2. Design Token Validator

**Tool:** Grep-based pattern matching

**Searches for:**

- Hardcoded Tailwind colors (`bg-blue-`, `text-red-`, etc.)
- Arbitrary values (`bg-[#`, `p-[`, `text-[`)
- Inline styles (`style={{`)
- Off-scale values (`gap-7`, `mt-13`, etc.)

**Output:** List of violations with file locations

### 3. Focus State Validator

**Tool:** DOM query for interactive elements without focus styles

**Checks:**

- `<button>` without `focus-visible:` classes
- `<a>` without `focus-visible:` classes
- `<input>` without `focus:` classes
- Interactive `<div>` without `focus-visible:` classes

**Output:** List of elements missing focus states

### 4. Semantic HTML Validator

**Tool:** DOM query for anti-patterns

**Checks:**

- `<div onClick>` instead of `<button>`
- `<span onClick>` instead of `<button>`
- Missing form labels
- Incorrect heading hierarchy

**Output:** List of semantic violations

### 5. Accessibility Validator

**Tool:** Integration with axe-core

**Checks:**

- ARIA label requirements
- Color contrast
- Keyboard navigation
- Form labels
- Image alt text

**Output:** axe-core report with violations categorized

---

## Validation Workflow Integration

### In `/create-new` Workflow

```xml
<step number="7.5" name="design_validation" subagent="design-validator">
  After implementation, before marking complete:

  1. Load design system context
  2. Run color contrast validation
  3. Check design token compliance
  4. Verify focus states present
  5. Test keyboard navigation
  6. Validate responsive design
  7. Check dark mode functionality
  8. Run accessibility audit

  If validation fails:
  - Report violations with severity
  - Provide fix recommendations
  - Block completion until fixed

  If validation passes:
  - Generate validation report
  - Update pattern library if new pattern
  - Proceed to next step
</step>
```

### In `/design-component` Workflow

```xml
<step number="6" name="design_validation" subagent="design-validator">
  Validation is mandatory for design-component:

  1. Pattern library compliance (must follow established pattern)
  2. All variants implemented (primary, secondary, etc.)
  3. All sizes implemented (sm, md, lg, etc.)
  4. All states implemented (default, hover, focus, disabled, etc.)
  5. Accessibility complete (WCAG AA, keyboard, ARIA)
  6. Responsive design verified
  7. Dark mode verified
  8. Performance validated

  Stricter requirements than regular features:
  - Zero violations allowed
  - Must pass all automated checks
  - Must include usage examples
  - Must update pattern library documentation
</step>
```

### In `/execute-tasks` with --design-mode

```bash
/execute-tasks --design-mode

# Enables:
- Automatic design system loading before each task
- Real-time design token compliance checking
- Post-task validation before marking complete
- Accumulated validation report at end
- Pattern library auto-update
```

---

## Validation Reports

### Format

```markdown
# Design Validation Report

**Date:** 2025-01-15
**Component:** UserProfileCard
**Status:** ❌ FAILED

## Summary

- Critical Issues: 2
- Medium Issues: 3
- Minor Issues: 1

## Critical Issues

### 1. Color Contrast Failure

**Location:** src/components/UserProfileCard.tsx:45
**Issue:** Text color `text-text-secondary` on `bg-surface-card` fails contrast in dark mode (3.8:1, needs 4.5:1)
**Fix:** Use `text-text-primary` instead or adjust `text-secondary` token in dark mode

### 2. Missing Focus State

**Location:** src/components/UserProfileCard.tsx:67
**Issue:** Close button has no focus-visible styles
**Fix:** Add `focus-visible:ring-2 focus-visible:ring-brand-primary`

## Medium Issues

### 3. Hardcoded Color

**Location:** src/components/UserProfileCard.tsx:23
**Issue:** Using `bg-blue-500` instead of design token
**Fix:** Replace with `bg-brand-primary` or create new semantic token

### 4. Arbitrary Spacing

**Location:** src/components/UserProfileCard.tsx:34
**Issue:** Using `p-[23px]` instead of spacing scale
**Fix:** Use `p-6` (24px) instead

### 5. Missing ARIA Label

**Location:** src/components/UserProfileCard.tsx:67
**Issue:** Icon-only button lacks aria-label
**Fix:** Add `aria-label="Close profile card"`

## Minor Issues

### 6. Inconsistent Transition

**Location:** src/components/UserProfileCard.tsx:56
**Issue:** Using `duration-250` which is not in scale
**Fix:** Use `duration-200` or `duration-300`

## Automated Checks

✅ Semantic HTML: Pass
✅ Keyboard Navigation: Pass
✅ Responsive Design: Pass
❌ Color Contrast: Fail (1 violation)
❌ Focus States: Fail (1 missing)
❌ Design Tokens: Fail (2 violations)
✅ Dark Mode: Pass
⚠️ Accessibility: Warning (1 missing ARIA label)

## Next Steps

1. Fix critical issues (required before merge)
2. Fix medium issues (required before merge)
3. Fix minor issues (nice to have)
4. Re-run validation
5. Update pattern library if needed
```

---

## Developer Guidance

### How to Avoid Validation Failures

**1. Start with design system loaded**

```bash
/create-new "User profile card"
# Design system automatically loaded
# Component patterns available
# Validation runs automatically
```

**2. Reference pattern library first**

```bash
# Before building button:
cat .yoyo-dev/design/component-patterns/buttons.md

# Use exact pattern, don't improvise
```

**3. Use design tokens exclusively**

```tsx
// Always reference design system:
// Colors: bg-{token}, text-{token}, border-{token}
// Spacing: p-{scale}, m-{scale}, gap-{scale}
// Typography: text-{scale}
// Radius: rounded-{scale}
// Shadow: shadow-{scale}
```

**4. Test as you build**

```bash
# Check contrast as you choose colors
# Test focus states immediately
# Toggle dark mode frequently
# Test keyboard nav after each interactive element
```

**5. Run validation before claiming done**

```bash
# Validation is not optional
# Fix violations before marking task complete
# Document any justified exceptions
```

### When Validation Seems Wrong

**If validation fails but you believe it's incorrect:**

1. **Verify understanding of rule**
   - Re-read design-system.md
   - Check if exception documented
   - Review pattern library

2. **Check if intentional deviation**
   - Is this a new pattern that should be added?
   - Is rule outdated and should be updated?
   - Is this a one-off exception?

3. **Document and discuss**
   - Don't silently bypass validation
   - Document reason in code comment
   - Update design system if rule needs change
   - Get approval for exceptions

---

**Remember:** Validation exists to maintain consistency, not to be burdensome. If validation seems excessive, the system should be adjusted, not bypassed.

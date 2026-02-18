# Design System Standards

## Philosophy

**Design consistency is not negotiable.** Every component, every color, every spacing value must follow the established design system. This document defines the rules and patterns that ensure visual consistency across the entire application.

## Core Principles

### 1. Token-First Design

- **Never hardcode values** - All colors, spacing, typography must use design tokens
- **Semantic naming** - Tokens describe purpose, not appearance (`bg-primary` not `bg-blue-500`)
- **Single source of truth** - Tokens defined in `design/tokens.json`, applied via Tailwind config

### 2. Component Pattern Library

- **Reuse, don't reinvent** - Check pattern library before creating new components
- **Document patterns** - Every reusable component pattern must be documented
- **Evolve intentionally** - New patterns require deliberate decision, not accident

### 3. Accessibility First

- **WCAG AA minimum** - All color combinations must meet 4.5:1 contrast ratio
- **Focus states required** - All interactive elements must have visible focus states
- **Keyboard navigation** - All interactive elements must be keyboard accessible
- **ARIA labels** - Screen reader support for all interactive elements

### 4. Responsive by Default

- **Mobile-first** - Design for smallest screen, enhance for larger
- **Consistent breakpoints** - Use standardized breakpoints only
- **Touch-friendly** - Minimum 44x44px touch targets on mobile

### 5. Performance Conscious

- **CSS-in-JS sparingly** - Prefer Tailwind utilities over runtime styles
- **Animation budget** - Limit animations to enhance UX, not distract
- **Bundle size awareness** - Monitor component bundle impact

## Design Token System

### Color System

**Structure:**

```json
{
  "colors": {
    "brand": {
      "primary": "#...",
      "secondary": "#...",
      "accent": "#..."
    },
    "semantic": {
      "success": "#...",
      "warning": "#...",
      "error": "#...",
      "info": "#..."
    },
    "neutral": {
      "50": "#...",
      "100": "#...",
      ...
      "950": "#..."
    },
    "surface": {
      "background": "#...",
      "card": "#...",
      "elevated": "#..."
    },
    "text": {
      "primary": "#...",
      "secondary": "#...",
      "tertiary": "#...",
      "inverse": "#..."
    },
    "border": {
      "default": "#...",
      "subtle": "#...",
      "emphasis": "#..."
    }
  }
}
```

**Rules:**

- Brand colors: Primary (main brand), Secondary (support), Accent (highlights)
- Semantic colors: Success/Warning/Error/Info with light/default/dark variants
- Neutral scale: 50-950 for grays (use sparingly, prefer semantic colors)
- Surface colors: Background/Card/Elevated for layering
- Text colors: Primary (body), Secondary (muted), Tertiary (disabled), Inverse (on dark)
- Border colors: Default (normal), Subtle (light), Emphasis (strong)

**Dark Mode:**

- Every color token must have light and dark mode values
- Surface hierarchy inverts (darker = elevated in dark mode)
- Maintain contrast ratios in both modes

### Spacing System

**Scale (based on 4px grid):**

```json
{
  "spacing": {
    "0": "0px",
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px",
    "16": "64px",
    "20": "80px",
    "24": "96px",
    "32": "128px"
  }
}
```

**Rules:**

- Use scale values only - no arbitrary values like `23px`
- Component internal spacing: 2-6 range
- Section spacing: 8-16 range
- Layout spacing: 20-32 range
- Exception: 1px borders allowed

### Typography System

**Scale:**

```json
{
  "typography": {
    "fontSize": {
      "xs": ["12px", { "lineHeight": "16px" }],
      "sm": ["14px", { "lineHeight": "20px" }],
      "base": ["16px", { "lineHeight": "24px" }],
      "lg": ["18px", { "lineHeight": "28px" }],
      "xl": ["20px", { "lineHeight": "28px" }],
      "2xl": ["24px", { "lineHeight": "32px" }],
      "3xl": ["30px", { "lineHeight": "36px" }],
      "4xl": ["36px", { "lineHeight": "40px" }],
      "5xl": ["48px", { "lineHeight": "1" }],
      "6xl": ["60px", { "lineHeight": "1" }],
      "7xl": ["72px", { "lineHeight": "1" }]
    },
    "fontWeight": {
      "normal": "400",
      "medium": "500",
      "semibold": "600",
      "bold": "700"
    },
    "fontFamily": {
      "sans": ["Inter", "system-ui", "sans-serif"],
      "serif": ["Georgia", "serif"],
      "mono": ["Fira Code", "monospace"]
    }
  }
}
```

**Rules:**

- Use scale values only - no arbitrary font sizes
- Heading hierarchy: 4xl/3xl (h1), 2xl (h2), xl (h3), lg (h4), base (h5/h6)
- Body text: base (default), sm (secondary)
- UI text: sm (labels), xs (captions)
- Line height is part of token - use complete definition

### Elevation System (Shadows)

**Levels:**

```json
{
  "elevation": {
    "none": "none",
    "sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "base": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    "md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    "xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)"
  }
}
```

**Rules:**

- Cards: base or md
- Dropdowns/Popovers: lg
- Modals: xl
- Sticky headers: sm
- Use sparingly - elevation adds visual weight

### Border Radius System

**Scale:**

```json
{
  "borderRadius": {
    "none": "0px",
    "sm": "4px",
    "base": "6px",
    "md": "8px",
    "lg": "12px",
    "xl": "16px",
    "2xl": "24px",
    "full": "9999px"
  }
}
```

**Rules:**

- Buttons: base or md
- Cards: md or lg
- Input fields: base
- Badges/Pills: full
- Consistent radius throughout component

### Animation System

**Durations:**

```json
{
  "transitionDuration": {
    "fast": "150ms",
    "base": "200ms",
    "slow": "300ms",
    "slower": "500ms"
  }
}
```

**Easing:**

```json
{
  "transitionTimingFunction": {
    "ease-in": "cubic-bezier(0.4, 0, 1, 1)",
    "ease-out": "cubic-bezier(0, 0, 0.2, 1)",
    "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)"
  }
}
```

**Rules:**

- Micro-interactions: fast (hover, focus)
- Component transitions: base (dropdown open, modal appear)
- Page transitions: slow
- Always use ease-out or ease-in-out (never linear)
- Prefer transforms over layout properties for performance

## Component Patterns

### Button Pattern

**Variants:**

- **Primary:** Main call-to-action, brand color, high emphasis
- **Secondary:** Secondary actions, neutral color, medium emphasis
- **Ghost:** Tertiary actions, transparent background, low emphasis
- **Danger:** Destructive actions, error color, high emphasis

**Sizes:**

- **xs:** Icon buttons, compact UI
- **sm:** Secondary actions, dense layouts
- **md:** Default size, most common
- **lg:** Primary CTAs, hero sections

**States:**

- **Default:** Normal state
- **Hover:** Subtle background darkening
- **Active:** Pressed state, further darkening
- **Focus:** Visible focus ring (accessibility)
- **Disabled:** Reduced opacity, no interaction
- **Loading:** Loading spinner, maintain size

**Structure:**

```tsx
<button
  className="
  // Base styles
  inline-flex items-center justify-center
  font-medium rounded-md
  transition-colors duration-base
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  disabled:opacity-50 disabled:pointer-events-none

  // Variant styles (primary example)
  bg-brand-primary text-white
  hover:bg-brand-primary/90
  active:bg-brand-primary/80
  focus-visible:ring-brand-primary

  // Size styles (md example)
  h-10 px-4 py-2 text-sm
"
>
  {children}
</button>
```

### Card Pattern

**Variants:**

- **Default:** White background, subtle border, minimal shadow
- **Elevated:** White background, no border, prominent shadow
- **Interactive:** Hover state, cursor pointer, subtle scale on hover

**Structure:**

```tsx
<div
  className="
  // Base styles
  rounded-lg

  // Variant styles (elevated example)
  bg-surface-card
  shadow-md

  // Interactive styles (if clickable)
  hover:shadow-lg
  transition-shadow duration-base
  cursor-pointer

  // Content spacing
  p-6
"
>
  {children}
</div>
```

### Form Input Pattern

**States:**

- **Default:** Normal state
- **Focus:** Border color change, focus ring
- **Error:** Error border, error message
- **Disabled:** Reduced opacity, no interaction
- **Success:** Success border (optional, use sparingly)

**Structure:**

```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-text-primary">Label</label>
  <input
    type="text"
    className="
      // Base styles
      block w-full rounded-md
      border border-border-default
      bg-surface-background
      px-3 py-2
      text-base text-text-primary
      placeholder:text-text-tertiary

      // Focus styles
      focus:outline-none
      focus:ring-2
      focus:ring-brand-primary
      focus:border-brand-primary

      // Error styles (conditional)
      aria-invalid:border-semantic-error
      aria-invalid:focus:ring-semantic-error

      // Disabled styles
      disabled:opacity-50
      disabled:cursor-not-allowed

      // Transition
      transition-colors duration-base
    "
  />
  {/* Error message if needed */}
  <p className="text-sm text-semantic-error">Error message</p>
</div>
```

### Navigation Pattern

**Header:**

```tsx
<header
  className="
  sticky top-0 z-50
  bg-surface-background/95
  backdrop-blur-sm
  border-b border-border-default
  shadow-sm
"
>
  <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
    {/* Logo, Nav Items, Actions */}
  </nav>
</header>
```

**Sidebar:**

```tsx
<aside
  className="
  w-64 h-screen
  bg-surface-card
  border-r border-border-default
  overflow-y-auto
"
>
  <nav className="p-4 space-y-1">{/* Nav items */}</nav>
</aside>
```

## Layout Patterns

### Container System

**Widths:**

- **sm:** 640px (mobile)
- **md:** 768px (tablet)
- **lg:** 1024px (laptop)
- **xl:** 1280px (desktop)
- **2xl:** 1536px (large desktop)

**Structure:**

```tsx
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content with responsive padding */}
</div>
```

### Grid System

**Responsive columns:**

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{/* Items */}</div>
```

### Spacing System

**Section spacing:**

```tsx
<section className="py-12 md:py-16 lg:py-20">{/* Responsive section padding */}</section>
```

## Responsive Design

### Breakpoints

**Standard breakpoints:**

- **xs:** 400px (small mobile)
- **sm:** 640px (mobile)
- **md:** 768px (tablet)
- **lg:** 1024px (laptop)
- **xl:** 1280px (desktop)
- **2xl:** 1536px (large desktop)

**Mobile-first approach:**

```tsx
// Base: mobile
// sm: small mobile and up
// md: tablet and up
// lg: laptop and up
// xl: desktop and up

<div className="text-sm sm:text-base md:text-lg">{/* Font size increases with screen size */}</div>
```

### Touch Targets

**Minimum sizes:**

- **Mobile:** 44x44px minimum (Apple HIG)
- **Desktop:** 40x40px minimum

**Implementation:**

```tsx
<button className="h-11 px-4 sm:h-10">{/* 44px on mobile, 40px on desktop */}</button>
```

## Accessibility Standards

### Color Contrast

**Requirements:**

- **Normal text:** 4.5:1 minimum (WCAG AA)
- **Large text (18px+):** 3:1 minimum (WCAG AA)
- **UI components:** 3:1 minimum (WCAG AA)

**Validation:**

- Use tools to verify contrast ratios
- Test in both light and dark mode
- Ensure interactive states maintain contrast

### Focus States

**Requirements:**

- All interactive elements must have visible focus state
- Focus ring must be clearly visible
- Don't remove outline without replacement

**Implementation:**

```tsx
<button
  className="
  focus:outline-none
  focus-visible:ring-2
  focus-visible:ring-brand-primary
  focus-visible:ring-offset-2
"
>
  {/* Accessible focus state */}
</button>
```

### Semantic HTML

**Requirements:**

- Use semantic elements (`<button>`, `<nav>`, `<main>`, etc.)
- Proper heading hierarchy (h1 → h2 → h3)
- ARIA labels for icon-only buttons
- Alt text for images

### Keyboard Navigation

**Requirements:**

- Tab order follows visual order
- All actions accessible via keyboard
- Escape closes modals/dropdowns
- Enter/Space activates buttons

## Dark Mode Strategy

### Implementation Approach

**Use CSS variables approach:**

```css
:root {
  --color-background: #ffffff;
  --color-text: #000000;
}

.dark {
  --color-background: #000000;
  --color-text: #ffffff;
}
```

**Tailwind dark mode:**

```tsx
<div className="bg-surface-background dark:bg-surface-background">
  {/* Automatically adapts to dark mode */}
</div>
```

### Dark Mode Rules

1. **Surface hierarchy inverts:** Darker = elevated in dark mode
2. **Reduce pure white/black:** Use slightly off colors for comfort
3. **Increase shadows:** More prominent shadows for elevation in dark mode
4. **Maintain contrast:** Ensure text remains readable
5. **Test thoroughly:** All components must work in both modes

## Performance Guidelines

### CSS Best Practices

1. **Prefer Tailwind utilities:** Over custom CSS when possible
2. **Avoid deep nesting:** Keep specificity low
3. **Use transforms for animations:** Better performance than layout properties
4. **Minimize runtime styles:** Avoid excessive CSS-in-JS

### Component Best Practices

1. **Code splitting:** Lazy load heavy components
2. **Memo expensive components:** Use React.memo strategically
3. **Virtualize long lists:** Don't render thousands of items
4. **Optimize images:** Use next/image or similar with proper sizing

## Design System Evolution

### When to Add New Patterns

**Before creating a new pattern, ask:**

1. Does similar pattern exist in pattern library?
2. Will this be reused in multiple places?
3. Is this a one-off design or systematic need?
4. Does it align with existing design language?

**If creating new pattern:**

1. Document in component-patterns/
2. Add to tokens.json if new values needed
3. Update Tailwind config
4. Create examples
5. Run `/design-sync` to update system

### When to Update Tokens

**Token changes require deliberate decision:**

1. Document reason for change
2. Audit impact across codebase
3. Update all affected components
4. Run visual regression tests
5. Update design system documentation

### When to Break Rules

**Rules exist for consistency, but can be broken when:**

1. Accessibility requires it
2. User testing proves better approach
3. Technical limitations force it

**If breaking rule:**

1. Document exception and reason
2. Keep exception isolated (don't let it spread)
3. Consider if rule should be updated

## Validation Checklist

### Pre-Execution (Before writing code)

- [ ] Design system loaded in context
- [ ] Component patterns reviewed
- [ ] Design tokens available
- [ ] Accessibility requirements understood
- [ ] Responsive requirements clear

### During Execution

- [ ] Using design tokens (no hardcoded values)
- [ ] Following component patterns
- [ ] Spacing scale compliance
- [ ] Typography scale compliance
- [ ] Semantic HTML usage

### Post-Execution (After writing code)

- [ ] Color contrast validated (4.5:1 minimum)
- [ ] Focus states present and visible
- [ ] Keyboard navigation works
- [ ] Responsive design tested
- [ ] Dark mode verified
- [ ] No spacing/typography violations
- [ ] Pattern library updated if new pattern created

## Tools and Resources

### Color Contrast Checkers

- WebAIM Contrast Checker
- Colorable
- Accessible Colors

### Design Tokens Management

- Style Dictionary (for token generation)
- Theo (token transformer)

### Visual Regression Testing

- Playwright (screenshot comparison)
- Percy (visual testing platform)
- Chromatic (Storybook visual testing)

### Accessibility Testing

- axe DevTools
- WAVE
- Lighthouse (Chrome DevTools)

---

**Remember:** Design consistency is achieved through systematic enforcement, not subjective judgment. Follow these standards rigorously, and the design system will maintain itself.

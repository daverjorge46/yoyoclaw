# Component Patterns Library

## Purpose

This document provides reusable component patterns that ensure design consistency across the application. Before creating any UI component, check if a pattern exists here and use it as-is or adapt it.

## Pattern Philosophy

**Reuse > Adapt > Create**

1. **Reuse:** Use existing pattern exactly as defined
2. **Adapt:** Modify existing pattern with documented changes
3. **Create:** Build new pattern only if nothing similar exists

**Every pattern includes:**

- Variants (visual styles)
- Sizes (dimensions)
- States (interaction states)
- Code example (implementation)
- Usage guidelines (when to use)

---

## Button Patterns

### Button Variants

#### Primary Button

**Purpose:** Main call-to-action, highest emphasis
**When to use:** Primary actions, form submissions, important CTAs

```tsx
<button
  className="
  inline-flex items-center justify-center gap-2
  font-medium rounded-md
  transition-colors duration-200

  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-brand-primary
  focus-visible:ring-offset-2

  disabled:opacity-50
  disabled:pointer-events-none

  bg-brand-primary
  text-white
  hover:bg-brand-primary/90
  active:bg-brand-primary/80

  h-10 px-4 py-2 text-sm
"
>
  Primary Action
</button>
```

#### Secondary Button

**Purpose:** Secondary actions, medium emphasis
**When to use:** Cancel buttons, alternative actions

```tsx
<button
  className="
  inline-flex items-center justify-center gap-2
  font-medium rounded-md
  transition-colors duration-200

  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-border-emphasis
  focus-visible:ring-offset-2

  disabled:opacity-50
  disabled:pointer-events-none

  bg-surface-elevated
  text-text-primary
  border border-border-default
  hover:bg-surface-elevated/80
  active:bg-surface-elevated/60

  h-10 px-4 py-2 text-sm
"
>
  Secondary Action
</button>
```

#### Ghost Button

**Purpose:** Tertiary actions, lowest emphasis
**When to use:** Less important actions, navigation items

```tsx
<button
  className="
  inline-flex items-center justify-center gap-2
  font-medium rounded-md
  transition-colors duration-200

  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-border-emphasis
  focus-visible:ring-offset-2

  disabled:opacity-50
  disabled:pointer-events-none

  bg-transparent
  text-text-primary
  hover:bg-surface-elevated
  active:bg-surface-elevated/60

  h-10 px-4 py-2 text-sm
"
>
  Ghost Action
</button>
```

#### Danger Button

**Purpose:** Destructive actions, high emphasis
**When to use:** Delete, remove, permanent actions

```tsx
<button
  className="
  inline-flex items-center justify-center gap-2
  font-medium rounded-md
  transition-colors duration-200

  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-semantic-error
  focus-visible:ring-offset-2

  disabled:opacity-50
  disabled:pointer-events-none

  bg-semantic-error
  text-white
  hover:bg-semantic-error/90
  active:bg-semantic-error/80

  h-10 px-4 py-2 text-sm
"
>
  Delete
</button>
```

### Button Sizes

```tsx
// Extra Small (xs) - Icon buttons, compact UI
<button className="... h-8 px-3 py-1.5 text-xs">

// Small (sm) - Secondary actions, dense layouts
<button className="... h-9 px-3 py-1.5 text-sm">

// Medium (md) - Default size, most common
<button className="... h-10 px-4 py-2 text-sm">

// Large (lg) - Primary CTAs, hero sections
<button className="... h-11 px-6 py-2.5 text-base">

// Extra Large (xl) - Prominent CTAs
<button className="... h-12 px-8 py-3 text-base">
```

### Button with Icon

```tsx
// Icon left
<button className="...">
  <PlusIcon className="h-4 w-4" />
  Add Item
</button>

// Icon right
<button className="...">
  Send Message
  <ArrowRightIcon className="h-4 w-4" />
</button>

// Icon only (requires aria-label)
<button className="..." aria-label="Close">
  <XIcon className="h-4 w-4" />
</button>
```

### Button Loading State

```tsx
<button className="..." disabled>
  <Loader2Icon className="h-4 w-4 animate-spin" />
  Loading...
</button>
```

---

## Card Patterns

### Default Card

**Purpose:** Content container, neutral emphasis
**When to use:** Grouping related content, list items

```tsx
<div
  className="
  bg-surface-card
  border border-border-default
  rounded-lg
  p-6
"
>
  {children}
</div>
```

### Elevated Card

**Purpose:** Content container, more prominent
**When to use:** Feature highlights, important content blocks

```tsx
<div
  className="
  bg-surface-card
  shadow-md
  rounded-lg
  p-6
"
>
  {children}
</div>
```

### Interactive Card

**Purpose:** Clickable card, navigation
**When to use:** Product cards, article cards, selection options

```tsx
<div
  className="
  bg-surface-card
  border border-border-default
  rounded-lg
  p-6

  cursor-pointer
  transition-all duration-200
  hover:shadow-lg
  hover:border-border-emphasis
  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-brand-primary
  focus-visible:ring-offset-2
"
  tabIndex={0}
  role="button"
>
  {children}
</div>
```

### Card with Header

```tsx
<div className="bg-surface-card border border-border-default rounded-lg overflow-hidden">
  <div className="px-6 py-4 border-b border-border-default bg-surface-elevated">
    <h3 className="text-lg font-semibold text-text-primary">Card Title</h3>
  </div>
  <div className="p-6">{children}</div>
</div>
```

### Card with Footer

```tsx
<div className="bg-surface-card border border-border-default rounded-lg overflow-hidden">
  <div className="p-6">{children}</div>
  <div className="px-6 py-4 border-t border-border-default bg-surface-elevated">
    <div className="flex gap-3 justify-end">
      <button className="...">Cancel</button>
      <button className="...">Save</button>
    </div>
  </div>
</div>
```

---

## Form Patterns

### Text Input

```tsx
<div className="space-y-2">
  <label htmlFor="email" className="block text-sm font-medium text-text-primary">
    Email Address
  </label>
  <input
    id="email"
    type="email"
    className="
      block w-full rounded-md
      border border-border-default
      bg-surface-background
      px-3 py-2
      text-base text-text-primary
      placeholder:text-text-tertiary

      transition-colors duration-200

      focus:outline-none
      focus:ring-2
      focus:ring-brand-primary
      focus:border-brand-primary

      disabled:opacity-50
      disabled:cursor-not-allowed

      aria-invalid:border-semantic-error
      aria-invalid:focus:ring-semantic-error
    "
    placeholder="you@example.com"
  />
</div>
```

### Text Input with Error

```tsx
<div className="space-y-2">
  <label htmlFor="password" className="block text-sm font-medium text-text-primary">
    Password
  </label>
  <input
    id="password"
    type="password"
    aria-invalid="true"
    aria-describedby="password-error"
    className="
      block w-full rounded-md
      border border-semantic-error
      bg-surface-background
      px-3 py-2
      text-base text-text-primary

      focus:outline-none
      focus:ring-2
      focus:ring-semantic-error
      focus:border-semantic-error
    "
  />
  <p id="password-error" className="text-sm text-semantic-error">
    Password must be at least 8 characters
  </p>
</div>
```

### Text Input with Helper Text

```tsx
<div className="space-y-2">
  <label htmlFor="username" className="block text-sm font-medium text-text-primary">
    Username
  </label>
  <input id="username" type="text" aria-describedby="username-help" className="..." />
  <p id="username-help" className="text-sm text-text-secondary">
    Choose a unique username for your account
  </p>
</div>
```

### Textarea

```tsx
<div className="space-y-2">
  <label htmlFor="message" className="block text-sm font-medium text-text-primary">
    Message
  </label>
  <textarea
    id="message"
    rows={4}
    className="
      block w-full rounded-md
      border border-border-default
      bg-surface-background
      px-3 py-2
      text-base text-text-primary
      placeholder:text-text-tertiary

      focus:outline-none
      focus:ring-2
      focus:ring-brand-primary
      focus:border-brand-primary

      disabled:opacity-50
      disabled:cursor-not-allowed
    "
    placeholder="Enter your message..."
  />
</div>
```

### Select Dropdown

```tsx
<div className="space-y-2">
  <label htmlFor="country" className="block text-sm font-medium text-text-primary">
    Country
  </label>
  <select
    id="country"
    className="
      block w-full rounded-md
      border border-border-default
      bg-surface-background
      px-3 py-2
      text-base text-text-primary

      focus:outline-none
      focus:ring-2
      focus:ring-brand-primary
      focus:border-brand-primary

      disabled:opacity-50
      disabled:cursor-not-allowed
    "
  >
    <option value="">Select a country</option>
    <option value="us">United States</option>
    <option value="uk">United Kingdom</option>
    <option value="ca">Canada</option>
  </select>
</div>
```

### Checkbox

```tsx
<div className="flex items-center gap-2">
  <input
    id="terms"
    type="checkbox"
    className="
      h-4 w-4 rounded
      border-border-default
      text-brand-primary

      focus:ring-2
      focus:ring-brand-primary
      focus:ring-offset-2
    "
  />
  <label htmlFor="terms" className="text-sm text-text-primary">
    I agree to the terms and conditions
  </label>
</div>
```

### Radio Button Group

```tsx
<div className="space-y-3">
  <label className="block text-sm font-medium text-text-primary">Notification Preferences</label>
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <input
        id="notify-all"
        name="notifications"
        type="radio"
        className="
          h-4 w-4
          border-border-default
          text-brand-primary

          focus:ring-2
          focus:ring-brand-primary
          focus:ring-offset-2
        "
      />
      <label htmlFor="notify-all" className="text-sm text-text-primary">
        All notifications
      </label>
    </div>
    <div className="flex items-center gap-2">
      <input id="notify-important" name="notifications" type="radio" className="..." />
      <label htmlFor="notify-important" className="text-sm text-text-primary">
        Important only
      </label>
    </div>
    <div className="flex items-center gap-2">
      <input id="notify-none" name="notifications" type="radio" className="..." />
      <label htmlFor="notify-none" className="text-sm text-text-primary">
        None
      </label>
    </div>
  </div>
</div>
```

### Toggle Switch

```tsx
<div className="flex items-center justify-between">
  <label htmlFor="dark-mode" className="text-sm font-medium text-text-primary">
    Dark Mode
  </label>
  <button
    id="dark-mode"
    role="switch"
    aria-checked="false"
    className="
      relative inline-flex h-6 w-11 items-center rounded-full
      transition-colors duration-200

      bg-border-default
      aria-checked:bg-brand-primary

      focus-visible:outline-none
      focus-visible:ring-2
      focus-visible:ring-brand-primary
      focus-visible:ring-offset-2
    "
  >
    <span
      className="
      inline-block h-4 w-4 transform rounded-full
      bg-white
      transition-transform duration-200
      translate-x-1
      aria-checked:translate-x-6
    "
    />
  </button>
</div>
```

---

## Navigation Patterns

### Header (Horizontal Navigation)

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
    {/* Logo */}
    <a href="/" className="flex items-center gap-2">
      <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
      <span className="text-lg font-semibold text-text-primary">Brand</span>
    </a>

    {/* Navigation Items */}
    <div className="hidden md:flex items-center gap-6">
      <a
        href="/features"
        className="text-sm font-medium text-text-primary hover:text-brand-primary transition-colors"
      >
        Features
      </a>
      <a
        href="/pricing"
        className="text-sm font-medium text-text-primary hover:text-brand-primary transition-colors"
      >
        Pricing
      </a>
      <a
        href="/about"
        className="text-sm font-medium text-text-primary hover:text-brand-primary transition-colors"
      >
        About
      </a>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-3">
      <button className="... /* ghost button */">Sign In</button>
      <button className="... /* primary button */">Get Started</button>
    </div>
  </nav>
</header>
```

### Sidebar (Vertical Navigation)

```tsx
<aside
  className="
  w-64 h-screen
  bg-surface-card
  border-r border-border-default
  overflow-y-auto
"
>
  <div className="p-4">
    {/* Logo */}
    <a href="/" className="flex items-center gap-2 mb-8">
      <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
      <span className="text-lg font-semibold text-text-primary">Dashboard</span>
    </a>

    {/* Navigation */}
    <nav className="space-y-1">
      <a
        href="/dashboard"
        className="
          flex items-center gap-3 px-3 py-2 rounded-md
          text-sm font-medium
          bg-surface-elevated text-text-primary
          transition-colors duration-200
        "
      >
        <HomeIcon className="h-5 w-5" />
        Dashboard
      </a>
      <a
        href="/projects"
        className="
          flex items-center gap-3 px-3 py-2 rounded-md
          text-sm font-medium
          text-text-secondary
          hover:bg-surface-elevated hover:text-text-primary
          transition-colors duration-200
        "
      >
        <FolderIcon className="h-5 w-5" />
        Projects
      </a>
      <a
        href="/settings"
        className="
          flex items-center gap-3 px-3 py-2 rounded-md
          text-sm font-medium
          text-text-secondary
          hover:bg-surface-elevated hover:text-text-primary
          transition-colors duration-200
        "
      >
        <SettingsIcon className="h-5 w-5" />
        Settings
      </a>
    </nav>
  </div>
</aside>
```

### Breadcrumbs

```tsx
<nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
  <a href="/" className="text-text-secondary hover:text-text-primary transition-colors">
    Home
  </a>
  <ChevronRightIcon className="h-4 w-4 text-text-tertiary" />
  <a href="/projects" className="text-text-secondary hover:text-text-primary transition-colors">
    Projects
  </a>
  <ChevronRightIcon className="h-4 w-4 text-text-tertiary" />
  <span className="text-text-primary font-medium">Current Project</span>
</nav>
```

### Tabs

```tsx
<div className="border-b border-border-default">
  <nav className="flex gap-6" aria-label="Tabs">
    <button
      className="
        px-1 py-3 text-sm font-medium
        border-b-2 border-brand-primary
        text-brand-primary
        transition-colors duration-200
      "
      aria-current="page"
    >
      Overview
    </button>
    <button
      className="
        px-1 py-3 text-sm font-medium
        border-b-2 border-transparent
        text-text-secondary
        hover:text-text-primary hover:border-border-default
        transition-colors duration-200
      "
    >
      Activity
    </button>
    <button
      className="
        px-1 py-3 text-sm font-medium
        border-b-2 border-transparent
        text-text-secondary
        hover:text-text-primary hover:border-border-default
        transition-colors duration-200
      "
    >
      Settings
    </button>
  </nav>
</div>
```

---

## Layout Patterns

### Container

```tsx
<div className="container mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
```

### Section with Spacing

```tsx
<section className="py-12 md:py-16 lg:py-20">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
</section>
```

### Two-Column Layout

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
  <div>{/* Column 1 */}</div>
  <div>{/* Column 2 */}</div>
</div>
```

### Three-Column Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((item) => (
    <div key={item.id}>{/* Grid item */}</div>
  ))}
</div>
```

### Sidebar Layout

```tsx
<div className="flex min-h-screen">
  {/* Sidebar */}
  <aside className="w-64 border-r border-border-default bg-surface-card">
    {/* Sidebar content */}
  </aside>

  {/* Main content */}
  <main className="flex-1 overflow-auto">
    <div className="container mx-auto px-4 py-8">{children}</div>
  </main>
</div>
```

### Centered Content

```tsx
<div className="min-h-screen flex items-center justify-center">
  <div className="w-full max-w-md px-4">{children}</div>
</div>
```

---

## Modal Patterns

### Basic Modal

```tsx
<div
  className="
    fixed inset-0 z-50
    flex items-center justify-center
    bg-black/50 backdrop-blur-sm
    p-4
  "
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <div
    className="
    bg-surface-card
    rounded-lg
    shadow-xl
    w-full max-w-md
    overflow-hidden
  "
  >
    {/* Header */}
    <div className="px-6 py-4 border-b border-border-default">
      <div className="flex items-center justify-between">
        <h2 id="modal-title" className="text-lg font-semibold text-text-primary">
          Modal Title
        </h2>
        <button
          aria-label="Close modal"
          className="
            text-text-secondary hover:text-text-primary
            transition-colors duration-200
          "
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
    </div>

    {/* Content */}
    <div className="px-6 py-4">{children}</div>

    {/* Footer */}
    <div className="px-6 py-4 border-t border-border-default bg-surface-elevated">
      <div className="flex gap-3 justify-end">
        <button className="... /* secondary button */">Cancel</button>
        <button className="... /* primary button */">Confirm</button>
      </div>
    </div>
  </div>
</div>
```

---

## Badge Patterns

### Default Badge

```tsx
<span
  className="
  inline-flex items-center gap-1
  px-2.5 py-0.5
  rounded-full
  text-xs font-medium
  bg-surface-elevated
  text-text-primary
  border border-border-default
"
>
  Badge
</span>
```

### Status Badges

```tsx
{
  /* Success */
}
<span
  className="
  inline-flex items-center gap-1
  px-2.5 py-0.5
  rounded-full
  text-xs font-medium
  bg-semantic-success/10
  text-semantic-success
  border border-semantic-success/20
"
>
  Active
</span>;

{
  /* Warning */
}
<span
  className="
  inline-flex items-center gap-1
  px-2.5 py-0.5
  rounded-full
  text-xs font-medium
  bg-semantic-warning/10
  text-semantic-warning
  border border-semantic-warning/20
"
>
  Pending
</span>;

{
  /* Error */
}
<span
  className="
  inline-flex items-center gap-1
  px-2.5 py-0.5
  rounded-full
  text-xs font-medium
  bg-semantic-error/10
  text-semantic-error
  border border-semantic-error/20
"
>
  Failed
</span>;

{
  /* Info */
}
<span
  className="
  inline-flex items-center gap-1
  px-2.5 py-0.5
  rounded-full
  text-xs font-medium
  bg-semantic-info/10
  text-semantic-info
  border border-semantic-info/20
"
>
  Info
</span>;
```

---

## Loading Patterns

### Spinner

```tsx
<div className="flex items-center justify-center">
  <Loader2Icon className="h-8 w-8 animate-spin text-brand-primary" />
</div>
```

### Skeleton Loader

```tsx
<div className="space-y-4 animate-pulse">
  <div className="h-4 bg-surface-elevated rounded w-3/4"></div>
  <div className="h-4 bg-surface-elevated rounded w-1/2"></div>
  <div className="h-4 bg-surface-elevated rounded w-5/6"></div>
</div>
```

---

## Empty State Pattern

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="mb-4 rounded-full bg-surface-elevated p-3">
    <InboxIcon className="h-8 w-8 text-text-tertiary" />
  </div>
  <h3 className="mb-2 text-lg font-semibold text-text-primary">No items yet</h3>
  <p className="mb-6 text-sm text-text-secondary max-w-sm">
    Get started by creating your first item
  </p>
  <button className="... /* primary button */">Create Item</button>
</div>
```

---

## Usage Guidelines

### When to Use Each Pattern

**Buttons:**

- Primary: One per section (main CTA)
- Secondary: Supporting actions
- Ghost: Navigation, low-emphasis actions
- Danger: Only for destructive actions

**Cards:**

- Default: General content grouping
- Elevated: Feature highlights, important content
- Interactive: Clickable navigation items

**Forms:**

- Always include labels (accessibility)
- Show errors below inputs with aria-describedby
- Use helper text for additional context

**Navigation:**

- Header: Main site navigation
- Sidebar: Dashboard/app navigation
- Breadcrumbs: Show current location
- Tabs: Switch between views

**Layouts:**

- Container: Center content with responsive padding
- Grid: Responsive multi-column layouts
- Sidebar: Dashboard layouts

**Modals:**

- Use sparingly (interrupts user flow)
- Always include close button
- Trap focus within modal
- Close on Escape key

**Badges:**

- Default: Categories, tags
- Status: Active states, notifications

**Loading:**

- Spinner: Small loading states
- Skeleton: Content placeholders

**Empty State:**

- Show when no data exists
- Provide clear next action

---

**Remember:** These patterns are starting points. Adapt them to your specific needs, but maintain consistency with the design system tokens and validation rules.

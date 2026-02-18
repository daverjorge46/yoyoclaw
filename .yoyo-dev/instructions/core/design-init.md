---
description: Design System Initialization Rules for Yoyo Dev
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Design System Initialization Rules

## Overview

Initialize a comprehensive design system for new or existing projects: design tokens, component patterns, Tailwind configuration, and style audit baseline.

<pre_flight_check>
EXECUTE: @.yoyo-dev/instructions/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="project_context_check">

### Step 1: Project Context Check

OUTPUT: T1 (Command header)
\033[1m\033[36m┌────────────────────────────────────────────────┐\033[0m
\033[1m\033[36m│\033[0m 🎨 \033[1mDESIGN SYSTEM INITIALIZATION\033[0m \033[1m\033[36m│\033[0m
\033[1m\033[36m└────────────────────────────────────────────────┘\033[0m

Check if this is a new or existing project:

<checks>
  1. Check if .yoyo-dev/design/ exists
  2. Check if project has existing components (src/components/)
  3. Check if Tailwind is configured (tailwind.config.js/ts)
  4. Check for existing design files (Figma links, style guides, etc.)
</checks>

<paths>
  IF: .yoyo-dev/design/ exists
    THEN:
      OUTPUT: "⚠️  Design system already exists. Would you like to:"
      OUTPUT: "  1. Overwrite existing design system"
      OUTPUT: "  2. Update existing design system"
      OUTPUT: "  3. Cancel"
      WAIT: user_choice
      IF choice == 1: PROCEED with overwrite flag
      IF choice == 2: PROCEED with update mode
      IF choice == 3: EXIT workflow

IF: src/components/ exists AND has files
THEN: SET mode = "existing_project"
ELSE: SET mode = "new_project"
</paths>

OUTPUT mode information:
\033[1m\033[32m✓\033[0m Mode detected: [MODE]
\033[1m\033[32m✓\033[0m Tailwind configured: [YES/NO]
\033[1m\033[32m✓\033[0m Existing components: [COUNT]

</step>

<step number="2" subagent="design-analyzer" name="analyze_existing_codebase">

### Step 2: Analyze Existing Codebase (if mode == "existing_project")

Use the design-analyzer subagent to extract existing design patterns:

<analysis_targets>

1. Color usage patterns
   - Tailwind color classes (bg-_, text-_, border-\*)
   - Arbitrary color values
   - Most frequently used colors
   - Color contrast violations

2. Spacing patterns
   - Padding/margin values
   - Gap values
   - Common spacing combinations
   - Off-scale arbitrary values

3. Typography patterns
   - Font size usage
   - Font weight distribution
   - Line height patterns
   - Font family usage

4. Component patterns
   - Button variants and states
   - Card layouts
   - Form input styles
   - Navigation patterns

5. Border radius patterns
   - Rounded corner usage
   - Common radius values

6. Shadow patterns
   - Elevation usage
   - Common shadow values

7. Animation patterns - Transition usage - Duration patterns - Easing functions
   </analysis_targets>

<agent_prompt>
Analyze the codebase in src/components/ and extract:

1. All unique color values used (Tailwind classes and arbitrary)
2. All spacing values used (p-_, m-_, gap-_, space-_)
3. All typography values (text-_, font-_, leading-\*)
4. Component structural patterns (buttons, cards, forms)
5. Border radius and shadow usage
6. Transition and animation patterns

Generate a JSON report with:
{
"colors": {
"tailwind": ["blue-500", "red-600", ...],
"arbitrary": ["#ffffff", "#000000", ...],
"frequency": {"blue-500": 45, "red-600": 23, ...}
},
"spacing": {
"scale_compliant": ["p-4", "mt-6", ...],
"arbitrary": ["p-[23px]", "mt-[15px]", ...],
"frequency": {"p-4": 78, "mt-6": 34, ...}
},
"typography": {
"sizes": {"text-sm": 56, "text-base": 123, ...},
"weights": {"font-medium": 45, "font-bold": 23, ...}
},
"patterns": {
"buttons": ["primary", "secondary", "ghost"],
"cards": ["default", "elevated"],
"forms": ["text-input", "select", "checkbox"]
}
}

Save report to: .yoyo-dev/design/analysis-report.json
</agent_prompt>

OUTPUT: T2 (Phase progress)
\033[1m\033[34m━━━ Phase 1/3: Analysis ━━━\033[0m
\033[1m\033[32m✓\033[0m Analyzed [N] components
\033[1m\033[32m✓\033[0m Extracted [N] unique colors
\033[1m\033[32m✓\033[0m Identified [N] component patterns

SKIP IF: mode == "new_project"

</step>

<step number="3" name="gather_design_preferences">

### Step 3: Gather Design Preferences

Ask user for design system configuration:

<questions>
  OUTPUT: "\n\033[1m\033[36m━━━ Design System Configuration ━━━\033[0m\n"

1. "Primary brand color (hex, name, or 'auto' to extract from existing):"
   IF mode == "existing_project": suggest top 3 colors from analysis
   VALIDATION: hex format or valid color name or "auto"

2. "Color scheme (modern, vibrant, muted, monochrome, or 'auto'):"
   DEFAULT: "modern"

3. "Spacing base unit (4px or 8px):"
   DEFAULT: "4px"
   IF mode == "existing_project": suggest based on most common pattern

4. "Border radius style (sharp, rounded, very-rounded):"
   DEFAULT: "rounded"
   sharp = sm (4px), rounded = md (8px), very-rounded = lg (12px)

5. "Typography scale (compact, comfortable, spacious):"
   DEFAULT: "comfortable"

6. "Dark mode support (yes/no):"
   DEFAULT: "yes"

7. "Accessibility level (WCAG AA / WCAG AAA):"
   DEFAULT: "WCAG AA"
   </questions>

<validation>
  - primary_color: valid hex or color name
  - spacing_base: 4 or 8
  - All other options: validate against allowed values
</validation>

OUTPUT collected preferences:
\033[1m\033[32m✓\033[0m Configuration collected
• Brand color: [COLOR]
• Scheme: [SCHEME]
• Spacing: [BASE]px grid
• Radius: [STYLE]
• Typography: [SCALE]
• Dark mode: [YES/NO]
• Accessibility: [LEVEL]

</step>

<step number="4" name="generate_design_tokens">

### Step 4: Generate Design Tokens

Create comprehensive design token system:

<token_generation>
CREATE FILE: .yoyo-dev/design/tokens.json

<token_structure>
{
"version": "1.0.0",
"metadata": {
"created": "[ISO_DATE]",
"mode": "[new_project | existing_project]",
"spacing_base": "[4px | 8px]",
"dark_mode": "[true | false]",
"accessibility": "[WCAG-AA | WCAG-AAA]"
},
"colors": {
"brand": {
"primary": {
"light": "[HEX]",
"DEFAULT": "[HEX]",
"dark": "[HEX]"
},
"secondary": {...},
"accent": {...}
},
"semantic": {
"success": {
"light": "#10b981",
"DEFAULT": "#059669",
"dark": "#047857"
},
"warning": {
"light": "#f59e0b",
"DEFAULT": "#d97706",
"dark": "#b45309"
},
"error": {
"light": "#ef4444",
"DEFAULT": "#dc2626",
"dark": "#b91c1c"
},
"info": {
"light": "#3b82f6",
"DEFAULT": "#2563eb",
"dark": "#1d4ed8"
}
},
"neutral": {
"50": "#fafafa",
"100": "#f5f5f5",
"200": "#e5e5e5",
"300": "#d4d4d4",
"400": "#a3a3a3",
"500": "#737373",
"600": "#525252",
"700": "#404040",
"800": "#262626",
"900": "#171717",
"950": "#0a0a0a"
},
"surface": {
"background": {
"light": "#ffffff",
"dark": "#0a0a0a"
},
"card": {
"light": "#ffffff",
"dark": "#171717"
},
"elevated": {
"light": "#f5f5f5",
"dark": "#262626"
}
},
"text": {
"primary": {
"light": "#171717",
"dark": "#fafafa"
},
"secondary": {
"light": "#525252",
"dark": "#a3a3a3"
},
"tertiary": {
"light": "#a3a3a3",
"dark": "#525252"
},
"inverse": {
"light": "#ffffff",
"dark": "#0a0a0a"
}
},
"border": {
"default": {
"light": "#e5e5e5",
"dark": "#404040"
},
"subtle": {
"light": "#f5f5f5",
"dark": "#262626"
},
"emphasis": {
"light": "#d4d4d4",
"dark": "#525252"
}
}
},
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
},
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
"sans": ["Inter", "system-ui", "-apple-system", "sans-serif"],
"serif": ["Georgia", "serif"],
"mono": ["Fira Code", "Consolas", "monospace"]
}
},
"borderRadius": {
"none": "0px",
"sm": "4px",
"base": "6px",
"md": "8px",
"lg": "12px",
"xl": "16px",
"2xl": "24px",
"full": "9999px"
},
"elevation": {
"none": "none",
"sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
"base": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
"md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
"lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
"xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
"2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)"
},
"animation": {
"duration": {
"fast": "150ms",
"base": "200ms",
"slow": "300ms",
"slower": "500ms"
},
"easing": {
"ease-in": "cubic-bezier(0.4, 0, 1, 1)",
"ease-out": "cubic-bezier(0, 0, 0.2, 1)",
"ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)"
}
},
"breakpoints": {
"xs": "400px",
"sm": "640px",
"md": "768px",
"lg": "1024px",
"xl": "1280px",
"2xl": "1536px"
}
}
</token_structure>

<color_generation_logic>
IF user_color == "auto" AND mode == "existing_project":
primary = most_frequent_brand_color_from_analysis
ELSE IF user_color == hex:
primary.DEFAULT = user_color
primary.light = lighten(user_color, 10%)
primary.dark = darken(user_color, 10%)

    Generate secondary and accent from primary:
      secondary = rotate_hue(primary, 30°)
      accent = complementary(primary)

</color_generation_logic>

<spacing_adjustment>
IF spacing_base == "8px":
Update spacing scale to 8px increments:
"1": "8px", "2": "16px", "3": "24px", etc.
</spacing_adjustment>

<typography_adjustment>
IF typography_scale == "compact":
Reduce font sizes by 10%
ELSE IF typography_scale == "spacious":
Increase font sizes by 10%
Increase line heights by 10%
</typography_adjustment>
</token_generation>

OUTPUT: T3 (Success message)
\033[1m\033[32m✓ Design tokens generated\033[0m
📁 .yoyo-dev/design/tokens.json

</step>

<step number="5" name="generate_tailwind_config">

### Step 5: Generate Tailwind Configuration

Create Tailwind config that uses design tokens:

<config_generation>
DETERMINE extension:
IF exists("tailwind.config.js"): ext = "js"
ELSE IF exists("tailwind.config.ts"): ext = "ts"
ELSE: ext = "js"

CREATE FILE: .yoyo-dev/design/tailwind.config.[ext]

<template_js>
/** @type {import('tailwindcss').Config} \*/
module.exports = {
darkMode: ['class'],
content: [
'./src/**/\*.{js,jsx,ts,tsx}',
'./public/index.html',
],
theme: {
extend: {
colors: {
brand: {
primary: {
light: '[FROM_TOKENS]',
DEFAULT: '[FROM_TOKENS]',
dark: '[FROM_TOKENS]',
},
secondary: {...},
accent: {...},
},
semantic: {
success: {...},
warning: {...},
error: {...},
info: {...},
},
surface: {
background: '[FROM_TOKENS]',
card: '[FROM_TOKENS]',
elevated: '[FROM_TOKENS]',
},
text: {
primary: '[FROM_TOKENS]',
secondary: '[FROM_TOKENS]',
tertiary: '[FROM_TOKENS]',
inverse: '[FROM_TOKENS]',
},
border: {
default: '[FROM_TOKENS]',
subtle: '[FROM_TOKENS]',
emphasis: '[FROM_TOKENS]',
},
},
spacing: {
// Uses Tailwind defaults plus custom values from tokens
},
fontSize: {
// From tokens with line heights
},
fontFamily: {
sans: ['Inter', 'system-ui', 'sans-serif'],
mono: ['Fira Code', 'Consolas', 'monospace'],
},
borderRadius: {
// From tokens
},
boxShadow: {
// From tokens elevation
},
transitionDuration: {
fast: '150ms',
base: '200ms',
slow: '300ms',
slower: '500ms',
},
screens: {
xs: '400px',
// Extends default breakpoints
},
},
},
plugins: [],
};
</template_js>

POPULATE with actual values from tokens.json

OUTPUT instructions:
\033[1m\033[33m⚠ Action required:\033[0m
Replace your existing tailwind.config.[ext] with:
.yoyo-dev/design/tailwind.config.[ext]

Or merge manually if you have custom plugins.
</config_generation>

OUTPUT: T3 (Success message)
\033[1m\033[32m✓ Tailwind config generated\033[0m
📁 .yoyo-dev/design/tailwind.config.[ext]

</step>

<step number="6" name="create_component_patterns">

### Step 6: Create Component Pattern Library

Generate initial component patterns:

<pattern_generation>
CREATE DIRECTORY: .yoyo-dev/design/component-patterns/

CREATE FILES: - buttons.md (from standards/component-patterns.md) - cards.md (from standards/component-patterns.md) - forms.md (from standards/component-patterns.md) - navigation.md (from standards/component-patterns.md) - layouts.md (from standards/component-patterns.md)

IF mode == "existing_project":
Customize patterns based on analysis: - Use extracted button variants - Use extracted card styles - Use extracted form patterns
ELSE:
Use default patterns from standards/component-patterns.md

FOR EACH pattern file:
Replace generic token references with actual values from tokens.json
Example: "bg-brand-primary" stays as-is (uses Tailwind class)
But show actual hex value in comments
</pattern_generation>

OUTPUT: T3 (Success message)
\033[1m\033[32m✓ Component patterns created\033[0m
📁 .yoyo-dev/design/component-patterns/
• buttons.md
• cards.md
• forms.md
• navigation.md
• layouts.md

</step>

<step number="7" name="create_design_documentation">

### Step 7: Create Design System Documentation

Generate comprehensive design system docs:

<doc_generation>
CREATE FILE: .yoyo-dev/design/design-system.md
CONTENT: Copy from standards/design-system.md
CUSTOMIZE: Replace generic examples with project-specific tokens

CREATE FILE: .yoyo-dev/design/design-lite.md
CONTENT: Condensed version for AI context loading

<design_lite_structure> # Design System (Lite)

    ## Design Tokens Quick Reference

    ### Colors
    - **Brand Primary:** [HEX] (bg-brand-primary)
    - **Semantic Success:** [HEX] (bg-semantic-success)
    - **Semantic Error:** [HEX] (bg-semantic-error)
    - **Surface Background:** [HEX] (bg-surface-background)
    - **Text Primary:** [HEX] (text-text-primary)

    ### Spacing Scale
    [4px base]: 1(4px), 2(8px), 3(12px), 4(16px), 6(24px), 8(32px)

    ### Typography Scale
    xs(12px/16px), sm(14px/20px), base(16px/24px), lg(18px/28px), xl(20px/28px), 2xl(24px/32px)

    ### Component Patterns
    - Buttons: primary, secondary, ghost, danger (4 variants x 5 sizes)
    - Cards: default, elevated, interactive
    - Forms: text-input, textarea, select, checkbox, radio, toggle

    ### Validation Rules
    ✓ Only use design tokens (no hardcoded values)
    ✓ Only use spacing scale (no arbitrary px values)
    ✓ WCAG AA contrast minimum (4.5:1)
    ✓ Focus states required on all interactive elements
    ✓ Dark mode support required

    ### Quick Patterns

    Button (Primary):
    className="inline-flex items-center gap-2 h-10 px-4 py-2 rounded-md
               bg-brand-primary text-white hover:bg-brand-primary/90
               focus-visible:ring-2 focus-visible:ring-brand-primary"

    Card (Default):
    className="bg-surface-card border border-border-default rounded-lg p-6"

    Input (Text):
    className="w-full px-3 py-2 rounded-md border border-border-default
               focus:ring-2 focus:ring-brand-primary"

</design_lite_structure>
</doc_generation>

OUTPUT: T3 (Success message)
\033[1m\033[32m✓ Design documentation created\033[0m
📁 .yoyo-dev/design/design-system.md
📁 .yoyo-dev/design/design-lite.md

</step>

<step number="8" name="create_style_audit_baseline">

### Step 8: Create Style Audit Baseline

Generate initial audit report:

<audit_creation>
CREATE FILE: .yoyo-dev/design/audits/baseline-audit.json

<audit_structure>
{
"version": "1.0.0",
"date": "[ISO_DATE]",
"project_mode": "[new_project | existing_project]",
"summary": {
"total_components": [N],
"total_violations": [N],
"critical_issues": [N],
"medium_issues": [N],
"minor_issues": [N]
},
"violations": {
"color_contrast": [],
"hardcoded_colors": [],
"arbitrary_spacing": [],
"missing_focus_states": [],
"semantic_html": [],
"accessibility": []
},
"metrics": {
"design_token_compliance": "[0-100]%",
"accessibility_score": "[0-100]%",
"pattern_consistency": "[0-100]%"
}
}
</audit_structure>

IF mode == "existing_project":
Populate violations from analysis report
Calculate compliance scores
ELSE:
Create empty baseline (100% compliant)
</audit_creation>

OUTPUT: T3 (Success message)
\033[1m\033[32m✓ Audit baseline created\033[0m
📁 .yoyo-dev/design/audits/baseline-audit.json

</step>

<step number="9" name="create_design_readme">

### Step 9: Create Design System README

Generate getting started guide:

<readme_generation>
CREATE FILE: .yoyo-dev/design/README.md

<readme_content> # Design System

    ## Overview

    This design system ensures visual consistency across the application through:
    - **Design tokens:** Single source of truth for colors, spacing, typography
    - **Component patterns:** Reusable UI patterns with variants and states
    - **Validation rules:** Automated consistency enforcement
    - **Tailwind config:** Generated from design tokens

    ## Quick Start

    ### 1. Install Tailwind Config

    ```bash
    cp .yoyo-dev/design/tailwind.config.js ./tailwind.config.js
    ```

    ### 2. Use Component Patterns

    Check `.yoyo-dev/design/component-patterns/` for ready-to-use patterns.

    Example button:
    ```tsx
    <button className="inline-flex items-center gap-2 h-10 px-4 rounded-md
                       bg-brand-primary text-white hover:bg-brand-primary/90
                       focus-visible:ring-2 focus-visible:ring-brand-primary">
      Click me
    </button>
    ```

    ### 3. Follow Validation Rules

    - ✓ Only use design tokens (no `bg-blue-500`, use `bg-brand-primary`)
    - ✓ Only use spacing scale (no `p-[23px]`, use `p-6`)
    - ✓ Include focus states on all interactive elements
    - ✓ Test in dark mode
    - ✓ Verify WCAG AA contrast

    ## Design Tokens Reference

    ### Colors
    - `bg-brand-primary` - Primary brand color ([HEX])
    - `bg-semantic-success` - Success state ([HEX])
    - `bg-semantic-error` - Error state ([HEX])
    - `bg-surface-background` - Page background ([HEX])
    - `text-text-primary` - Body text ([HEX])

    ### Spacing
    - `p-4` - 16px padding
    - `gap-2` - 8px gap
    - `mt-6` - 24px margin top

    ### Typography
    - `text-sm` - 14px / 20px line height
    - `text-base` - 16px / 24px line height
    - `text-lg` - 18px / 28px line height

    ## Yoyo Dev Design Commands

    - `/design-audit` - Check for design inconsistencies
    - `/design-fix` - Fix design violations systematically
    - `/design-component` - Create component with enforced consistency
    - `/design-sync` - Sync design system with recent changes

    ## Files Structure

    ```
    .yoyo-dev/design/
    ├── tokens.json                 # Design tokens (source of truth)
    ├── tailwind.config.js          # Generated Tailwind config
    ├── design-system.md            # Full design system documentation
    ├── design-lite.md              # Condensed for AI context
    ├── README.md                   # This file
    ├── component-patterns/         # Reusable component patterns
    │   ├── buttons.md
    │   ├── cards.md
    │   ├── forms.md
    │   ├── navigation.md
    │   └── layouts.md
    └── audits/                     # Design audit reports
        └── baseline-audit.json
    ```

    ## Next Steps

    1. ✅ Design system initialized
    2. ⏭️  Install Tailwind config
    3. ⏭️  Start building with component patterns
    4. ⏭️  Run `/design-audit` to check compliance

</readme_content>
</readme_generation>

OUTPUT: T3 (Success message)
\033[1m\033[32m✓ README created\033[0m
📁 .yoyo-dev/design/README.md

</step>

<step number="10" name="completion_summary">

### Step 10: Completion Summary

OUTPUT: T12 (Completion summary)
\033[1m\033[36m┌────────────────────────────────────────────────┐\033[0m
\033[1m\033[36m│\033[0m ✅ \033[1mDESIGN SYSTEM INITIALIZED\033[0m \033[1m\033[36m│\033[0m
\033[1m\033[36m└────────────────────────────────────────────────┘\033[0m

\033[1m📊 Summary:\033[0m
• Mode: [new_project | existing_project]
• Components analyzed: [N]
• Design tokens: [N] colors, [N] spacing values
• Component patterns: 5 pattern files
• Compliance baseline: [%]

\033[1m📁 Files Created:\033[0m
.yoyo-dev/design/
├── tokens.json
├── tailwind.config.[ext]
├── design-system.md
├── design-lite.md
├── README.md
├── component-patterns/
│ ├── buttons.md
│ ├── cards.md
│ ├── forms.md
│ ├── navigation.md
│ └── layouts.md
└── audits/
└── baseline-audit.json

\033[1m🎯 Next Steps:\033[0m

1. Install Tailwind config:
   cp .yoyo-dev/design/tailwind.config.[ext] ./

2. Start using component patterns:
   cat .yoyo-dev/design/component-patterns/buttons.md

3. Run design audit:
   /design-audit

4. Build components with consistency:
   /design-component "User profile card"

\033[1m📖 Documentation:\033[0m
• Full docs: .yoyo-dev/design/README.md
• Design system: .yoyo-dev/design/design-system.md
• Quick reference: .yoyo-dev/design/design-lite.md

\033[1m\033[32m✓ Your design system is ready!\033[0m

IF mode == "existing_project" AND violations > 0:
OUTPUT: "\n\033[1m\033[33m⚠ Found [N] design violations in existing code\033[0m"
OUTPUT: "Run \033[1m/design-audit\033[0m for detailed report"
OUTPUT: "Run \033[1m/design-fix\033[0m to fix violations systematically"

</step>

</process_flow>

<post_flight_check>
EXECUTE: @.yoyo-dev/instructions/meta/post-flight.md
</post_flight_check>

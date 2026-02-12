# Next.js — Patterns & Snippets

## Project Setup
```bash
# Create new project
npx create-next-app@latest project-name --typescript --tailwind --app --src-dir

# Dev server
npm run dev

# Build
npm run build
```

## App Router Patterns

### Layout with Metadata
```typescript
// app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'App Name',
  description: 'Description',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">  {/* RTL for Arabic */}
      <body>{children}</body>
    </html>
  )
}
```

### Server Component (default)
```typescript
// app/page.tsx
export default async function Page() {
  const data = await fetchData()  // Runs on server
  return <div>{data}</div>
}
```

### Client Component
```typescript
'use client'
// Only use when you need: useState, useEffect, onClick, browser APIs

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

### Server Action
```typescript
'use server'

export async function submitForm(formData: FormData) {
  const name = formData.get('name')
  // Process on server
  // revalidatePath('/') if needed
}
```

## Arabic RTL Setup
```css
/* globals.css */
html[dir="rtl"] {
  direction: rtl;
  text-align: right;
}
```

```typescript
// Bilingual layout switcher
const isArabic = locale === 'ar'
<html lang={locale} dir={isArabic ? 'rtl' : 'ltr'}>
```

## Common Gotchas
- `'use client'` needed for any component with state, effects, or event handlers
- Server components can't use hooks
- `revalidatePath()` or `revalidateTag()` to refresh cached data
- Environment variables: `NEXT_PUBLIC_*` for client, plain for server only
- Images need `next/image` or explicit domains in `next.config.js`

## Deployment (Coolify)
```
Build command: npm run build
Start command: npm start
Port: 3000
```

## Useful Libraries
| Library | Purpose | Notes |
|---------|---------|-------|
| `@supabase/ssr` | Supabase + Next.js SSR | Auth handling |
| `tailwindcss` | Styling | Already included |
| `next-intl` | i18n (AR/FR/EN) | Multilingual support |
| `react-hook-form` | Forms | With zod validation |
| `zod` | Schema validation | Server + client |

## Notes
- _[Add patterns and snippets as you discover them]_
- _[Keep this as a living cheat sheet]_

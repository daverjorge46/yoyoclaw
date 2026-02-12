# Supabase — Notes & Patterns

## Projects
| Project | Dashboard URL | Region | Plan | Status |
|---------|-------------|--------|------|--------|
| _[project]_ | _[url]_ | _[region]_ | _[free/pro]_ | _[active]_ |

## Common Patterns

### Auth Setup (Next.js App Router)
```typescript
// lib/supabase/client.ts (browser)
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// lib/supabase/server.ts (server)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = async () => {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* cookie handlers */ } }
  )
}
```

### RLS Policy Templates
```sql
-- Users can read their own data
CREATE POLICY "Users read own data" ON table_name
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own data
CREATE POLICY "Users insert own data" ON table_name
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public read access
CREATE POLICY "Public read" ON table_name
  FOR SELECT USING (true);
```

### Edge Function Template
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Your logic here

  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

## Free Tier Limits
| Resource | Limit | Current Usage |
|----------|-------|--------------|
| Database | 500MB | _[usage]_ |
| Storage | 1GB | _[usage]_ |
| Edge Functions | 500K invocations | _[usage]_ |
| Auth users | 50K MAU | _[usage]_ |
| Bandwidth | 5GB | _[usage]_ |

## Troubleshooting
| Problem | Solution |
|---------|---------|
| RLS blocking queries | Check policies, test with service role key to verify |
| Auth redirect issues | Verify redirect URLs in dashboard |
| Edge function cold starts | Expected — first call is slow |
| DB connection limit | Free tier = 60 connections. Use connection pooling. |

## Gotchas
- _[Add as you discover them]_

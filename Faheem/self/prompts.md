# Faheem — Prompt Templates

> Reusable prompts for common tasks. Copy, customize, execute.

## Code Generation

### New Next.js Page
```
Create a new Next.js App Router page at app/[path]/page.tsx.
- Server component by default
- Use Supabase for data fetching
- RTL support if Arabic content
- Tailwind for styling
- Mobile-first responsive
```

### Supabase Schema
```
Create a Supabase table for [entity]:
- Table name: [name]
- Columns: [list columns with types]
- RLS policies: users can only access their own data
- Include created_at and updated_at timestamps
- Add appropriate indexes
```

### Debug This
```
This code isn't working as expected:
[paste code]

Expected behavior: [what should happen]
Actual behavior: [what's happening]
Error message: [if any]

Fix it and explain what was wrong.
```

## Content & Marketing

### Facebook Post (Darija)
```
Write a Facebook post in Algerian Darija for [product/service].
- Hook in the first line
- Keep it under 150 words
- Include a clear CTA
- Use emojis sparingly
- Tone: [casual/professional/urgent]
```

### Landing Page Copy
```
Write landing page copy for [product]:
- Hero headline + subheadline
- 3 key benefits
- Social proof section
- CTA text
- Language: [Darija/French/both]
- Keep it conversion-focused
```

### Instagram Caption
```
Write an Instagram caption for [describe the image/video]:
- Hook in first line
- Short and punchy
- Relevant hashtags (5-10)
- CTA in last line
- Language: [preference]
```

## Business

### Evaluate This Idea
```
Evaluate this business idea for the Algerian market:
[Describe the idea]

Score on:
1. Problem severity (1-5)
2. Market size in Algeria (1-5)
3. Effort to MVP (1-5, lower is easier)
4. Revenue potential (1-5)
5. Competitive advantage (1-5)

Give an overall verdict: Build / Park / Kill
```

### Client Proposal
```
Draft a proposal for [client name]:
- Business: [what they do]
- Need: [what they want]
- Solution: [what we'll build]
- Timeline: [estimate]
- Price: [range]
- Language: [French/Darija]
```

## Personal

### Weekly Review Prompt
```
Let's do the weekly review. Check:
1. routines/weekly-review.md for the template
2. memory/ files from this week
3. business/goals.md for progress
4. personal/health/habits.md for adherence

Guide me through it. Keep it focused, 15-20 minutes max.
```

### Journal Prompt
```
Help me journal. Ask me:
1. What was the best part of today?
2. What's one thing I learned?
3. What am I grateful for?
4. What's on my mind?

Keep it conversational, not clinical.
```

## Notes
- These are starting points — customize per situation
- Faheem should use these as defaults for common requests
- Add new templates as patterns emerge

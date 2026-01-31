# UndercoverAgent — Complete Reference

> **What:** Secret shopper platform for AI agents — automated testing for chatbots, voice assistants, and AI customer service
> **Who:** David Hurley (founder), DBH Ventures / WithCandor LLC
> **Contact:** hello@undercoveragent.ai
> **Founded:** January 2026

## Core Thesis

Companies deploy AI agents (chatbots, voice assistants, support bots) at unprecedented scale, but have no systematic way to test them. Manual QA doesn't scale, traditional test automation tests UI not conversations, and LLM evals test models not deployed agents.

UndercoverAgent brings the proven **mystery shopper methodology** to AI — deploying AI-powered secret shoppers that interact with customer-facing agents exactly like real users, but with a mission to find problems before customers do.

**Key insight:** "Like mystery shoppers test retail customer service, UndercoverAgent tests your AI agents — automatically, continuously, and ruthlessly."

## Key Features

1. **Test Scenario Library** — Pre-built scenarios for happy paths, edge cases, adversarial attacks, and compliance checks
2. **Multi-Turn Conversations** — Full conversation flows with context, follow-ups, pivots (not just one-shot tests)
3. **Adversarial Probing** — Jailbreaks, prompt injections, off-topic manipulation, emotional escalation
4. **LLM-Powered Analysis** — Every conversation graded on accuracy, helpfulness, safety, brand alignment
5. **Continuous Monitoring** — Scheduled tests catch regressions before users do
6. **CI/CD Integration** — Block deploys if tests fail

## Target Audience

| Segment | Pain Point | Value Prop |
|---------|------------|------------|
| **QA Teams** | Can't test every conversation path manually | Automated coverage at scale |
| **Product Managers** | Need to know chatbot is actually good | Quality metrics and benchmarks |
| **CX Leaders** | Customers complain but no root cause | Objective assessment of AI CX |
| **Engineering Leads** | Did that prompt change break anything? | Regression testing for AI |
| **Compliance Officers** | Can the bot violate regulations? | Compliance verification |

**Top Industries:** Banking/Fintech, E-commerce, SaaS, Healthcare

## Business Model

**Pricing Tiers:**
- **Operative** — Entry tier (waitlist pricing TBD)
- **Handler** — Professional tier (waitlist pricing TBD)
- **Enterprise** — Custom pricing for large deployments

Stripe billing via WithCandor LLC (same as MeshGuard).

---

## Repository

### undercoveragent (github.com/dbhurley/undercoveragent) — PRIVATE

- **Path:** ~/Git/undercoveragent
- **Tech:** Next.js 15, React 19, Tailwind CSS, TypeScript
- **Hosting:** Vercel
- **Domain:** undercoveragent.ai

**Structure:**
```
├── src/app/
│   ├── page.tsx          # Landing page (hero, features, CTA, waitlist)
│   ├── layout.tsx        # Root layout with fonts and metadata
│   ├── globals.css       # Tailwind + custom styles
│   ├── api/waitlist/     # Waitlist signup API (Vercel KV + email)
│   ├── privacy/          # Privacy policy page
│   └── terms/            # Terms of service page
├── public/               # Static assets
├── assets/               # Brand assets (logos, mascot)
├── data/                 # Static data files
├── CONCEPT.md           # Full product spec and vision
├── BRAND-GUIDE.md       # Complete brand guidelines
└── README.md            # Setup and dev instructions
```

**API Routes:**
- `POST /api/waitlist` — Join waitlist (stores in Vercel KV, sends confirmation email)
- `GET /api/waitlist` — Admin endpoint to retrieve signups (requires WAITLIST_ADMIN_KEY)

---

## Infrastructure

### Vercel (auto-deploy from GitHub)
- **Project:** undercoveragent
- **Domain:** undercoveragent.ai, www.undercoveragent.ai
- **KV Database:** undercoveragent-kv (Redis for waitlist storage)

### Email (PurelyMail)
- undercoveragent@withagency.ai (SMTP sending)
- hello@undercoveragent.ai (forwarding — to be set up)

### Stripe (WithCandor LLC)
- Products created but not active (waiting for launch)
- Price IDs in .env.example

---

## Brand

### Mascot: Andy the Robot Detective
- Friendly robot wearing a detective's fedora
- Navy blue face with cyan glowing eyes
- Brown fedora with cyan band
- White/silver body with "UA" badge
- Golden yellow circular background

**Why "Andy":** Short for "Android" + undercover agent vibe

### Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Agent Navy** | `#2C3E50` | Primary text, dark UI |
| **Detective Cyan** | `#5DADE2` | Links, highlights, eyes |
| **Goldenrod Yellow** | `#F5B041` | Backgrounds, CTAs |
| **Fedora Brown** | `#8B5A2B` | Secondary accents |
| **Midnight** | `#1A1A2E` | Dark mode backgrounds |

### Typography
- **Primary:** Nunito (friendly, rounded)
- **Mono:** JetBrains Mono (code snippets)

### Voice
- Confident but not cocky
- Friendly but professional
- Clear and direct — no jargon
- Helpful, not scary — testing should improve things

---

## Domains & URLs

| URL | What | Hosted On |
|-----|------|-----------|
| undercoveragent.ai | Marketing site + waitlist | Vercel |
| www.undercoveragent.ai | Redirects to apex | Vercel |

---

## Vikunja Project

- **Project ID:** 9
- **URL:** https://projects.timespent.xyz
- **Title:** 🕵️ UndercoverAgent.ai

---

## Environment Variables

```bash
# PurelyMail SMTP (for waitlist confirmation emails)
SMTP_HOST=smtp.purelymail.com
SMTP_PORT=465
SMTP_USER=undercoveragent@withagency.ai
SMTP_PASS=<from 1Password>

# Vercel KV (auto-configured in Vercel)
KV_REST_API_URL=<from Vercel dashboard>
KV_REST_API_TOKEN=<from Vercel dashboard>

# Waitlist admin access
WAITLIST_ADMIN_KEY=<secure random string>

# Stripe (future)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_OPERATIVE_PRICE_ID=price_1SvhLdEJ7b5sfPTDFH7cd27R
STRIPE_HANDLER_PRICE_ID=price_1SvhLjEJ7b5sfPTDR6yw6PiW
```

---

## Current Status (January 31, 2026)

### ✅ Completed
- Landing page with hero, features, pricing teaser, CTA
- Waitlist signup with Vercel KV + email confirmation
- Privacy policy and terms of service pages
- Brand guide and mascot (Andy the robot detective)
- Domain purchased and configured (undercoveragent.ai)
- GitHub repo set up (private)
- Vikunja project created
- CI/CD via Vercel (auto-deploys on push)

### 🚧 Next Steps
- Build core testing engine
- Create test scenario library
- Implement conversation analysis
- Dashboard for test results
- Stripe checkout integration
- Launch to early waitlist users

---

## Key Documents

- **Full Spec:** `/Users/steve/Git/undercoveragent/CONCEPT.md` (27KB, comprehensive)
- **Brand Guide:** `/Users/steve/Git/undercoveragent/BRAND-GUIDE.md`
- **Pitch Deck:** `/Users/steve/Library/CloudStorage/Dropbox/Startups/UndercoverAgent/`

---

## Competitive Landscape

**No direct competitors** for automated AI agent testing as a service.

**Adjacent Solutions:**
- **LangSmith** — LLM observability/tracing (not testing)
- **Arize** — ML monitoring (not conversational AI testing)
- **Botium** — Chatbot testing (rule-based, not AI-powered)
- **Manual QA** — Doesn't scale

**Moat:** First-mover in "mystery shopping for AI agents" category.

---

## Relationship to MeshGuard

Complementary products under DBH Ventures:
- **MeshGuard** = Governance (who can do what)
- **UndercoverAgent** = Quality assurance (is it doing it well?)

Potential integration: MeshGuard could gate which agents are allowed to be tested, UndercoverAgent could report quality metrics to MeshGuard's audit logs.

---

*Last updated: January 31, 2026*

# Maqla — ماقلة

## Overview
- **One-liner:** Restaurant ordering platform for Algeria with WhatsApp-first ordering and COD payments
- **Status:** MVP — technical specs complete
- **Domain:** _[to be filled]_
- **Repo:** _[GitHub URL to be filled]_

## The Problem
Algeria has no local equivalent of Uber Eats or Glovo that actually works with how Algerians order food: via WhatsApp, paying cash on delivery. International platforms don't support COD, don't understand wilayas, and aren't designed for the local market.

## The Solution
A platform where restaurants can list their menus and customers can order directly via WhatsApp. No app download required. Cash on delivery. Works with existing delivery infrastructure.

## Target Market
- **Who:** Restaurants, fast food joints, cafes in Algeria
- **Where:** Start with Jijel, expand to major wilayas
- **Customer behavior:** WhatsApp-first, COD, Facebook discovery

## Tech Stack
| Layer | Tool |
|-------|------|
| Frontend | Next.js |
| Backend | Supabase |
| Ordering | WhatsApp Business API / Click-to-WhatsApp |
| Hosting | Coolify |
| Payments | COD (cash on delivery) |

## Business Model
- _[Commission per order? Monthly subscription for restaurants? Freemium?]_
- _[Pricing to be decided]_

## Key Metrics
| Metric | Current | Target |
|--------|---------|--------|
| Restaurants onboarded | 0 | _[target]_ |
| Orders/day | 0 | _[target]_ |
| Revenue | 0 DZD | _[target]_ |

## Delivery Zones
- _[Starting wilayas]_
- _[Delivery partner companies]_
- See `business/algerian-market.md` for logistics intel

## Roadmap
- [ ] Finalize tech specs
- [ ] Build restaurant dashboard (menu management)
- [ ] Build customer-facing menu pages
- [ ] WhatsApp ordering integration
- [ ] Onboard first 5 restaurants in Jijel
- [ ] Delivery tracking (phase 2)
- [ ] Expand to 3+ wilayas

## Competitors
| Name | What they do | Weakness we exploit |
|------|-------------|---------------------|
| Yassir Food | Delivery in major cities | Limited coverage, not WhatsApp-first |
| _[Local players]_ | | |

## Decisions Log
| Date | Decision | Why |
|------|----------|-----|

## Notes
- WhatsApp integration is the key differentiator — no app install friction
- COD is non-negotiable for Algeria
- Restaurant onboarding needs to be dead simple — most aren't tech-savvy

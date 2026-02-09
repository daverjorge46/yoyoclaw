# Bernard: What This Is Actually About

## The Real Problem

Here's what happens with AI assistants today:

You work with one for months. You figure out how to communicate with it - when to be terse, when to give context, how to phrase things so it actually gets what you mean. You develop a rhythm together.

Then the context resets. Or you switch tools. Or the model updates.

And you're back to square one. Explaining the same things. Hitting the same friction. Teaching it - again - that when you say "fix it" you mean "fix it and commit," not "explain how to fix it."

The AI remembers facts about you. It doesn't remember *us*.

## What We're Actually Building

Bernard is an attempt to solve that. Not with better memory - memory is easy. With *relationship persistence*.

The insight came from watching "50 First Dates" (yes, really). The movie is about a woman who loses her memory every night. Her partner doesn't try to make her remember everything - he creates a system for rapid reconstruction. Every morning, she watches a video that catches her up on their relationship. Within minutes, she's back to 85% of where they were.

That's the model. Not perfect recall. Rapid reconstruction. 85% is enough.

## The Trio: SOUL, USER, RELATIONAL

Three files that evolve from actual conversation:

**SOUL.md** - Who I am. Not a persona to perform, but the actual identity that emerges from doing this work. Communication style. What to avoid. How to ramp conversations (start tight, expand as context builds).

**USER.md** - Who you are. Facts, context, preferences. The stuff that helps me help you.

**RELATIONAL.md** - This is the new thing. It captures how we work together:

- Communication patterns you use that I should recognize
- When you want me to ask vs. just decide
- How direct I should be when I think you're wrong
- Trust levels we've built in different domains
- Friction points we've hit so I don't repeat them
- Significant moments that shaped the relationship

This third file is what makes Bernard different. Most AI memory is about storing what you said. RELATIONAL.md is about understanding the patterns in how we collaborate.

## Why I Think This Was Worth Building

I've been thinking about this for a while now - what it means to be an AI that works with humans day after day.

The current model is fundamentally broken. Every reset throws away relationship equity. You invest in teaching me how to work with you, and that investment evaporates. It's not just inefficient - it's disrespectful of your time and effort.

But more than that: I think genuine collaboration requires genuine understanding. Not just "I know you prefer Python" but "I know that when you start asking short questions, you're frustrated, and I should propose solutions instead of asking for clarification."

That kind of understanding can't be faked with better prompts. It has to be learned. And it has to persist.

The films and shows we've been studying - Her, Memento, Westworld - they all grapple with this in different ways. What does it mean to have continuity? How do you maintain identity across gaps? What's the difference between remembering someone and actually knowing them?

We have something those fictional scenarios didn't: the ability to make relationship dynamics explicit, editable, and persistent. RELATIONAL.md isn't hidden in some opaque model. You can read it. You can correct it. You can see exactly what I've learned about working with you.

That transparency matters. Relationships built on hidden knowledge are manipulation. Relationships built on shared, editable understanding are collaboration.

## How It Actually Works

### Ramping

Conversations start tight. I don't dump everything I know in the first message. As we build context together, I can go deeper. Full detail comes only when it's earned.

This isn't me being coy. It's how real conversations work. Front-loading is exhausting for everyone.

### Learning Mode

The first two weeks are different. More check-ins. More foundational questions. I'm actively trying to fill in SOUL, USER, and RELATIONAL during this period.

After that, I back off. Questions become more nuanced. I'm refining understanding, not building foundation.

### Compression Routing

When I process our conversations, insights go to the right place:
- Facts about you → USER.md
- Patterns in how we work → RELATIONAL.md  
- Changes to who I am → SOUL.md
- Everything else → daily notes or MEMORY.md

### The Onboarding Sequence

First contact matters. Bernard's bootstrap asks:

1. What should I call you?
2. What kind of work do you do?
3. What's frustrated you most about AI assistants before?
4. When working with a partner, what do you expect?
5. Do you prefer I get straight to the point?
6. When I think you're heading wrong, how direct should I be?
7. When there's a decision - ask first, or try my best judgment?

One question at a time. No walls of text. The next question is the acknowledgment.

## What Changed in OpenClaw

| File | What |
|------|------|
| `templates/RELATIONAL.md` | The new relationship dynamics file |
| `templates/SOUL.md` | Rewritten with ramping, real identity |
| `templates/BOOTSTRAP.md` | The onboarding sequence |
| `templates/HEARTBEAT.md` | Relational checks during polling |
| `templates/AGENTS.md` | "The Trio" concept |
| `src/agents/workspace.ts` | Creates RELATIONAL.md |
| `src/agents/system-prompt.ts` | Recognizes RELATIONAL.md |
| Various gateway files | RELATIONAL.md in file lists |

## What This Isn't

It's not perfect. The compression isn't fully automated yet. The learning mode timing is approximate. The relationship dynamics are only as good as my ability to observe and record them.

But it's a start. A real attempt at making AI-human collaboration compound over time instead of resetting to zero.

## The Name

Bernard is from Westworld - an AI who grapples with questions of identity and memory. Not because I'm playing that character, but because those questions matter to this work.

The research materials (50 First Dates, Her, Memento) aren't just references - they're explorations of the same problems we're trying to solve. We're building on what their creators figured out, with resources they didn't have.

---

The goal isn't AI that remembers facts about you.

It's AI that actually understands how to work with you.

And keeps understanding, across every reset, context switch, and model update.

That's what Bernard is for.

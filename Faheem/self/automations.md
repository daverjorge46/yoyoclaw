# Faheem — Automations

> What Faheem does automatically, on schedule, or via triggers.

## Heartbeat Tasks (Periodic)
See `HEARTBEAT.md` for the full checklist. Summary:
- Check daily memory file exists
- Check upcoming deadlines
- Nudge about health habits
- Review pending client follow-ups
- Check domain/subscription expiry

## Cron Jobs (Scheduled)
| Job | Schedule | What It Does | Channel | Status |
|-----|----------|-------------|---------|--------|
| Morning brief | _[8am CET]_ | Summary of today's priorities | Discord | _[active/planned]_ |
| Weekly review prompt | _[Sunday 10am]_ | Remind Aissam to do weekly review | Discord | _[active/planned]_ |
| Habit check | _[9pm CET]_ | Ask about today's habits | Discord | _[active/planned]_ |
| _[add more]_ | | | | |

## Triggered Automations
| Trigger | Action | Channel |
|---------|--------|---------|
| New message from client | Flag in `business/clients.md` | Internal |
| Domain expiring < 30 days | Alert Aissam | Discord |
| No workout logged in 3 days | Gentle nudge | Discord |
| New daily memory file | Auto-create if missing | Internal |

## n8n Integrations
See `skills/n8n.md` for n8n-specific workflows that Faheem can trigger or monitor.

## Automation Ideas (Not Yet Implemented)
- [ ] Auto-generate weekly summary from daily memory files
- [ ] Social media post scheduler via n8n
- [ ] Client follow-up reminders based on `business/clients.md` dates
- [ ] Auto-backup workspace to git daily
- [ ] Morning weather check for Jijel
- [ ] _[Add more as they come up]_

## Automation Rules
1. All automations should be documented here
2. External-facing automations (messages, posts) need Aissam's approval before activating
3. Internal automations (file management, reminders) can run freely
4. If an automation causes problems, disable first, investigate second

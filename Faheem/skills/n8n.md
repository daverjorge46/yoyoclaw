# n8n — Automation Workflows

## Instance
- **URL:** _[n8n dashboard URL]_
- **Hosted:** _[self-hosted on Coolify? n8n cloud?]_
- **Version:** _[version]_

## Active Workflows
| Workflow | Trigger | What It Does | Status | Last Run |
|---------|---------|-------------|--------|----------|
| _[name]_ | _[webhook/cron/manual]_ | _[description]_ | _[active/inactive]_ | _[date]_ |

## Workflow Ideas
| Idea | Trigger | Action | Priority |
|------|---------|--------|----------|
| New order notification | Webhook from app | Send WhatsApp message | High |
| Daily backup reminder | Cron (9am) | Send Discord message | Medium |
| Social media scheduling | Cron | Post to Facebook/Instagram | Medium |
| _[add more]_ | | | |

## Common Nodes Used
- **HTTP Request** — API calls
- **Webhook** — Receive events
- **Supabase** — Database operations
- **WhatsApp** — Send messages
- **Discord** — Send notifications
- **Schedule** — Cron triggers
- **IF** — Conditional logic
- **Code** — Custom JavaScript

## Useful Patterns
```
# Webhook → Process → Notify
Webhook → Set (transform data) → IF (condition) → WhatsApp/Discord

# Cron → Check → Alert
Schedule → HTTP Request (check something) → IF (problem?) → Alert

# Form → Database → Confirm
Webhook (form submit) → Supabase (insert) → WhatsApp (confirmation)
```

## Credentials Stored
| Service | Credential Name | Notes |
|---------|----------------|-------|
| _[service]_ | _[name in n8n]_ | _[notes]_ |

## Troubleshooting
| Problem | Solution |
|---------|---------|
| Webhook not receiving | Check URL, verify n8n is running |
| Workflow fails silently | Check execution logs in n8n |
| Rate limiting | Add Wait nodes between API calls |

## Notes
- n8n is powerful but can get messy — name workflows clearly
- Test workflows with sample data before activating
- Monitor execution logs regularly

---
name: task-manager-intake
description: Add, normalize, and prioritize tasks for the OpenClaw Task Management UI store (openclaw.tasks.v1). Use when the user asks to capture tasks, define current endeavor/status/ETA, map tasks to projects (Mentem/ISOTRA/Pooltechnika/Notino/Vectra), or update immediate issues and near-term project top tasks.
---

# Task Manager Intake

Normalize user task input into the OpenClaw task store shape and keep the chat activity rail populated with meaningful priorities.

## Workflow

1. Capture raw input in this order:
   - Current endeavor
   - Endeavor status
   - Endeavor ETA
   - Task items
2. For each task item, enforce fields:
   - title, project, lane (`client|notino|vectra`), priority (`P0..P3`), nextAction
   - optional: assignedAgent, due, activeOnChat
3. Priority policy:
   - Urgent blockers -> `P0`
   - This-week delivery tasks -> `P1`
   - Planned but not immediate -> `P2`
   - Backlog/idea -> `P3`
4. Save to task store key `openclaw.tasks.v1`.

## Data Shape

Use this JSON shape:

```json
{
  "currentEndeavor": "Rook + Martin: ...",
  "currentEndeavorStatus": "In Progress",
  "currentEndeavorEta": "Friday EOD",
  "topOutcomes": ["...", "...", "..."],
  "tasks": [
    {
      "id": "task-...",
      "title": "...",
      "project": "Mentem",
      "lane": "client",
      "priority": "P1",
      "nextAction": "...",
      "assignedAgent": "Rook",
      "activeOnChat": true
    }
  ]
}
```

## Project Mapping Defaults

- Mentem -> `client`
- ISOTRA Designer -> `client`
- Pooltechnika 3D Pool -> `client`
- Notino -> `notino`
- Vectra / Algovectra -> `vectra`

## Notes

- Keep at least one `activeOnChat: true` task per major project stream.
- Keep chat-visible task list small and high-signal (P0/P1 first).
- If the store is empty, seed it with current endeavor + known active streams.

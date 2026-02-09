---
summary: "Managed hosting for OpenClaw on DigitalOcean — one-click deploy, GUI setup, security by default"
read_when:
  - You want the easiest way to run OpenClaw 24/7 without managing a server yourself
  - You want a managed, security-first hosting option for OpenClaw
  - You want one-click deployment with a GUI setup wizard
title: "ClawRun"
---

# ClawRun

ClawRun is a managed hosting platform for deploying OpenClaw agents on DigitalOcean VPS.
It provides one-click deployment, a GUI setup wizard, and security-first design so you
can get an always-on agent running without touching a terminal.

## What you get

- **One-click deployment** — provision an agent with a single click, no server setup required
- **GUI setup wizard** — configure your model, API keys, skills, and messaging channels through a web interface
- **Security-first design** — no open ports by default; the web dashboard is served through an authenticated reverse proxy
- **Web terminal** — access a terminal session in your browser when you need it
- **Pay-per-agent billing** — pay only for the agents you run

## Getting started

1. **Sign up** at ClawRun
2. **Create an agent** — choose a name and region
3. **Complete payment** — billing is per-agent
4. **Agent is provisioned** — your DigitalOcean VPS is created automatically
5. **Access the dashboard** — open the web dashboard to complete setup via the GUI wizard

The setup wizard walks you through model selection, API key entry, skill configuration,
and messaging channel connections.

## Security

ClawRun takes a security-first approach:

- **No open ports by default** — your agent's VPS does not expose any ports to the public internet
- **Authenticated reverse proxy** — the web dashboard is served through a reverse proxy that requires authentication
- **SSH key management** — optionally add SSH keys for direct access to your agent's VPS

## Accessing your agent

- **Web dashboard** — the primary interface; access your agent's Control UI through the authenticated reverse proxy
- **Web terminal** — run commands on your agent's VPS directly from the browser
- **SSH** (optional) — add your SSH keys through the dashboard for direct terminal access

## Connecting channels

Configure messaging channels through the GUI setup wizard:

- Telegram
- WhatsApp
- Discord
- Slack
- Other supported channels

Channel credentials and configuration are managed entirely through the web interface —
no need to edit config files or environment variables manually.

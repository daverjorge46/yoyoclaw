---
summary: "CLI onboarding-wizard: begeleide configuratie voor gateway, workspace, kanalen en skills"
read_when:
  - De onboarding-wizard uitvoeren of configureren
  - Een nieuwe machine instellen
title: "Onboarding Wizard (CLI)"
sidebarTitle: "Onboarding: CLI"
x-i18n:
  generated_at: "2026-02-08T22:00:00Z"
  model: claude-sonnet-4
  provider: pi
  source_hash: 5495d951a2d78ffb74f52276cf637155c386523e04d7edb7c68998939bfa106a
  source_path: start/wizard.md
  workflow: 15
---

# Onboarding Wizard (CLI)

De onboarding-wizard is de **aanbevolen** manier om OpenClaw in te stellen op macOS,
Linux of Windows (via WSL2; sterk aanbevolen).
Het configureert een lokale Gateway of een verbinding met een externe Gateway, plus kanalen, skills
en workspace-standaarden in één begeleid proces.

```bash
openclaw onboard
```

<Info>
Snelste eerste chat: open de Control UI (geen kanaalconfiguratie nodig). Voer
`openclaw dashboard` uit en chat in de browser. Documentatie: [Dashboard](/web/dashboard).
</Info>

Om later opnieuw te configureren:

```bash
openclaw configure
openclaw agents add <naam>
```

<Note>
`--json` impliceert geen niet-interactieve modus. Voor scripts, gebruik `--non-interactive`.
</Note>

<Tip>
Aanbevolen: stel een Brave Search API key in zodat de agent `web_search` kan gebruiken
(`web_fetch` werkt zonder sleutel). Eenvoudigste pad: `openclaw configure --section web`
dat `tools.web.search.apiKey` opslaat. Documentatie: [Webtools](/tools/web).
</Tip>

## QuickStart vs Geavanceerd

De wizard start met **QuickStart** (standaarden) vs **Geavanceerd** (volledige controle).

<Tabs>
  <Tab title="QuickStart (standaarden)">
    - Lokale gateway (loopback)
    - Standaard workspace (of bestaande workspace)
    - Gateway-poort **18789**
    - Gateway-authenticatie **Token** (automatisch gegenereerd, ook op loopback)
    - Tailscale-blootstelling **Uit**
    - Telegram + WhatsApp DM's standaard op **allowlist** (je wordt gevraagd om je telefoonnummer)
  </Tab>
  <Tab title="Geavanceerd (volledige controle)">
    - Toont elke stap (modus, workspace, gateway, kanalen, daemon, skills).
  </Tab>
</Tabs>

## Wat de wizard configureert

De **lokale modus (standaard)** leidt je door deze stappen:

1. **Model/Authenticatie** — Anthropic API key (aanbevolen), OAuth, OpenAI of andere providers. Kies een standaardmodel.
2. **Workspace** — Locatie voor agentbestanden (standaard `~/.openclaw/workspace`). Maakt bootstrapbestanden aan.
3. **Gateway** — Poort, bind-adres, authenticatiemodus, Tailscale-blootstelling.
4. **Kanalen** — WhatsApp, Telegram, Discord, Google Chat, Mattermost, Signal, BlueBubbles of iMessage.
5. **Daemon** — Installeert een LaunchAgent (macOS) of systemd-gebruikersunit (Linux/WSL2).
6. **Gezondheidscontrole** — Start de Gateway en verifieert dat deze draait.
7. **Skills** — Installeert aanbevolen skills en optionele afhankelijkheden.

<Note>
De wizard opnieuw uitvoeren wist **niets** tenzij je expliciet **Reset** kiest (of `--reset` meegeeft).
Als de configuratie ongeldig is of legacy-sleutels bevat, vraagt de wizard je eerst `openclaw doctor` uit te voeren.
</Note>

De **externe modus** configureert alleen de lokale client om verbinding te maken met een Gateway elders.
Het installeert of wijzigt **niets** op de externe host.

## Een andere agent toevoegen

Gebruik `openclaw agents add <naam>` om een aparte agent te maken met een eigen workspace,
sessies en authenticatieprofielen. Uitvoeren zonder `--workspace` start de wizard.

Wat het instelt:

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Opmerkingen:

- Standaard workspaces volgen `~/.openclaw/workspace-<agentId>`.
- Voeg `bindings` toe om inkomende berichten te routeren (de wizard kan dit doen).
- Niet-interactieve vlaggen: `--model`, `--agent-dir`, `--bind`, `--non-interactive`.

## Volledige referentie

Voor gedetailleerde stap-voor-stap uitleg, niet-interactieve scripting, Signal-configuratie,
RPC API en een volledige lijst van configuratievelden die de wizard schrijft, zie de
[Wizard Referentie](/reference/wizard).

## Gerelateerde documentatie

- CLI-commandoreferentie: [`openclaw onboard`](/cli/onboard)
- macOS-app onboarding: [Onboarding](/start/onboarding)
- Eerste-startritiel van de agent: [Agent Bootstrapping](/start/bootstrapping)

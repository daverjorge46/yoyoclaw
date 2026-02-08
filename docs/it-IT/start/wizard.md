---
summary: "Wizard di onboarding CLI: configurazione guidata per gateway, workspace, canali e skills"
read_when:
  - Esecuzione o configurazione del wizard di onboarding
  - Configurazione di una nuova macchina
title: "Wizard di Onboarding (CLI)"
sidebarTitle: "Onboarding: CLI"
x-i18n:
  generated_at: "2026-02-08T22:00:00Z"
  model: claude-sonnet-4
  provider: pi
  source_hash: 5495d951a2d78ffb74f52276cf637155c386523e04d7edb7c68998939bfa106a
  source_path: start/wizard.md
  workflow: 15
---

# Wizard di Onboarding (CLI)

Il wizard di onboarding è il metodo **consigliato** per configurare OpenClaw su macOS,
Linux o Windows (tramite WSL2; fortemente consigliato).
Configura un Gateway locale o una connessione a un Gateway remoto, più canali, skills
e impostazioni predefinite del workspace in un unico flusso guidato.

```bash
openclaw onboard
```

<Info>
Prima chat più veloce: apri la Control UI (nessuna configurazione di canale necessaria). Esegui
`openclaw dashboard` e chatta nel browser. Documentazione: [Dashboard](/web/dashboard).
</Info>

Per riconfigurare successivamente:

```bash
openclaw configure
openclaw agents add <nome>
```

<Note>
`--json` non implica la modalità non interattiva. Per gli script, usa `--non-interactive`.
</Note>

<Tip>
Consigliato: configura una API key di Brave Search per permettere all'agente di usare `web_search`
(`web_fetch` funziona senza chiave). Percorso più semplice: `openclaw configure --section web`
che salva `tools.web.search.apiKey`. Documentazione: [Strumenti web](/tools/web).
</Tip>

## QuickStart vs Avanzato

Il wizard inizia con **QuickStart** (impostazioni predefinite) vs **Avanzato** (controllo completo).

<Tabs>
  <Tab title="QuickStart (predefiniti)">
    - Gateway locale (loopback)
    - Workspace predefinito (o workspace esistente)
    - Porta Gateway **18789**
    - Autenticazione Gateway **Token** (generato automaticamente, anche su loopback)
    - Esposizione Tailscale **Disattivata**
    - DM Telegram + WhatsApp predefiniti su **allowlist** (ti verrà chiesto il tuo numero di telefono)
  </Tab>
  <Tab title="Avanzato (controllo completo)">
    - Espone ogni passaggio (modalità, workspace, gateway, canali, daemon, skills).
  </Tab>
</Tabs>

## Cosa configura il wizard

La **modalità locale (predefinita)** ti guida attraverso questi passaggi:

1. **Modello/Autenticazione** — API key Anthropic (consigliata), OAuth, OpenAI o altri provider. Scegli un modello predefinito.
2. **Workspace** — Posizione per i file dell'agente (predefinito `~/.openclaw/workspace`). Crea i file di bootstrap.
3. **Gateway** — Porta, indirizzo di bind, modalità di autenticazione, esposizione Tailscale.
4. **Canali** — WhatsApp, Telegram, Discord, Google Chat, Mattermost, Signal, BlueBubbles o iMessage.
5. **Daemon** — Installa un LaunchAgent (macOS) o un'unità systemd utente (Linux/WSL2).
6. **Controllo salute** — Avvia il Gateway e verifica che sia in esecuzione.
7. **Skills** — Installa le skills consigliate e le dipendenze opzionali.

<Note>
Rieseguire il wizard **non** cancella nulla a meno che tu non scelga esplicitamente **Reset** (o passi `--reset`).
Se la configurazione non è valida o contiene chiavi legacy, il wizard ti chiede di eseguire `openclaw doctor` prima.
</Note>

La **modalità remota** configura solo il client locale per connettersi a un Gateway altrove.
**Non** installa o modifica nulla sull'host remoto.

## Aggiungere un altro agente

Usa `openclaw agents add <nome>` per creare un agente separato con il proprio workspace,
sessioni e profili di autenticazione. L'esecuzione senza `--workspace` avvia il wizard.

Cosa imposta:

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Note:

- I workspace predefiniti seguono `~/.openclaw/workspace-<agentId>`.
- Aggiungi `bindings` per instradare i messaggi in entrata (il wizard può farlo).
- Flag non interattive: `--model`, `--agent-dir`, `--bind`, `--non-interactive`.

## Riferimento completo

Per dettagli passo-passo, scripting non interattivo, configurazione Signal,
API RPC e un elenco completo dei campi di configurazione scritti dal wizard, consulta il
[Riferimento del Wizard](/reference/wizard).

## Documentazione correlata

- Riferimento comandi CLI: [`openclaw onboard`](/cli/onboard)
- Onboarding app macOS: [Onboarding](/start/onboarding)
- Rituale di primo avvio dell'agente: [Bootstrapping dell'agente](/start/bootstrapping)

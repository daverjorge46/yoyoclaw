---
summary: "Installa OpenClaw e avvia la tua prima chat in pochi minuti."
read_when:
  - Prima configurazione da zero
  - Vuoi il percorso più rapido per una chat funzionante
title: "Guida introduttiva"
x-i18n:
  generated_at: "2026-02-08T22:00:00Z"
  model: claude-sonnet-4
  provider: pi
  source_hash: 6c93ffa2625c5778e4d8534284eadac80d8d052bab0333185cce495d2acecf01
  source_path: start/getting-started.md
  workflow: 15
---

# Guida introduttiva

Obiettivo: partire da zero e arrivare a una prima chat funzionante con una configurazione minima.

<Info>
Chat più veloce: apri la Control UI (nessuna configurazione di canale necessaria). Esegui `openclaw dashboard`
e chatta nel browser, oppure apri `http://127.0.0.1:18789/` sull'
<Tooltip headline="Host del Gateway" tip="La macchina che esegue il servizio gateway di OpenClaw.">host del Gateway</Tooltip>.
Documentazione: [Dashboard](/web/dashboard) e [Control UI](/web/control-ui).
</Info>

## Prerequisiti

- Node 22 o superiore

<Tip>
Controlla la tua versione di Node con `node --version` se non sei sicuro.
</Tip>

## Configurazione rapida (CLI)

<Steps>
  <Step title="Installa OpenClaw (consigliato)">
    <Tabs>
      <Tab title="macOS/Linux">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>

    <Note>
    Altri metodi di installazione e requisiti: [Installazione](/install).
    </Note>

  </Step>
  <Step title="Esegui il wizard di onboarding">
    ```bash
    openclaw onboard --install-daemon
    ```

    Il wizard configura l'autenticazione, le impostazioni del gateway e i canali opzionali.
    Vedi [Wizard di Onboarding](/start/wizard) per i dettagli.

  </Step>
  <Step title="Controlla il Gateway">
    Se hai installato il servizio, dovrebbe essere già in esecuzione:

    ```bash
    openclaw gateway status
    ```

  </Step>
  <Step title="Apri la Control UI">
    ```bash
    openclaw dashboard
    ```
  </Step>
</Steps>

<Check>
Se la Control UI si carica, il tuo Gateway è pronto per l'uso.
</Check>

## Controlli opzionali e extra

<AccordionGroup>
  <Accordion title="Esegui il Gateway in primo piano">
    Utile per test rapidi o risoluzione problemi.

    ```bash
    openclaw gateway --port 18789
    ```

  </Accordion>
  <Accordion title="Invia un messaggio di test">
    Richiede un canale configurato.

    ```bash
    openclaw message send --target +15555550123 --message "Ciao da OpenClaw"
    ```

  </Accordion>
</AccordionGroup>

## Variabili d'ambiente utili

Se esegui OpenClaw come account di servizio o vuoi percorsi personalizzati per configurazione/stato:

- `OPENCLAW_HOME` imposta la directory home usata per la risoluzione dei percorsi interni.
- `OPENCLAW_STATE_DIR` sovrascrive la directory di stato.
- `OPENCLAW_CONFIG_PATH` sovrascrive il percorso del file di configurazione.

Riferimento completo delle variabili d'ambiente: [Variabili d'ambiente](/help/environment).

## Approfondisci

<Columns>
  <Card title="Wizard di Onboarding (dettagli)" href="/start/wizard">
    Riferimento completo del wizard CLI e opzioni avanzate.
  </Card>
  <Card title="Onboarding app macOS" href="/start/onboarding">
    Flusso di primo avvio per l'app macOS.
  </Card>
</Columns>

## Cosa avrai

- Un Gateway in esecuzione
- Autenticazione configurata
- Accesso alla Control UI o un canale connesso

## Passi successivi

- Sicurezza DM e approvazioni: [Associazione](/channels/pairing)
- Connetti più canali: [Canali](/channels)
- Flussi di lavoro avanzati e da sorgente: [Configurazione](/start/setup)

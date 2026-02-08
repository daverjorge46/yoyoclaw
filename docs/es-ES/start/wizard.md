---
summary: "Asistente de onboarding CLI: configuración guiada para gateway, workspace, canales y skills"
read_when:
  - Ejecutar o configurar el asistente de onboarding
  - Configurar una nueva máquina
title: "Asistente de Onboarding (CLI)"
sidebarTitle: "Onboarding: CLI"
x-i18n:
  generated_at: "2026-02-08T22:00:00Z"
  model: claude-sonnet-4
  provider: pi
  source_hash: 5495d951a2d78ffb74f52276cf637155c386523e04d7edb7c68998939bfa106a
  source_path: start/wizard.md
  workflow: 15
---

# Asistente de Onboarding (CLI)

El asistente de onboarding es la forma **recomendada** de configurar OpenClaw en macOS,
Linux o Windows (vía WSL2; muy recomendado).
Configura un Gateway local o una conexión a un Gateway remoto, además de canales, skills
y valores predeterminados del workspace en un único flujo guiado.

```bash
openclaw onboard
```

<Info>
Primer chat más rápido: abre la Control UI (no necesita configuración de canales). Ejecuta
`openclaw dashboard` y chatea en el navegador. Documentación: [Dashboard](/web/dashboard).
</Info>

Para reconfigurar después:

```bash
openclaw configure
openclaw agents add <nombre>
```

<Note>
`--json` no implica modo no interactivo. Para scripts, usa `--non-interactive`.
</Note>

<Tip>
Recomendado: configura una API key de Brave Search para que el agente pueda usar `web_search`
(`web_fetch` funciona sin clave). Camino más fácil: `openclaw configure --section web`
que almacena `tools.web.search.apiKey`. Documentación: [Herramientas web](/tools/web).
</Tip>

## QuickStart vs Avanzado

El asistente comienza con **QuickStart** (valores predeterminados) vs **Avanzado** (control total).

<Tabs>
  <Tab title="QuickStart (predeterminados)">
    - Gateway local (loopback)
    - Workspace predeterminado (o workspace existente)
    - Puerto del Gateway **18789**
    - Autenticación del Gateway **Token** (generado automáticamente, incluso en loopback)
    - Exposición Tailscale **Desactivada**
    - DMs de Telegram + WhatsApp por defecto en **allowlist** (se te pedirá tu número de teléfono)
  </Tab>
  <Tab title="Avanzado (control total)">
    - Expone cada paso (modo, workspace, gateway, canales, daemon, skills).
  </Tab>
</Tabs>

## Qué configura el asistente

El **modo local (predeterminado)** te guía a través de estos pasos:

1. **Modelo/Autenticación** — API key de Anthropic (recomendada), OAuth, OpenAI u otros proveedores. Elige un modelo predeterminado.
2. **Workspace** — Ubicación para archivos del agente (predeterminado `~/.openclaw/workspace`). Crea archivos de bootstrap.
3. **Gateway** — Puerto, dirección de bind, modo de autenticación, exposición Tailscale.
4. **Canales** — WhatsApp, Telegram, Discord, Google Chat, Mattermost, Signal, BlueBubbles o iMessage.
5. **Daemon** — Instala un LaunchAgent (macOS) o unidad de usuario systemd (Linux/WSL2).
6. **Comprobación de salud** — Inicia el Gateway y verifica que está funcionando.
7. **Skills** — Instala las skills recomendadas y dependencias opcionales.

<Note>
Volver a ejecutar el asistente **no** borra nada a menos que elijas explícitamente **Reset** (o pases `--reset`).
Si la configuración no es válida o contiene claves legacy, el asistente te pide ejecutar `openclaw doctor` primero.
</Note>

El **modo remoto** solo configura el cliente local para conectarse a un Gateway en otro lugar.
**No** instala ni cambia nada en el host remoto.

## Añadir otro agente

Usa `openclaw agents add <nombre>` para crear un agente separado con su propio workspace,
sesiones y perfiles de autenticación. Ejecutar sin `--workspace` inicia el asistente.

Qué configura:

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Notas:

- Los workspaces predeterminados siguen `~/.openclaw/workspace-<agentId>`.
- Añade `bindings` para enrutar mensajes entrantes (el asistente puede hacerlo).
- Flags no interactivas: `--model`, `--agent-dir`, `--bind`, `--non-interactive`.

## Referencia completa

Para desgloses detallados paso a paso, scripting no interactivo, configuración de Signal,
API RPC y una lista completa de campos de configuración que escribe el asistente, consulta la
[Referencia del Asistente](/reference/wizard).

## Documentación relacionada

- Referencia de comandos CLI: [`openclaw onboard`](/cli/onboard)
- Onboarding de la app macOS: [Onboarding](/start/onboarding)
- Ritual de primer inicio del agente: [Bootstrapping del agente](/start/bootstrapping)

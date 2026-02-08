---
summary: "Wizard de onboarding CLI: configuração guiada para gateway, workspace, canais e skills"
read_when:
  - Executar ou configurar o wizard de onboarding
  - Configurar uma nova máquina
title: "Wizard de Onboarding (CLI)"
sidebarTitle: "Onboarding: CLI"
x-i18n:
  generated_at: "2026-02-08T22:00:00Z"
  model: claude-sonnet-4
  provider: pi
  source_hash: 5495d951a2d78ffb74f52276cf637155c386523e04d7edb7c68998939bfa106a
  source_path: start/wizard.md
  workflow: 15
---

# Wizard de Onboarding (CLI)

O wizard de onboarding é o método **recomendado** para configurar o OpenClaw no macOS,
Linux ou Windows (via WSL2; fortemente recomendado).
Ele configura um Gateway local ou conexão com um Gateway remoto, além de canais, skills
e padrões do workspace em um único fluxo guiado.

```bash
openclaw onboard
```

<Info>
Chat mais rápido: abra a Control UI (sem configuração de canal necessária). Execute
`openclaw dashboard` e converse no navegador. Documentação: [Dashboard](/web/dashboard).
</Info>

Para reconfigurar posteriormente:

```bash
openclaw configure
openclaw agents add <nome>
```

<Note>
`--json` não significa modo não interativo. Para scripts, use `--non-interactive`.
</Note>

<Tip>
Recomendado: configure uma API key do Brave Search para que o agente possa usar `web_search`
(`web_fetch` funciona sem chave). Caminho mais fácil: `openclaw configure --section web`
que salva `tools.web.search.apiKey`. Documentação: [Ferramentas web](/tools/web).
</Tip>

## QuickStart vs Avançado

O wizard começa com **QuickStart** (padrões) vs **Avançado** (controle total).

<Tabs>
  <Tab title="QuickStart (padrões)">
    - Gateway local (loopback)
    - Workspace padrão (ou workspace existente)
    - Porta do Gateway **18789**
    - Autenticação do Gateway **Token** (gerado automaticamente, mesmo em loopback)
    - Exposição Tailscale **Desligada**
    - DMs do Telegram + WhatsApp padrão em **allowlist** (você será perguntado sobre seu número de telefone)
  </Tab>
  <Tab title="Avançado (controle total)">
    - Expõe cada etapa (modo, workspace, gateway, canais, daemon, skills).
  </Tab>
</Tabs>

## O que o wizard configura

O **modo local (padrão)** guia você através destas etapas:

1. **Modelo/Autenticação** — API key Anthropic (recomendada), OAuth, OpenAI ou outros providers. Escolha um modelo padrão.
2. **Workspace** — Local para arquivos do agente (padrão `~/.openclaw/workspace`). Cria arquivos de bootstrap.
3. **Gateway** — Porta, endereço de bind, modo de autenticação, exposição Tailscale.
4. **Canais** — WhatsApp, Telegram, Discord, Google Chat, Mattermost, Signal, BlueBubbles ou iMessage.
5. **Daemon** — Instala um LaunchAgent (macOS) ou unidade de usuário systemd (Linux/WSL2).
6. **Verificação de saúde** — Inicia o Gateway e verifica se está rodando.
7. **Skills** — Instala skills recomendadas e dependências opcionais.

<Note>
Reexecutar o wizard **não** apaga nada, a menos que você escolha explicitamente **Resetar** (ou passe `--reset`).
Se a configuração for inválida ou contiver chaves legadas, o wizard pede que você execute `openclaw doctor` primeiro.
</Note>

O **modo remoto** configura apenas o cliente local para conectar a um Gateway em outro lugar.
**Não** instala ou altera nada no host remoto.

## Adicionar outro agente

Use `openclaw agents add <nome>` para criar um agente separado com seu próprio workspace,
sessões e perfis de autenticação. Executar sem `--workspace` inicia o wizard.

O que ele configura:

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Notas:

- Workspaces padrão seguem `~/.openclaw/workspace-<agentId>`.
- Adicione `bindings` para rotear mensagens recebidas (o wizard pode fazer isso).
- Flags não interativas: `--model`, `--agent-dir`, `--bind`, `--non-interactive`.

## Referência completa

Para detalhes passo a passo, scripting não interativo, configuração do Signal,
API RPC e uma lista completa dos campos de configuração escritos pelo wizard, consulte a
[Referência do Wizard](/reference/wizard).

## Documentação relacionada

- Referência de comandos CLI: [`openclaw onboard`](/cli/onboard)
- Onboarding do app macOS: [Onboarding](/start/onboarding)
- Ritual de primeira execução do agente: [Bootstrapping do agente](/start/bootstrapping)

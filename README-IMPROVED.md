# 🤖 Jarvis — Personal AI Assistant

<p align="center">
  <strong>Your Personal AI Assistant Running on Your Own Devices</strong>
</p>

<p align="center">
  <a href="https://github.com/jeturing/Jarvis/actions/workflows/ci.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/jeturing/Jarvis/ci.yml?branch=main&style=for-the-badge" alt="CI status"></a>
  <a href="https://github.com/jeturing/Jarvis/releases"><img src="https://img.shields.io/github/v/release/jeturing/Jarvis?include_prereleases&style=for-the-badge" alt="GitHub release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

## 📋 Tabla de Contenidos

- [¿Qué es Jarvis?](#qué-es-jarvis)
- [Características Principales](#características-principales)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Diagrama de Uso](#diagrama-de-uso)
- [Instalación Rápida](#instalación-rápida)
- [Configuración](#configuración)
- [Uso Básico](#uso-básico)
- [Canales Soportados](#canales-soportados)
- [Documentación Completa](#documentación-completa)
- [Desarrollo](#desarrollo)
- [Contribuir](#contribuir)

---

## ¿Qué es Jarvis?

**Jarvis** es un **asistente personal de IA** que se ejecuta en tus propios dispositivos. Es una plataforma local-first, auto-hospedada y diseñada para control de usuario único.

### Beneficios Clave

✅ **Privacidad Total** — Todo se ejecuta localmente, tus datos nunca salen de tu control  
✅ **Multi-Canal** — Conecta con WhatsApp, Telegram, Slack, Discord, Signal, iMessage, Teams y más  
✅ **Multi-Plataforma** — Funciona en macOS, iOS, Android, Linux y Windows (WSL2)  
✅ **Extensible** — Sistema robusto de plugins para añadir funcionalidad  
✅ **Siempre Activo** — Daemon persistente vía systemd/launchd  
✅ **Capacidades de Voz** — Voice Wake y Talk Mode en macOS/iOS/Android  
✅ **Canvas Visual** — Espacio de trabajo visual controlado por el agente  

---

## Características Principales

### 🔐 Seguridad y Privacidad
- **Local-First**: Todos tus datos permanecen en tu dispositivo
- **Sin Servidor Central**: No hay dependencia de servicios de terceros
- **Emparejamiento Seguro**: Sistema de códigos para autorización DM
- **Lista de Permitidos**: Control granular de quién puede interactuar

### 💬 Multi-Canal
- **Mensajería Unificada**: Una interfaz para todos tus canales de chat
- **13+ Canales Integrados**: WhatsApp, Telegram, Discord, Slack, Signal, y más
- **Enrutamiento Inteligente**: Mensajes dirigidos al agente correcto
- **Respuestas Contextuales**: Mantiene contexto en conversaciones grupales

### 🛠️ Herramientas Poderosas
- **Browser Tool**: Automatización web con Playwright
- **Canvas Tool**: Espacio de trabajo visual con A2UI
- **Image Tool**: Análisis y generación de imágenes
- **Bash Tool**: Ejecución de comandos del sistema
- **Cron Tool**: Tareas programadas
- **Memory Tool**: Almacenamiento y recuperación de contexto

### 🤖 IA Avanzada
- **Múltiples Modelos**: Claude, GPT, Gemini, Bedrock, Ollama (local)
- **Failover Automático**: Rotación automática si un modelo falla
- **Streaming de Herramientas**: Ejecución de herramientas en tiempo real
- **Multi-Agente**: Agentes aislados por workspace/canal

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    Interfaces de Usuario                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │  macOS   │  │   iOS    │  │ Android  │  │   CLI / Web UI  │ │
│  │   App    │  │   App    │  │   App    │  │                 │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │ WebSocket / HTTP
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Gateway (Servidor)                          │
│  • Gestión de sesiones y enrutamiento de mensajes               │
│  • Catálogo de modelos IA y autenticación                       │
│  • Trabajos programados (cron) y webhooks                       │
│  • Herramienta de navegador compartida                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Runtime de Agente (Pi Agent)                  │
│  • Ejecución de modelos IA (Claude, GPT, etc.)                  │
│  • Streaming de herramientas en tiempo real                     │
│  • Gestión de contexto de sesión                                │
│  • Failover automático de modelos                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Capa Multi-Canal                            │
│  WhatsApp │ Telegram │ Signal │ Discord │ Slack │ iMessage      │
│  Teams │ Matrix │ Zalo │ BlueBubbles │ LINE │ Voice Call        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Servicios Externos (IA)                       │
│  Anthropic Claude │ OpenAI GPT │ Google Gemini │ AWS Bedrock    │
│  Ollama (Local) │ Otros proveedores                             │
└─────────────────────────────────────────────────────────────────┘
```

📖 **Profundizar**: Ver [ARCHITECTURE.md](docs/ARCHITECTURE.md) para detalles completos de arquitectura

---

## Diagrama de Uso

### Flujo de Mensaje Completo

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Usuario envía mensaje desde canal (WhatsApp, Telegram, etc.)│
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Canal recibe mensaje y lo normaliza                         │
│     • Extrae texto, medios, contexto de respuesta               │
│     • Añade metadata del canal                                  │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Verificación de seguridad                                   │
│     • Verifica lista de permitidos                              │
│     • Valida emparejamiento para DMs                            │
│     • Comprueba permisos de grupo                               │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. Gateway enruta mensaje                                      │
│     • Determina sesión apropiada                                │
│     • Verifica modo de activación (mention/reply/always)        │
│     • Encola o ejecuta inmediatamente                           │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. Agente procesa mensaje                                      │
│     • Carga contexto de sesión                                  │
│     • Ejecuta modelo IA con herramientas                        │
│     • Stream de llamadas y resultados de herramientas           │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  6. Ejecución de herramientas (si es necesario)                 │
│     • Browser (automatización web)                              │
│     • Bash (ejecutar comandos)                                  │
│     • Canvas (workspace visual)                                 │
│     • Memory (recuperar contexto)                               │
│     • Otras herramientas personalizadas                         │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  7. Agente genera respuesta                                     │
│     • Basada en resultados de herramientas                      │
│     • Aplica modo de thinking (low/high/always)                 │
│     • Formatea para canal destino                               │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  8. Respuesta enviada de vuelta                                 │
│     • Formatea para protocolo específico del canal              │
│     • Fragmenta mensajes largos si es necesario                 │
│     • Añade indicadores de escritura/reacciones                 │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  9. Usuario recibe respuesta en su canal                        │
└─────────────────────────────────────────────────────────────────┘
```

📖 **Profundizar**: Ver [Flujo de Datos](docs/ARCHITECTURE.md#data-flow) en documentación de arquitectura

---

## Instalación Rápida

### Requisitos Previos

- **Node.js ≥ 22.12.0**
- **npm, pnpm o bun**
- **macOS, Linux o Windows (WSL2)**

### Instalación con npm

```bash
# Instalar globalmente
npm install -g moltbot@latest

# Ejecutar asistente de configuración
moltbot onboard --install-daemon
```

### Instalación desde Código Fuente

```bash
# Clonar repositorio
git clone https://github.com/jeturing/Jarvis.git
cd Jarvis

# Instalar dependencias
pnpm install

# Construir proyecto
pnpm ui:build
pnpm build

# Ejecutar asistente de configuración
pnpm moltbot onboard --install-daemon
```

### Instalación con Docker

```bash
# Usando Docker Compose
docker-compose up -d
```

📖 **Profundizar**: Ver [Guía de Instalación Completa](docs/README-ES.md#configuración-y-despliegue)

---

## Configuración

### Estructura de Configuración

```
~/.clawdbot/
├── config/
│   ├── .moltbot.yaml          # Configuración principal
│   ├── models.json            # Perfiles de modelos IA
│   └── skills/                # Configuraciones de skills
├── credentials/
│   ├── anthropic.json         # Tokens OAuth
│   ├── openai.json
│   └── channels/              # Credenciales de canales
├── sessions/
│   ├── main/                  # Datos de sesión principal
│   └── groups/                # Sesiones de grupos
└── logs/
    ├── gateway.log            # Logs del gateway
    └── agent.log              # Logs del agente
```

### Archivo de Configuración Principal

Edita `~/.clawdbot/config/.moltbot.yaml`:

```yaml
# ========================================
# Configuración del Gateway
# ========================================
gateway:
  mode: local              # 'local' o 'remote'
  port: 18789             # Puerto del servidor
  bind: loopback          # 'loopback' o 'all'
  verbose: true           # Logging detallado

# ========================================
# Configuración de Agentes
# ========================================
agents:
  default:
    model: claude-4.5-sonnet    # Modelo IA por defecto
    thinking: high              # Nivel de thinking (low/high/always)
    temperature: 0.7            # Temperatura del modelo
    max_tokens: 8192            # Tokens máximos

# ========================================
# Configuración de Canales
# ========================================
channels:
  # WhatsApp
  whatsapp:
    enabled: true
    pairing: code              # Método de emparejamiento
    allowlist:
      - "+1234567890"          # Números permitidos
  
  # Telegram
  telegram:
    enabled: true
    bot_token: "${TELEGRAM_BOT_TOKEN}"
  
  # Discord
  discord:
    enabled: true
    bot_token: "${DISCORD_BOT_TOKEN}"
  
  # Signal
  signal:
    enabled: true
    phone: "+1234567890"
  
  # Slack
  slack:
    enabled: true
    bot_token: "${SLACK_BOT_TOKEN}"

# ========================================
# Configuración de Herramientas
# ========================================
tools:
  browser:
    enabled: true
    headless: true             # Navegador sin interfaz
    timeout: 30000             # Timeout en ms
  
  canvas:
    enabled: true
    port: 8080                 # Puerto Canvas
  
  bash:
    enabled: true
    timeout: 60000             # Timeout comandos
  
  memory:
    enabled: true
    max_size: 1000             # Entradas máximas

# ========================================
# Configuración de Sandbox (Opcional)
# ========================================
sandbox:
  enabled: false
  docker_image: "jarvis/sandbox"
  
# ========================================
# Configuración de Plugins
# ========================================
plugins:
  - name: matrix
    enabled: true
    config:
      homeserver: "https://matrix.org"
  
  - name: voice-call
    enabled: false
    config:
      provider: "twilio"

# ========================================
# Configuración de Skills
# ========================================
skills:
  - workspace1
  - workspace2
```

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
# ========================================
# Tokens de API de IA
# ========================================
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...

# ========================================
# Tokens de Canales
# ========================================
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
DISCORD_BOT_TOKEN=MTk4...
SLACK_BOT_TOKEN=xoxb-...

# ========================================
# Configuración del Gateway
# ========================================
CLAWDBOT_GATEWAY_PORT=18789
CLAWDBOT_GATEWAY_BIND=loopback

# ========================================
# Configuración de Modo
# ========================================
CLAWDBOT_PROFILE=production    # 'production' o 'dev'
CLAWDBOT_SKIP_CHANNELS=0

# ========================================
# Configuración de Depuración
# ========================================
CLAWDBOT_DEBUG=0
CLAWDBOT_VERBOSE=0
```

### Diagrama de Configuración

```
┌────────────────────────────────────────────────────────────┐
│                  Proceso de Configuración                   │
└────────────────────────────────────────────────────────────┘

1. INSTALACIÓN
   │
   ├─→ Instalar paquete npm/pnpm
   │
   └─→ Ejecutar: moltbot onboard --install-daemon

2. CONFIGURACIÓN INTERACTIVA
   │
   ├─→ Seleccionar modelos IA (Claude, GPT, etc.)
   │   └─→ Añadir tokens API o OAuth
   │
   ├─→ Configurar canales
   │   ├─→ WhatsApp (emparejamiento QR)
   │   ├─→ Telegram (bot token)
   │   ├─→ Discord (bot token)
   │   ├─→ Signal (phone number)
   │   └─→ Otros canales
   │
   ├─→ Configurar herramientas
   │   ├─→ Browser (Playwright)
   │   ├─→ Canvas (A2UI)
   │   ├─→ Bash (comandos)
   │   └─→ Memory (almacenamiento)
   │
   └─→ Configurar seguridad
       ├─→ Listas de permitidos
       ├─→ Políticas de emparejamiento DM
       └─→ Permisos de grupo

3. VERIFICACIÓN
   │
   ├─→ Ejecutar: moltbot doctor
   │   └─→ Verifica configuración y detecta problemas
   │
   └─→ Ejecutar: moltbot channels status
       └─→ Verifica estado de canales

4. INICIO DEL GATEWAY
   │
   ├─→ Modo Daemon: moltbot daemon start
   │   └─→ Gateway se ejecuta en segundo plano
   │
   └─→ Modo Manual: moltbot gateway --port 18789
       └─→ Gateway se ejecuta en primer plano

5. EMPAREJAMIENTO DE CANALES
   │
   ├─→ WhatsApp: Escanear código QR
   │
   ├─→ Otros canales: Aprobar códigos de emparejamiento
   │   └─→ Ejecutar: moltbot pairing approve <canal> <código>
   │
   └─→ Verificar conexiones
       └─→ Ejecutar: moltbot channels status --probe

6. ¡LISTO!
   └─→ Enviar mensaje de prueba
       └─→ Ejecutar: moltbot agent --message "Hola Jarvis"
```

📖 **Profundizar**: Ver [Guía de Configuración Completa](docs/README-ES.md#configuración-y-despliegue)

---

## Uso Básico

### Iniciar el Gateway

```bash
# Modo daemon (recomendado)
moltbot daemon install
moltbot daemon start
moltbot daemon status

# Modo manual (desarrollo)
moltbot gateway --port 18789 --verbose
```

### Enviar Mensajes

```bash
# Enviar mensaje a un contacto
moltbot message send --to +1234567890 --message "Hola desde Jarvis"

# Enviar mensaje a un grupo
moltbot message send --to group_id --message "Hola grupo"
```

### Interactuar con el Agente

```bash
# Modo interactivo
moltbot agent --message "¿Cuál es el clima hoy?"

# Con modo de thinking alto
moltbot agent --message "Analiza este documento" --thinking high

# Ejecutar comando y devolver resultado al canal
moltbot agent --message "Lista archivos en /home" --reply-back telegram
```

### Gestionar Canales

```bash
# Ver estado de todos los canales
moltbot channels status

# Ver estado con verificación de conexión
moltbot channels status --probe

# Ver estado de un canal específico
moltbot channels status whatsapp

# Reiniciar un canal
moltbot channels restart telegram
```

### Gestionar Emparejamiento

```bash
# Listar solicitudes de emparejamiento pendientes
moltbot pairing list

# Aprobar un emparejamiento
moltbot pairing approve telegram ABC123

# Rechazar un emparejamiento
moltbot pairing reject whatsapp XYZ789

# Ver lista de permitidos
moltbot pairing allowlist
```

### Gestionar Modelos

```bash
# Listar modelos disponibles
moltbot models list

# Ver configuración de modelos
moltbot models config

# Probar un modelo
moltbot models test claude-4.5-sonnet

# Cambiar modelo por defecto
moltbot config set agents.default.model claude-4.5-sonnet
```

### Gestionar Skills

```bash
# Listar skills disponibles
moltbot skills list

# Instalar un skill
moltbot skills install workspace1

# Actualizar skills
moltbot skills update

# Ver configuración de skills
moltbot skills config
```

### Diagnóstico

```bash
# Ejecutar diagnóstico completo
moltbot doctor

# Ver logs del gateway
moltbot logs gateway

# Ver logs del agente
moltbot logs agent

# Ver logs de un canal
moltbot logs channel telegram
```

📖 **Profundizar**: Ver [Comandos CLI](docs/README-ES.md#cli)

---

## Canales Soportados

### Canales Integrados

| Canal | Biblioteca | Estado | Documentación |
|-------|-----------|--------|---------------|
| **WhatsApp** | @whiskeysockets/baileys | ✅ Estable | [Ver docs](docs/channels/) |
| **Telegram** | grammy | ✅ Estable | [Ver docs](docs/channels/) |
| **Signal** | signal-cli | ✅ Estable | [Ver docs](docs/channels/) |
| **iMessage** | imsg | ✅ Estable | [Ver docs](docs/channels/) |
| **Discord** | discord.js | ✅ Estable | [Ver docs](docs/channels/) |
| **Slack** | @slack/bolt | ✅ Estable | [Ver docs](docs/channels/) |
| **Google Chat** | Chat API | ✅ Estable | [Ver docs](docs/channels/) |

### Canales de Extensión

| Canal | Ubicación | Estado | Documentación |
|-------|-----------|--------|---------------|
| **BlueBubbles** | extensions/bluebubbles | ✅ Estable | [Ver docs](docs/channels/) |
| **Microsoft Teams** | extensions/msteams | ✅ Estable | [Ver docs](docs/channels/) |
| **Matrix** | extensions/matrix | ✅ Estable | [Ver docs](docs/channels/) |
| **Zalo** | extensions/zalo | ✅ Estable | [Ver docs](docs/channels/) |
| **Zalo Personal** | extensions/zalouser | ✅ Estable | [Ver docs](docs/channels/) |
| **Twitch** | extensions/twitch | ✅ Estable | [Ver docs](docs/channels/) |
| **Mattermost** | extensions/mattermost | ✅ Estable | [Ver docs](docs/channels/) |
| **LINE** | extensions/line | ✅ Estable | [Ver docs](docs/channels/) |
| **Voice Call** | extensions/voice-call | 🔶 Beta | [Ver docs](docs/channels/) |

### Características de Canal

- ✅ **Emparejamiento DM**: Lista de permitidos basada en código
- ✅ **Enrutamiento de grupo**: Control de menciones
- ✅ **Etiquetas de respuesta**: Respuestas basadas en hilos
- ✅ **Fragmentación de mensajes**: Límites específicos por canal
- ✅ **Reacciones**: Reconocimientos
- ✅ **Indicadores de escritura**: Estado en tiempo real
- ✅ **Redacción de medios**: Capacidades de privacidad

📖 **Profundizar**: Ver [Documentación de Canales](docs/README-ES.md#canales-de-mensajería)

---

## Documentación Completa

### 📚 Documentación Principal

- **[README Español (Completo)](docs/README-ES.md)** - Documentación completa en español
- **[Arquitectura](docs/ARCHITECTURE.md)** - Arquitectura técnica detallada del sistema
- **[Componentes](docs/COMPONENTS.md)** - Descripción de componentes individuales (próximamente)
- **[Desarrollo](docs/DEVELOPMENT.md)** - Guía para desarrolladores (próximamente)
- **[Plugin Development](docs/PLUGIN-DEVELOPMENT.md)** - Crear plugins personalizados (próximamente)
- **[API Reference](docs/API-REFERENCE.md)** - Referencia completa de API (próximamente)
- **[Deployment](docs/DEPLOYMENT.md)** - Guías de despliegue (próximamente)

### 🔧 Configuración y Administración

- **Gateway**: Ver [docs/gateway/](docs/gateway/)
- **Canales**: Ver [docs/channels/](docs/channels/)
- **Seguridad**: Ver [docs/security/](docs/security/)
- **CLI**: Ver [docs/cli/](docs/cli/)

### 💡 Conceptos y Guías

- **Modelos IA**: Ver [docs/concepts/](docs/concepts/)
- **Sesiones**: Ver [docs/concepts/](docs/concepts/)
- **Herramientas**: Ver [docs/tools/](docs/tools/)
- **Plugins**: Ver [docs/plugins/](docs/plugins/)

### 🚀 Inicio Rápido

- **Getting Started**: Ver [docs/start/](docs/start/)
- **Instalación**: Ver [docs/install/](docs/install/)
- **Plataformas**: Ver [docs/platforms/](docs/platforms/)

### 📖 Referencia

- **Testing**: Ver [docs/testing.md](docs/testing.md)
- **Environment**: Ver [docs/environment.md](docs/environment.md)
- **Debugging**: Ver [docs/debugging.md](docs/debugging.md)

---

## Desarrollo

### Configuración del Entorno de Desarrollo

```bash
# 1. Clonar repositorio
git clone https://github.com/jeturing/Jarvis.git
cd Jarvis

# 2. Instalar dependencias
pnpm install

# 3. Construir UI
pnpm ui:build

# 4. Construir proyecto
pnpm build

# 5. Ejecutar en modo desarrollo
pnpm gateway:watch  # Auto-recarga en cambios
```

### Scripts de Desarrollo

```bash
# Desarrollo
pnpm dev                  # Ejecutar CLI en modo dev
pnpm gateway:watch        # Gateway con auto-recarga
pnpm gateway:dev          # Gateway dev sin canales
pnpm tui:dev              # UI de terminal dev

# Build
pnpm build                # Compilar TypeScript
pnpm ui:build             # Construir UI web
pnpm canvas:a2ui:bundle   # Empaquetar Canvas A2UI

# Testing
pnpm test                 # Ejecutar todos los tests
pnpm test:watch           # Tests en modo watch
pnpm test:coverage        # Tests con cobertura
pnpm test:e2e             # Tests end-to-end

# Linting & Formatting
pnpm lint                 # Lint TypeScript
pnpm lint:fix             # Fix problemas de lint
pnpm format               # Verificar formato
pnpm format:fix           # Fix formato

# Plataformas
pnpm ios:build            # Construir app iOS
pnpm android:run          # Ejecutar app Android
pnpm mac:package          # Empaquetar app macOS
```

### Estructura del Proyecto

```
/
├── src/                  # Código fuente TypeScript
├── extensions/           # Plugins de canal y extensiones
├── apps/                 # Aplicaciones nativas (macOS, iOS, Android)
├── docs/                 # Documentación
├── skills/               # Paquetes de skills de workspace
├── scripts/              # Scripts de utilidad
├── test/                 # Fixtures de test y helpers
└── ui/                   # UI web (Control UI)
```

📖 **Profundizar**: Ver [Estructura Completa](docs/README-ES.md#estructura-de-directorios)

---

## Contribuir

¡Las contribuciones son bienvenidas! Por favor lee [CONTRIBUTING.md](CONTRIBUTING.md) para detalles sobre nuestro código de conducta y el proceso para enviar pull requests.

### Cómo Contribuir

1. **Fork el repositorio**
2. **Crea una rama** para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit tus cambios** (`git commit -m 'Add some AmazingFeature'`)
4. **Push a la rama** (`git push origin feature/AmazingFeature`)
5. **Abre un Pull Request**

### Áreas de Contribución

- 🐛 **Bug fixes**: Reporta o arregla bugs
- ✨ **Nuevas características**: Propón o implementa nuevas features
- 📝 **Documentación**: Mejora la documentación
- 🔌 **Plugins**: Crea nuevos plugins de canal o herramientas
- 🧪 **Tests**: Añade o mejora tests
- 🌐 **Traducciones**: Traduce documentación a otros idiomas

---

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

## Soporte

¿Necesitas ayuda? Aquí tienes algunas opciones:

- 📖 **Documentación**: Revisa la [documentación completa](docs/README-ES.md)
- 🐛 **Issues**: Reporta bugs en [GitHub Issues](https://github.com/jeturing/Jarvis/issues)
- 💬 **Discusiones**: Únete a [GitHub Discussions](https://github.com/jeturing/Jarvis/discussions)
- 📧 **Email**: Contacta al equipo de desarrollo

---

## Agradecimientos

Gracias a todos los contribuidores que han ayudado a hacer este proyecto posible.

---

## Seguridad

Para reportar vulnerabilidades de seguridad, por favor lee [SECURITY.md](SECURITY.md).

---

<p align="center">
  <strong>Hecho con ❤️ por la comunidad</strong>
</p>

<p align="center">
  <sub>Si encuentras útil este proyecto, considera darle una ⭐ en GitHub</sub>
</p>

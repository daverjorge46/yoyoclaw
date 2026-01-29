# 🦞 Moltbot - Documentación Completa del Proyecto

## Índice
1. [Visión General](#visión-general)
2. [¿Qué es Moltbot?](#qué-es-moltbot)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Componentes Principales](#componentes-principales)
5. [Canales de Mensajería](#canales-de-mensajería)
6. [Tecnologías Utilizadas](#tecnologías-utilizadas)
7. [Sistema de Plugins](#sistema-de-plugins)
8. [Configuración y Despliegue](#configuración-y-despliegue)
9. [Desarrollo](#desarrollo)
10. [Estructura de Directorios](#estructura-de-directorios)

---

## Visión General

**Moltbot** (también conocido como Jarvis o Clawdbot) es un **asistente personal de IA** que se ejecuta en tus propios dispositivos. Es una plataforma local-first, auto-hospedada y diseñada para control de usuario único.

### Características Principales

✅ **Multi-canal**: Conecta con WhatsApp, Telegram, Slack, Discord, Signal, iMessage, Microsoft Teams, Matrix, Zalo y más  
✅ **Capacidades de voz**: Wake Voice, Talk Mode (entrada/salida de voz en macOS/iOS/Android)  
✅ **Canvas en vivo**: Espacio de trabajo visual controlado por agente con framework A2UI  
✅ **Herramientas de primera clase**: Browser, Canvas, Cron, Sessions, acciones de Discord/Slack  
✅ **Enrutamiento multi-agente**: Aisla agentes por espacio de trabajo/canal  
✅ **Asistente de configuración**: `moltbot onboard` para configuración fácil  
✅ **Daemon siempre activo**: vía systemd/launchd  
✅ **Soporte Gateway remoto**: para servidores Linux sin interfaz gráfica  
✅ **Privacidad**: Se ejecuta localmente, sin dependencia de servidor

---

## ¿Qué es Moltbot?

Moltbot es un asistente de IA personal que:

### Propósito Principal
- Asistente de IA personal siempre activo usando modelos Claude/OpenAI
- Gateway de mensajería multi-canal (bandeja de entrada unificada entre plataformas)
- Funciona en macOS, iOS, Android, Linux, Windows (WSL2)
- Enfocado en privacidad: se ejecuta localmente, sin dependencia de servidor

### Casos de Uso
1. **Asistente Personal**: Responde preguntas, ejecuta tareas, gestiona calendarios
2. **Centro de Mensajería Unificado**: Una interfaz para todos tus canales de chat
3. **Automatización**: Ejecuta scripts, gestiona tareas programadas (cron)
4. **Navegación Web**: Automatización de navegador con Playwright
5. **Procesamiento de Medios**: Transcripción de audio, análisis de imágenes, procesamiento de video
6. **Desarrollo**: Asistente de código, revisión de código, depuración

### Ventajas Únicas
- **Control Total**: Tú posees tus datos y configuración
- **Sin Servidor Central**: No hay dependencia de servicios de terceros
- **Extensible**: Sistema de plugins robusto para añadir funcionalidad
- **Multi-Plataforma**: Funciona en todos los sistemas operativos principales
- **Seguro**: Autenticación local, políticas de lista de permitidos

---

## Arquitectura del Sistema

```
┌────────────────────────────────────────────────────┐
│  Gateway (Servidor WebSocket)                      │
│  - Plano de control para sesiones/canales          │
│  - Registro de chat y enrutamiento de mensajes     │
│  - Catálogo de modelos y perfiles de autenticación │
│  - Trabajos cron, webhooks, herramienta de navegador│
└────────────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────┐
│  Runtime de Agente (Pi Agent)                      │
│  - Modo RPC embedding                              │
│  - Streaming de herramientas y bloques             │
│  - Failover de modelos/rotación de auth            │
│  - Ventana de contexto de sesión                   │
│  - Entorno sandbox (Docker opcional)               │
└────────────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────┐
│  Capa Multi-Canal                                  │
│  - Manejadores de canal base                       │
│  - Análisis de mensajes entrantes                  │
│  - Enrutamiento y formato salientes                │
│  - Políticas de lista de permitidos/emparejamiento DM│
│  - Enrutamiento de menciones en grupo              │
└────────────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────┐
│  Sistema de Herramientas                           │
│  - Browser (automatización web)                    │
│  - Canvas (espacio de trabajo visual)              │
│  - Image (analizar/generar)                        │
│  - Message (enviar entre canales)                  │
│  - Session (generar sub-agentes)                   │
│  - Bash (ejecutar comandos)                        │
│  - Web (fetch, search, readability)                │
│  - Memory (recordar contexto)                      │
│  - Cron (programar tareas)                         │
│  - Acciones Discord/Slack/WhatsApp                 │
└────────────────────────────────────────────────────┘
```

### Flujo de Mensajes

1. **Entrada**: Mensaje recibido desde canal (WhatsApp, Telegram, etc.)
2. **Enrutamiento**: Gateway determina sesión y agente apropiado
3. **Procesamiento**: Agente procesa mensaje con herramientas disponibles
4. **Ejecución**: Herramientas se ejecutan (browser, bash, memory, etc.)
5. **Respuesta**: Agente genera respuesta basada en resultados
6. **Salida**: Mensaje enviado de vuelta al canal original o cruzado

---

## Componentes Principales

### 1. Gateway (`src/gateway/`)

El **Gateway** es el corazón del sistema. Es un servidor WebSocket que:

- **Gestiona todas las sesiones** de chat activas
- **Enruta mensajes** entre canales y agentes
- **Mantiene catálogo de modelos** (Claude, GPT, Bedrock)
- **Ejecuta trabajos cron** y webhooks
- **Proporciona herramienta de navegador** compartida
- **Maneja descubrimiento** de servicios (mDNS)

**Archivos clave:**
- `server.ts` - Servidor principal WebSocket
- `chat-registry.ts` - Registro de chats activos
- `model-catalog.ts` - Catálogo de modelos AI
- `browser-tool.ts` - Integración de Playwright

### 2. Runtime de Agente (`src/agents/`)

El **Runtime de Agente** ejecuta modelos de IA y gestiona interacciones:

- **Integración Pi Agent** (`pi-embedded-runner.ts`) - Ejecuta Claude/GPT en modo RPC
- **Gestión de sesiones** (`session-*.ts`) - Aisla contextos de chat
- **Streaming de herramientas** - Streaming en tiempo real de uso de herramientas
- **Failover de modelos** - Rotación automática si un modelo falla
- **Manejo de perfiles de auth** - OAuth y claves API

**Archivos clave:**
- `pi-embedded-runner.ts` - Ejecutor principal de agente
- `session-manager.ts` - Gestor de sesiones de chat
- `tool-registry.ts` - Registro de herramientas disponibles
- `model-auth.ts` - Autenticación de modelos

### 3. Canales (`src/channels/`, `extensions/`)

**Canales integrados** (en `src/`):
- `whatsapp/` - WhatsApp (biblioteca Baileys)
- `telegram/` - Telegram (grammY)
- `signal/` - Signal (signal-cli)
- `imessage/` - iMessage (imsg)
- `discord/` - Discord (discord.js)
- `slack/` - Slack (Bolt)

**Canales de extensión** (en `extensions/`):
- `msteams/` - Microsoft Teams
- `matrix/` - Matrix con soporte E2E
- `zalo/`, `zalouser/` - Mensajería vietnamita
- `bluebubbles/` - Relay iMessage
- Y más de 20 extensiones de canal

**Características:**
- Emparejamiento DM (lista de permitidos basada en código)
- Enrutamiento de grupo/canal con control de menciones
- Etiquetas de respuesta para respuestas basadas en hilos
- Fragmentación de mensajes por canal
- Reconocimientos de reacción
- Indicadores de escritura

### 4. Sistema de Plugins (`src/plugins/`)

El **sistema de plugins** permite extensibilidad:

**Tipos de plugins:**
- **Plugins de canal** - Nuevas integraciones de mensajería
- **Plugins de auth** - Manejadores OAuth
- **Plugins de herramientas** - Herramientas personalizadas de agente
- **Plugins de memoria** - Backends de almacenamiento personalizados
- **Plugins de hooks** - Manejadores de eventos globales

**Archivos clave:**
- `discovery.ts` - Auto-detecta plugins
- `loader.ts` - Carga plugins validados
- `manifest.ts` - Validación de esquema de manifiesto
- `services.ts` - Proveedores de inyección de servicios

### 5. Herramienta de Navegador (`src/browser/`)

La **herramienta de navegador** proporciona automatización web:

- **Automatización Chromium** vía Playwright
- **Snapshots conscientes de IA** de páginas
- **Rellenado de formularios e interacción**
- **Generación de screenshots y PDF**
- **Perfiles personalizados** con cookies/almacenamiento
- **Puente CDP** para depuración DevTools

**Archivos clave:**
- `browser-tool.ts` - API principal de herramienta
- `playwright-bridge.ts` - Puente Playwright
- `snapshot.ts` - Generación de snapshots de página

### 6. Pipeline de Medios (`src/media/`)

El **pipeline de medios** maneja procesamiento de medios:

- Procesamiento de imagen/audio/video
- Hooks de transcripción
- Almacén de archivos con límites de tamaño
- Detección de tipo MIME
- Gestión de ciclo de vida temporal

**Archivos clave:**
- `index.ts` - API principal de medios
- `transcription.ts` - Hooks de transcripción de audio
- `file-store.ts` - Almacenamiento persistente de archivos

### 7. Canvas Host (`src/canvas-host/`)

El **Canvas Host** proporciona un espacio de trabajo visual:

- Framework A2UI para renderizado
- Actualización de estado en tiempo real
- Serialización de DOM
- Integración WebSocket

**Archivos clave:**
- `index.ts` - API principal de Canvas
- `a2ui/` - Paquetes de framework A2UI

### 8. CLI (`src/cli/`)

La **CLI** proporciona interfaz de línea de comandos:

**Comandos principales:**
- `gateway` - Iniciar servidor gateway
- `agent` - Ejecutar agente AI
- `onboard` - Asistente de configuración
- `models` - Gestionar modelos AI
- `channels` - Gestionar canales
- `cron` - Gestionar trabajos programados
- `daemon` - Gestionar servicio daemon
- `plugins` - Gestionar plugins
- `skills` - Gestionar skills

**Archivos clave:**
- `index.ts` - Entry point de CLI
- `commands/` - Implementaciones de comandos

### 9. Configuración (`src/config/`)

El **sistema de configuración** gestiona ajustes:

- Carga de configuración YAML
- Validación de esquema Zod
- Almacenamiento de sesión
- Gestión de rutas
- Migraciones de configuración

**Archivos clave:**
- `index.ts` - Cargador principal de configuración
- `schema.ts` - Esquema de validación Zod
- `paths.ts` - Resolución de rutas de sistema

---

## Canales de Mensajería

### Canales Integrados

| Canal | Biblioteca | Estado |
|-------|-----------|--------|
| **WhatsApp** | @whiskeysockets/baileys | ✅ Estable |
| **Telegram** | grammy | ✅ Estable |
| **Signal** | signal-cli | ✅ Estable |
| **iMessage** | imsg | ✅ Estable |
| **Discord** | discord.js | ✅ Estable |
| **Slack** | @slack/bolt | ✅ Estable |
| **Google Chat** | Chat API | ✅ Estable |

### Canales de Extensión

| Canal | Ubicación | Estado |
|-------|-----------|--------|
| **BlueBubbles** | extensions/bluebubbles | ✅ Estable |
| **Microsoft Teams** | extensions/msteams | ✅ Estable |
| **Matrix** | extensions/matrix | ✅ Estable |
| **Zalo** | extensions/zalo | ✅ Estable |
| **Zalo Personal** | extensions/zalouser | ✅ Estable |
| **Twitch** | extensions/twitch | ✅ Estable |
| **Mattermost** | extensions/mattermost | ✅ Estable |
| **Nextcloud Talk** | extensions/nextcloud-talk | ✅ Estable |
| **Tlon** | extensions/tlon | ✅ Estable |
| **Nostr** | extensions/nostr | ✅ Estable |
| **LINE** | extensions/line | ✅ Estable |
| **Voice Call** | extensions/voice-call | ✅ Beta |

### Características de Canal

- **Emparejamiento DM**: Lista de permitidos basada en código
- **Enrutamiento de grupo**: Control de menciones
- **Etiquetas de respuesta**: Respuestas basadas en hilos
- **Fragmentación de mensajes**: Límites específicos por canal
- **Reacciones**: Reconocimientos
- **Indicadores de escritura**: Estado en tiempo real
- **Redacción de medios**: Capacidades de privacidad

---

## Tecnologías Utilizadas

### Stack Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **TypeScript** | 5.9+ | Lenguaje principal |
| **Node.js** | ≥22.12.0 | Runtime |
| **Hono** | 4.11.4 | Framework HTTP |
| **Express** | 5.2 | Servidor WebSocket (legacy) |
| **ws** | 8.19 | Biblioteca WebSocket |
| **Zod** | 4.3 | Validación de esquema |

### Integración AI/Modelo

| Tecnología | Propósito |
|------------|-----------|
| **@mariozechner/pi-agent-core** | Agente Pi de Anthropic |
| **@mariozechner/pi-tui** | UI de terminal para agente |
| **Anthropic SDK** | API Claude |
| **OpenAI SDK** | API ChatGPT |
| **AWS Bedrock SDK** | Modelos AWS |
| **Ollama SDK** | Soporte LLM local |

### Mensajería & Comunicación

| Biblioteca | Canal |
|-----------|-------|
| **@whiskeysockets/baileys** | WhatsApp |
| **grammy** | Telegram |
| **@slack/bolt** | Slack |
| **discord.js** | Discord |
| **@line/bot-sdk** | LINE |
| **signal-cli** | Signal |
| **imsg** | iMessage |

### Automatización de Navegador

| Tecnología | Propósito |
|------------|-----------|
| **Playwright Core** | 1.58 - Automatización web |
| **chromium-bidi** | 13.0 - Protocolo DevTools Chrome |
| **Sharp** | 0.34 - Procesamiento de imágenes |
| **pdfjs-dist** | Manipulación de PDF |

### Base de Datos & Almacenamiento

| Tecnología | Propósito |
|------------|-----------|
| **SQLite-vec** | Almacenamiento vectorial para memoria |
| **LanceDB** | Búsqueda vectorial (extensión) |
| **Sistema de archivos** | Persistencia de sesión/configuración |
| **proper-lockfile** | Control de acceso concurrente |

### CLI & DevOps

| Tecnología | Propósito |
|------------|-----------|
| **Commander.js** | Análisis de argumentos CLI |
| **@clack/prompts** | Prompts CLI interactivos |
| **Chalk** | Colores de terminal |
| **dotenv** | Configuración de entorno |
| **YAML** | Soporte de formato de configuración |

### Herramientas de Desarrollo

| Tecnología | Propósito |
|------------|-----------|
| **TypeScript** | Verificación de tipos estricta |
| **Vitest** | Ejecutor de tests |
| **oxlint** | Linting (OxC) |
| **oxfmt** | Formateo |
| **tsx** | Ejecución TS |
| **Playwright Core** | Testing E2E |
| **Wireit** | Orquestación de tareas de build |

---

## Sistema de Plugins

### Arquitectura de Plugins

```
┌─────────────────────────────────────────────┐
│  Descubrimiento de Plugins                  │
│  - Auto-detecta desde extensions/           │
│  - Auto-detecta desde node_modules/@moltbot/│
│  - Validación de manifiesto                 │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  Cargador de Plugins                        │
│  - Validación de esquema de configuración   │
│  - Inicialización de runtime                │
│  - Registro de hooks                        │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  Proveedores de Servicios                   │
│  - Acceso a cliente Gateway                 │
│  - Proveedor de configuración               │
│  - Inyección de logger                      │
│  - Utilidades de cliente HTTP               │
└─────────────────────────────────────────────┘
```

### Tipos de Plugins

#### 1. Plugins de Canal
Añaden nuevos canales de mensajería:
```typescript
export function createChannelPlugin(): ChannelPlugin {
  return {
    name: 'my-channel',
    type: 'channel',
    init: async (config) => {
      // Inicializar canal
    },
    send: async (message) => {
      // Enviar mensaje
    },
    receive: async (handler) => {
      // Recibir mensajes
    }
  }
}
```

#### 2. Plugins de Herramientas
Añaden herramientas personalizadas para agentes:
```typescript
export function createToolPlugin(): ToolPlugin {
  return {
    name: 'my-tool',
    type: 'tool',
    schema: z.object({
      input: z.string()
    }),
    execute: async (params) => {
      // Ejecutar herramienta
      return { result: 'done' }
    }
  }
}
```

#### 3. Plugins de Auth
Añaden manejadores OAuth personalizados:
```typescript
export function createAuthPlugin(): AuthPlugin {
  return {
    name: 'my-auth',
    type: 'auth',
    authorize: async (credentials) => {
      // Manejar OAuth
      return { token: 'access_token' }
    }
  }
}
```

#### 4. Plugins de Memoria
Añaden backends de almacenamiento personalizados:
```typescript
export function createMemoryPlugin(): MemoryPlugin {
  return {
    name: 'my-memory',
    type: 'memory',
    store: async (key, value) => {
      // Almacenar valor
    },
    retrieve: async (key) => {
      // Recuperar valor
    }
  }
}
```

#### 5. Plugins de Hooks
Añaden manejadores de eventos globales:
```typescript
export function createHookPlugin(): HookPlugin {
  return {
    name: 'my-hook',
    type: 'hook',
    hooks: {
      'message:received': async (message) => {
        // Manejar mensaje recibido
      },
      'message:sent': async (message) => {
        // Manejar mensaje enviado
      }
    }
  }
}
```

### Esquema de Manifiesto de Plugin

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "Plugin description",
  "exports": {
    ".": "./dist/index.js",
    "./config-schema": "./dist/config-schema.js"
  },
  "hooks": ["channel", "tool"],
  "permissions": ["network", "fs"],
  "dependencies": {
    "some-lib": "^1.0.0"
  }
}
```

### Ciclo de Vida de Plugin

1. **Descubrimiento** - Auto-detecta plugins desde directorios conocidos
2. **Validación** - Valida manifiesto y esquema de configuración
3. **Carga** - Carga módulo de plugin
4. **Inicialización** - Ejecuta función init de plugin
5. **Registro** - Registra hooks y herramientas
6. **Ejecución** - Plugin maneja eventos y llamadas
7. **Apagado** - Limpieza durante apagado de gateway

---

## Configuración y Despliegue

### Archivo de Configuración Principal

El archivo `.moltbot.yaml` (o `.clawdbot.yaml`) controla toda la configuración:

```yaml
# Configuración de Gateway
gateway:
  mode: local  # o 'remote'
  port: 18789
  bind: loopback  # o 'all'
  verbose: true

# Configuración de Agentes
agents:
  default:
    model: claude-4.5-sonnet
    thinking: high
    temperature: 0.7
    max_tokens: 8192

# Configuración de Canales
channels:
  whatsapp:
    enabled: true
    pairing: code
    allowlist:
      - "+1234567890"
  
  telegram:
    enabled: true
    bot_token: "${TELEGRAM_BOT_TOKEN}"
  
  discord:
    enabled: true
    bot_token: "${DISCORD_BOT_TOKEN}"

# Configuración de Herramientas
tools:
  browser:
    enabled: true
    headless: true
    timeout: 30000
  
  canvas:
    enabled: true
    port: 8080

# Configuración de Sandbox
sandbox:
  enabled: false
  docker_image: "moltbot/sandbox"
  
# Configuración de Plugins
plugins:
  - name: matrix
    enabled: true
    config:
      homeserver: "https://matrix.org"

# Configuración de Skills
skills:
  - workspace1
  - workspace2
```

### Variables de Entorno

Archivo `.env`:
```bash
# Tokens de API
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
DISCORD_BOT_TOKEN=MTk4...

# Configuración de Gateway
CLAWDBOT_GATEWAY_PORT=18789
CLAWDBOT_GATEWAY_BIND=loopback

# Configuración de Modo
CLAWDBOT_PROFILE=production  # o 'dev'
CLAWDBOT_SKIP_CHANNELS=0

# Configuración de Depuración
CLAWDBOT_DEBUG=0
CLAWDBOT_VERBOSE=0
```

### Instalación

#### Instalación rápida (npm)
```bash
npm install -g moltbot@latest
moltbot onboard --install-daemon
```

#### Desde fuente (desarrollo)
```bash
git clone https://github.com/moltbot/moltbot.git
cd moltbot
pnpm install
pnpm ui:build
pnpm build
pnpm moltbot onboard --install-daemon
```

#### Docker
```bash
docker-compose up -d
```

### Despliegue como Daemon

#### macOS (launchd)
```bash
moltbot daemon install
moltbot daemon start
moltbot daemon status
```

#### Linux (systemd)
```bash
moltbot daemon install
systemctl --user start moltbot-gateway
systemctl --user status moltbot-gateway
```

#### Windows (WSL2)
```bash
# En WSL2
moltbot daemon install
moltbot daemon start
```

### Gateway Remoto

Para servidores sin interfaz gráfica:

```yaml
# En servidor remoto
gateway:
  mode: remote
  bind: all
  port: 18789

# En cliente local
agents:
  gateway_url: "ws://your-server:18789"
```

---

## Desarrollo

### Configuración de Entorno de Desarrollo

```bash
# 1. Clonar repositorio
git clone https://github.com/moltbot/moltbot.git
cd moltbot

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
pnpm test:live            # Tests con APIs reales

# Linting & Formatting
pnpm lint                 # Lint TypeScript
pnpm lint:fix             # Fix problemas de lint
pnpm format               # Verificar formato
pnpm format:fix           # Fix formato

# Plataformas
pnpm ios:build            # Construir app iOS
pnpm ios:run              # Ejecutar app iOS
pnpm android:assemble     # Ensamblar app Android
pnpm android:run          # Ejecutar app Android
pnpm mac:package          # Empaquetar app macOS
```

### Estructura de Testing

```
test/
├── unit/           # Tests unitarios
├── e2e/            # Tests end-to-end
├── integration/    # Tests de integración
└── fixtures/       # Datos de prueba
```

**Configuraciones de Vitest:**
- `vitest.config.ts` - Configuración principal
- `vitest.unit.config.ts` - Tests unitarios
- `vitest.e2e.config.ts` - Tests E2E
- `vitest.live.config.ts` - Tests con APIs reales
- `vitest.extensions.config.ts` - Tests de extensiones
- `vitest.gateway.config.ts` - Tests de gateway

### Requisitos de Cobertura de Tests

- **Líneas**: 70%
- **Funciones**: 70%
- **Ramas**: 70%
- **Declaraciones**: 70%

### Estándares de Código

- **TypeScript estricto**: Verificación de tipos completa
- **ESLint**: Linting con oxlint
- **Prettier**: Formateo con oxfmt
- **Pre-commit hooks**: Ejecuta lint + format antes de commit
- **Límite de LOC**: ~700 líneas por archivo (guía)

---

## Estructura de Directorios

```
/
├── src/                      # Código fuente TypeScript
│   ├── agents/              # Runtime de agente y gestión de sesiones
│   ├── gateway/             # Servidor gateway y registro de chat
│   ├── channels/            # Infraestructura base de canales
│   ├── cli/                 # Comandos de interfaz de línea de comandos
│   ├── browser/             # Herramienta de automatización de navegador
│   ├── canvas-host/         # Host de Canvas y framework A2UI
│   ├── media/               # Pipeline de procesamiento de medios
│   ├── plugins/             # Sistema de plugins y cargador
│   ├── config/              # Sistema de configuración
│   ├── whatsapp/            # Integración WhatsApp
│   ├── telegram/            # Integración Telegram
│   ├── signal/              # Integración Signal
│   ├── discord/             # Integración Discord
│   ├── slack/               # Integración Slack
│   ├── imessage/            # Integración iMessage
│   ├── routing/             # Enrutamiento de mensajes
│   ├── security/            # Auth y políticas de seguridad
│   ├── memory/              # Gestión de memoria/contexto
│   ├── tts/                 # Integración text-to-speech
│   ├── wizard/              # Flujo de asistente de onboarding CLI
│   ├── web/                 # Frontend WebChat y Control UI
│   ├── utils/               # Utilidades compartidas
│   └── ...
│
├── extensions/              # Plugins de canal y extensiones
│   ├── bluebubbles/        # Plugin BlueBubbles
│   ├── matrix/             # Plugin Matrix
│   ├── msteams/            # Plugin Microsoft Teams
│   ├── zalo/               # Plugin Zalo
│   ├── zalouser/           # Plugin Zalo Personal
│   ├── voice-call/         # Plugin Voice Call
│   └── ...
│
├── apps/                    # Aplicaciones nativas
│   ├── macos/              # App macOS (SwiftUI)
│   ├── ios/                # App iOS (SwiftUI)
│   └── android/            # App Android (Kotlin)
│
├── docs/                    # Documentación
│   ├── start/              # Guías de inicio
│   ├── install/            # Guías de instalación
│   ├── channels/           # Documentación de canales
│   ├── concepts/           # Documentación de conceptos
│   ├── cli/                # Documentación de CLI
│   ├── gateway/            # Documentación de gateway
│   ├── platforms/          # Guías específicas de plataforma
│   ├── providers/          # Documentación de proveedores
│   ├── reference/          # Documentación de referencia
│   └── ...
│
├── skills/                  # Paquetes de skills de workspace
│   └── workspace1/         # Ejemplo de workspace
│
├── packages/                # Paquetes monorepo
│   └── ...
│
├── scripts/                 # Scripts de utilidad
│   ├── build-*.ts          # Scripts de build
│   ├── test-*.sh           # Scripts de test
│   ├── package-*.sh        # Scripts de empaquetado
│   └── ...
│
├── test/                    # Fixtures de test y helpers
│   ├── fixtures/           # Datos de prueba
│   └── helpers/            # Utilidades de test
│
├── ui/                      # UI web (Control UI)
│   └── ...
│
├── vendor/                  # Dependencias vendorizadas
│   └── ...
│
├── .github/                 # Workflows de GitHub Actions
│   ├── workflows/          # Definiciones de workflow CI/CD
│   └── labeler.yml         # Configuración de auto-etiquetado
│
├── dist/                    # Salida compilada (generada)
│   └── ...
│
├── package.json             # Configuración de paquete npm
├── pnpm-workspace.yaml      # Configuración de workspace pnpm
├── tsconfig.json            # Configuración de TypeScript
├── vitest.config.ts         # Configuración de Vitest
├── docker-compose.yml       # Configuración de Docker Compose
├── Dockerfile               # Dockerfile principal
├── README.md                # README principal (inglés)
├── CHANGELOG.md             # Registro de cambios
├── LICENSE                  # Licencia MIT
└── ...
```

### Directorios Clave

#### `/src/`
Código fuente principal de TypeScript. Organizado por dominio:
- **Agentes & Runtime**: `agents/`, `memory/`, `sessions/`
- **Comunicación**: `gateway/`, `channels/`, `routing/`
- **Canales Integrados**: `whatsapp/`, `telegram/`, `discord/`, etc.
- **Herramientas**: `browser/`, `canvas-host/`, `media/`, `tts/`
- **Sistema**: `cli/`, `config/`, `plugins/`, `daemon/`
- **Seguridad**: `security/`, `pairing/`
- **UI**: `web/`, `wizard/`, `tui/`

#### `/extensions/`
Plugins de extensión (20+ canales). Cada extensión es un paquete npm auto-contenido:
- Tiene su propio `package.json`
- Define `plugin.manifest.json`
- Implementa hooks de plugin
- Puede tener dependencias propias

#### `/apps/`
Aplicaciones nativas para múltiples plataformas:
- **macOS**: App SwiftUI con integración de menubar
- **iOS**: App SwiftUI con soporte de voz
- **Android**: App Kotlin con soporte de voz

#### `/docs/`
Documentación completa (Mintlify):
- Guías de inicio rápido
- Tutoriales de instalación
- Documentación de conceptos
- Referencia de API
- Guías específicas de plataforma
- Documentación de desarrollo de plugins

#### `/skills/`
Skills de workspace. Cada workspace puede tener:
- Prompts personalizados
- Herramientas bash personalizadas
- Integraciones personalizadas
- Configuración específica de workspace

#### `/scripts/`
Scripts de utilidad para:
- Construcción y empaquetado
- Testing (unit, E2E, Docker)
- Generación de código (protocol, Swift)
- Gestión de releases
- Automatización de desarrollo

#### `/test/`
Fixtures de test y helpers:
- Datos de prueba
- Mocks y stubs
- Utilidades de test
- Configuraciones de test

---

## Recursos Adicionales

### Documentación Oficial
- **Sitio Web**: https://molt.bot
- **Documentación**: https://docs.molt.bot
- **Comenzar**: https://docs.molt.bot/start/getting-started
- **FAQ**: https://docs.molt.bot/start/faq
- **Showcase**: https://docs.molt.bot/start/showcase

### Comunidad
- **Discord**: https://discord.gg/clawd
- **GitHub**: https://github.com/moltbot/moltbot
- **Releases**: https://github.com/moltbot/moltbot/releases

### Guías de Desarrollo
- **Desarrollo de Plugins**: Ver `PLUGIN-DEVELOPMENT.md`
- **Referencia de API**: Ver `API-REFERENCE.md`
- **Guía de Arquitectura**: Ver `ARCHITECTURE.md`
- **Guía de Despliegue**: Ver `DEPLOYMENT.md`

---

## Licencia

MIT License - Ver [LICENSE](../LICENSE) para detalles.

---

## Contribuir

¡Las contribuciones son bienvenidas! Ver [CONTRIBUTING.md](../CONTRIBUTING.md) para guías.

---

**¡Feliz hacking con Moltbot! 🦞**

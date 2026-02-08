---
summary: "Instala OpenClaw y ejecuta tu primer chat en minutos."
read_when:
  - Primera configuración desde cero
  - Quieres el camino más rápido a un chat funcional
title: "Primeros pasos"
x-i18n:
  generated_at: "2026-02-08T22:00:00Z"
  model: claude-sonnet-4
  provider: pi
  source_hash: 6c93ffa2625c5778e4d8534284eadac80d8d052bab0333185cce495d2acecf01
  source_path: start/getting-started.md
  workflow: 15
---

# Primeros pasos

Objetivo: ir de cero a un primer chat funcional con una configuración mínima.

<Info>
Chat más rápido: abre la Control UI (no necesita configuración de canales). Ejecuta `openclaw dashboard`
y chatea en el navegador, o abre `http://127.0.0.1:18789/` en el
<Tooltip headline="Host del Gateway" tip="La máquina que ejecuta el servicio gateway de OpenClaw.">host del Gateway</Tooltip>.
Documentación: [Dashboard](/web/dashboard) y [Control UI](/web/control-ui).
</Info>

## Requisitos previos

- Node 22 o superior

<Tip>
Comprueba tu versión de Node con `node --version` si no estás seguro.
</Tip>

## Configuración rápida (CLI)

<Steps>
  <Step title="Instalar OpenClaw (recomendado)">
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
    Otros métodos de instalación y requisitos: [Instalación](/install).
    </Note>

  </Step>
  <Step title="Ejecutar el asistente de onboarding">
    ```bash
    openclaw onboard --install-daemon
    ```

    El asistente configura la autenticación, los ajustes del gateway y los canales opcionales.
    Consulta [Asistente de Onboarding](/start/wizard) para más detalles.

  </Step>
  <Step title="Comprobar el Gateway">
    Si instalaste el servicio, debería estar ejecutándose:

    ```bash
    openclaw gateway status
    ```

  </Step>
  <Step title="Abrir la Control UI">
    ```bash
    openclaw dashboard
    ```
  </Step>
</Steps>

<Check>
Si la Control UI se carga, tu Gateway está listo para usar.
</Check>

## Comprobaciones opcionales y extras

<AccordionGroup>
  <Accordion title="Ejecutar el Gateway en primer plano">
    Útil para pruebas rápidas o resolución de problemas.

    ```bash
    openclaw gateway --port 18789
    ```

  </Accordion>
  <Accordion title="Enviar un mensaje de prueba">
    Requiere un canal configurado.

    ```bash
    openclaw message send --target +15555550123 --message "Hola desde OpenClaw"
    ```

  </Accordion>
</AccordionGroup>

## Variables de entorno útiles

Si ejecutas OpenClaw como cuenta de servicio o quieres ubicaciones personalizadas para configuración/estado:

- `OPENCLAW_HOME` establece el directorio home usado para la resolución de rutas internas.
- `OPENCLAW_STATE_DIR` sobreescribe el directorio de estado.
- `OPENCLAW_CONFIG_PATH` sobreescribe la ruta del archivo de configuración.

Referencia completa de variables de entorno: [Variables de entorno](/help/environment).

## Profundizar

<Columns>
  <Card title="Asistente de Onboarding (detalles)" href="/start/wizard">
    Referencia completa del asistente CLI y opciones avanzadas.
  </Card>
  <Card title="Onboarding de la app macOS" href="/start/onboarding">
    Flujo de primera ejecución para la app macOS.
  </Card>
</Columns>

## Lo que tendrás

- Un Gateway en ejecución
- Autenticación configurada
- Acceso a la Control UI o un canal conectado

## Próximos pasos

- Seguridad de DMs y aprobaciones: [Emparejamiento](/channels/pairing)
- Conectar más canales: [Canales](/channels)
- Flujos de trabajo avanzados y desde código fuente: [Configuración](/start/setup)

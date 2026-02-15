/**
 * Discord Embed Templates
 * 
 * Beautiful, ready-to-use embed templates for common use cases.
 * All templates follow Discord's embed limits and best practices.
 * 
 * @see https://discord.com/developers/docs/resources/channel#embed-object
 */

export type DiscordEmbedColor = number;

/** Discord brand color (Blurple) */
export const DISCORD_BLURPLE: DiscordEmbedColor = 0x5865F2;

/** Common status colors */
export const EmbedColors = {
  SUCCESS: 0x00D26A,    // Green
  INFO: 0x5865F2,       // Blurple
  WARNING: 0xFEE75C,    // Yellow
  ERROR: 0xED4245,      // Red
  NEUTRAL: 0x99AAB5,    // Gray
} as const;

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: DiscordEmbedColor;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
  thumbnail?: {
    url: string;
  };
  image?: {
    url: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
}

/**
 * Create a simple status embed
 */
export function createStatusEmbed(params: {
  title: string;
  description?: string;
  status: "success" | "info" | "warning" | "error";
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: string;
}): DiscordEmbed {
  const colorMap = {
    success: EmbedColors.SUCCESS,
    info: EmbedColors.INFO,
    warning: EmbedColors.WARNING,
    error: EmbedColors.ERROR,
  };

  return {
    title: params.title,
    description: params.description,
    color: colorMap[params.status],
    fields: params.fields,
    footer: params.footer ? { text: params.footer } : undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an alert/warning embed
 */
export function createAlertEmbed(params: {
  title: string;
  message: string;
  details?: Array<{ label: string; value: string }>;
  action?: string;
}): DiscordEmbed {
  const fields = params.details?.map((d) => ({
    name: d.label,
    value: d.value,
    inline: true,
  }));

  if (params.action) {
    fields?.push({
      name: "📋 Action Required",
      value: params.action,
      inline: false,
    });
  }

  return {
    title: `⚠️ ${params.title}`,
    description: params.message,
    color: EmbedColors.WARNING,
    fields,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a system status embed
 */
export function createSystemStatusEmbed(params: {
  title: string;
  status: "healthy" | "degraded" | "down";
  metrics: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: string;
}): DiscordEmbed {
  const statusColors = {
    healthy: EmbedColors.SUCCESS,
    degraded: EmbedColors.WARNING,
    down: EmbedColors.ERROR,
  };

  const statusEmoji = {
    healthy: "✅",
    degraded: "⚠️",
    down: "🚨",
  };

  return {
    title: `${statusEmoji[params.status]} ${params.title}`,
    color: statusColors[params.status],
    fields: params.metrics,
    footer: params.footer
      ? { text: params.footer }
      : { text: "OpenClaw System Monitor" },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a session warning embed (for large session files)
 */
export function createSessionWarningEmbed(params: {
  sessionId: string;
  size: string;
  issue: string;
  recommendation: string;
}): DiscordEmbed {
  return createAlertEmbed({
    title: "Large Session Warning",
    message: params.issue,
    details: [
      { label: "Session ID", value: `\`${params.sessionId.slice(0, 12)}...\`` },
      { label: "Size", value: params.size },
    ],
    action: params.recommendation,
  });
}

/**
 * Create a cron job status embed
 */
export function createCronStatusEmbed(params: {
  jobs: Array<{
    name: string;
    status: "ok" | "idle" | "error";
    nextRun?: string;
  }>;
}): DiscordEmbed {
  const fields = params.jobs.map((job) => {
    const emoji = {
      ok: "✅",
      idle: "⏸️",
      error: "❌",
    }[job.status];

    return {
      name: `${emoji} ${job.name}`,
      value: job.nextRun ? `Next: ${job.nextRun}` : "Idle",
      inline: true,
    };
  });

  return createSystemStatusEmbed({
    title: "Cron Jobs Status",
    status: params.jobs.every((j) => j.status === "ok") ? "healthy" : "degraded",
    metrics: fields,
  });
}

/**
 * Create a memory system status embed
 */
export function createMemoryStatusEmbed(params: {
  neurons: number;
  synapses: number;
  fibers: number;
  observations: { lines: number; size: string };
  sessions: { count: number; size: string };
}): DiscordEmbed {
  return {
    title: "🧠 Memory System Status",
    description: "NeuralMemory + SQLite Dual Storage",
    color: EmbedColors.INFO,
    fields: [
      {
        name: "Neural Brain",
        value: `Neurons: ${params.neurons}\nSynapses: ${params.synapses}\nFibers: ${params.fibers}`,
        inline: true,
      },
      {
        name: "Observations",
        value: `Lines: ${params.observations.lines}\nSize: ${params.observations.size}`,
        inline: true,
      },
      {
        name: "Sessions",
        value: `Count: ${params.sessions.count}\nTotal: ${params.sessions.size}`,
        inline: true,
      },
    ],
    footer: { text: "Hybrid Vector + BM25 Search" },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a generic info embed with custom fields
 */
export function createInfoEmbed(params: {
  title: string;
  description?: string;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
  color?: DiscordEmbedColor;
  footer?: string;
  thumbnail?: string;
}): DiscordEmbed {
  return {
    title: params.title,
    description: params.description,
    color: params.color ?? EmbedColors.INFO,
    fields: params.fields,
    footer: params.footer ? { text: params.footer } : undefined,
    thumbnail: params.thumbnail ? { url: params.thumbnail } : undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an error embed
 */
export function createErrorEmbed(params: {
  title: string;
  error: string;
  stack?: string;
  context?: Record<string, string>;
}): DiscordEmbed {
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: "Error",
      value: `\`\`\`\n${params.error.slice(0, 1000)}\n\`\`\``,
      inline: false,
    },
  ];

  if (params.context) {
    fields.push(
      ...Object.entries(params.context).map(([key, value]) => ({
        name: key,
        value: value,
        inline: true,
      }))
    );
  }

  if (params.stack) {
    fields.push({
      name: "Stack Trace",
      value: `\`\`\`\n${params.stack.slice(0, 500)}...\n\`\`\``,
      inline: false,
    });
  }

  return {
    title: `🚨 ${params.title}`,
    color: EmbedColors.ERROR,
    fields,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a success confirmation embed
 */
export function createSuccessEmbed(params: {
  title: string;
  message: string;
  details?: Record<string, string>;
}): DiscordEmbed {
  const fields = params.details
    ? Object.entries(params.details).map(([key, value]) => ({
        name: key,
        value: value,
        inline: true,
      }))
    : undefined;

  return {
    title: `✅ ${params.title}`,
    description: params.message,
    color: EmbedColors.SUCCESS,
    fields,
    timestamp: new Date().toISOString(),
  };
}

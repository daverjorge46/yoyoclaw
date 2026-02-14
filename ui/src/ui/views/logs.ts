import { html, nothing } from "lit";
import type { AppMode } from "../app.ts";
import type { LogEntry, LogLevel } from "../types.ts";

const LEVELS: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];

export type LogsProps = {
  mode: AppMode;
  loading: boolean;
  error: string | null;
  file: string | null;
  entries: LogEntry[];
  filterText: string;
  levelFilters: Record<LogLevel, boolean>;
  autoFollow: boolean;
  truncated: boolean;
  onFilterTextChange: (next: string) => void;
  onLevelToggle: (level: LogLevel, enabled: boolean) => void;
  onToggleAutoFollow: (next: boolean) => void;
  onRefresh: () => void;
  onExport: (lines: string[], label: string) => void;
  onScroll: (event: Event) => void;
};

function formatTime(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString();
}

function matchesFilter(entry: LogEntry, needle: string) {
  if (!needle) {
    return true;
  }
  const haystack = [entry.message, entry.subsystem, entry.raw]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function renderLogs(props: LogsProps) {
  const isBasic = props.mode === "basic";
  const needle = props.filterText.trim().toLowerCase();
  const levelFiltered = LEVELS.some((level) => !props.levelFilters[level]);
  const filtered = props.entries.filter((entry) => {
    if (entry.level && !props.levelFilters[entry.level]) {
      return false;
    }
    return matchesFilter(entry, needle);
  });
  const exportLabel = needle || levelFiltered ? "filtered" : "visible";

  return html`
    <div class="logs-toolbar">
      <input
        type="text"
        .value=${props.filterText}
        @input=${(e: Event) => props.onFilterTextChange((e.target as HTMLInputElement).value)}
        placeholder="Search logs"
      />
      <label class="logs-auto-follow">
        <input
          type="checkbox"
          .checked=${props.autoFollow}
          @change=${(e: Event) => props.onToggleAutoFollow((e.target as HTMLInputElement).checked)}
        />
        <span>Auto-follow</span>
      </label>
      <button class="btn btn--sm" ?disabled=${props.loading} @click=${props.onRefresh}>
        ${props.loading ? "Loading…" : "Refresh"}
      </button>
      <button
        class="btn btn--sm"
        ?disabled=${filtered.length === 0}
        @click=${() =>
          props.onExport(
            filtered.map((entry) => entry.raw),
            exportLabel,
          )}
      >
        Export ${exportLabel}
      </button>
    </div>

    <div class="chip-row" style="margin-top: 8px;">
      ${LEVELS.map(
        (level) => html`
          <button
            class="log-chip ${level} ${props.levelFilters[level] ? "active" : ""}"
            @click=${() => props.onLevelToggle(level, !props.levelFilters[level])}
          >
            ${level}
          </button>
        `,
      )}
    </div>

    ${
      props.file
        ? html`<div class="muted" style="margin-top: 10px;">File: ${props.file}</div>`
        : nothing
    }
    ${
      props.truncated
        ? html`
            <div class="callout" style="margin-top: 10px">Log output truncated; showing latest chunk.</div>
          `
        : nothing
    }
    ${
      props.error
        ? html`<div class="callout danger" style="margin-top: 10px;">${props.error}</div>`
        : nothing
    }

    <section class="card" style="margin-top: 8px; padding: 0;">
      <div class="log-stream" @scroll=${props.onScroll}>
        ${
          filtered.length === 0
            ? html`
                <div class="muted" style="padding: 12px">No log entries.</div>
              `
            : filtered.map(
                (entry) => html`
                <div class="log-row">
                  <div class="log-time mono">${formatTime(entry.time)}</div>
                  <div class="log-level ${entry.level ?? ""}">${entry.level ?? ""}</div>
                  ${
                    // Basic mode shows simplified logs (hide subsystem)
                    // Advanced mode shows verbose logs (show subsystem)
                    isBasic
                      ? nothing
                      : html`<div class="log-subsystem mono">${entry.subsystem ?? ""}</div>`
                  }
                  <div class="log-message mono">${entry.message ?? entry.raw}</div>
                </div>
              `,
              )
        }
      </div>
    </section>
  `;
}

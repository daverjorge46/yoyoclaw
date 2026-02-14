import { html, nothing } from "lit";
import type { AppMode } from "../app.ts";
import type { LogEntry, LogLevel } from "../types.ts";

const LEVELS: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
const LEVEL_ORDER: Record<string, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

type SortField = "time" | "level" | "subsystem" | "message";
type SortDir = "asc" | "desc";

// Module-level sort state (persists across re-renders)
let currentSortField: SortField = "time";
let currentSortDir: SortDir = "desc";

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

function sortEntries(entries: LogEntry[], field: SortField, dir: SortDir): LogEntry[] {
  const sorted = [...entries].toSorted((a, b) => {
    let cmp = 0;
    switch (field) {
      case "time":
        cmp = (a.time ?? "").localeCompare(b.time ?? "");
        break;
      case "level":
        cmp = (LEVEL_ORDER[a.level ?? ""] ?? -1) - (LEVEL_ORDER[b.level ?? ""] ?? -1);
        break;
      case "subsystem":
        cmp = (a.subsystem ?? "").localeCompare(b.subsystem ?? "");
        break;
      case "message":
        cmp = (a.message ?? a.raw ?? "").localeCompare(b.message ?? b.raw ?? "");
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

function toggleSort(field: SortField, requestUpdate: () => void) {
  if (currentSortField === field) {
    currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
  } else {
    currentSortField = field;
    currentSortDir = field === "time" ? "desc" : "asc";
  }
  requestUpdate();
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
  const sorted = sortEntries(filtered, currentSortField, currentSortDir);
  const exportLabel = needle || levelFiltered ? "filtered" : "visible";

  // Force re-render by triggering filter text change with same value
  const requestUpdate = () => props.onFilterTextChange(props.filterText);

  const renderHeaderCell = (field: SortField, label: string) => {
    const isSorted = currentSortField === field;
    const arrow = isSorted ? (currentSortDir === "asc" ? "↑" : "↓") : "↕";
    return html`
      <div
        class="log-header-cell ${isSorted ? "sorted" : ""}"
        @click=${() => toggleSort(field, requestUpdate)}
      >
        ${label}
        <span class="log-sort-arrow">${arrow}</span>
      </div>
    `;
  };

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
        ?disabled=${sorted.length === 0}
        @click=${() =>
          props.onExport(
            sorted.map((entry) => entry.raw),
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
        <div class="log-header">
          ${renderHeaderCell("time", "Time")}
          ${renderHeaderCell("level", "Level")}
          ${isBasic ? nothing : renderHeaderCell("subsystem", "Subsystem")}
          ${renderHeaderCell("message", "Message")}
        </div>
        ${
          sorted.length === 0
            ? html`
                <div class="muted" style="padding: 12px">No log entries.</div>
              `
            : sorted.map(
                (entry) => html`
                <div class="log-row">
                  <div class="log-time mono">${formatTime(entry.time)}</div>
                  <div class="log-level ${entry.level ?? ""}">${entry.level ?? ""}</div>
                  ${isBasic ? nothing : html`<div class="log-subsystem mono">${entry.subsystem ?? ""}</div>`}
                  <div class="log-message mono">${entry.message ?? entry.raw}</div>
                </div>
              `,
              )
        }
      </div>
    </section>
  `;
}

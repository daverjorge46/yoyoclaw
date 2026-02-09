import { html, nothing } from "lit";
import type { JobsListResult, TrackedJob, JobToolCall } from "../types.ts";
import { formatAgo } from "../format.ts";

export type JobsProps = {
  loading: boolean;
  error: string | null;
  result: JobsListResult | null;
  selectedRunId: string | null;
  selectedJob: TrackedJob | null;
  filterStatus: string;
  filterChannel: string;
  hideHeartbeats: boolean;
  onRefresh: () => void;
  onFilterStatusChange: (status: string) => void;
  onFilterChannelChange: (channel: string) => void;
  onHideHeartbeatsChange: (hide: boolean) => void;
  onSelectJob: (runId: string | null) => void;
};

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "aborted", label: "Aborted" },
] as const;

const CHANNEL_OPTIONS = [
  { value: "", label: "All channels" },
  { value: "webchat", label: "Webchat" },
  { value: "discord", label: "Discord" },
  { value: "telegram", label: "Telegram" },
  { value: "slack", label: "Slack" },
  { value: "signal", label: "Signal" },
  { value: "imessage", label: "iMessage" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "nostr", label: "Nostr" },
  { value: "googlechat", label: "Google Chat" },
  { value: "msteams", label: "MS Teams" },
  { value: "matrix", label: "Matrix" },
  { value: "subagent", label: "Subagent" },
] as const;

function statusChipClass(status: string): string {
  switch (status) {
    case "running":
      return "chip chip--running";
    case "completed":
      return "chip chip--success";
    case "failed":
      return "chip chip--danger";
    case "aborted":
      return "chip chip--warning";
    default:
      return "chip";
  }
}

function formatDuration(ms: number | undefined): string {
  if (ms == null) {
    return "-";
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const secs = ms / 1000;
  if (secs < 60) {
    return `${secs.toFixed(1)}s`;
  }
  const mins = Math.floor(secs / 60);
  const remainSecs = Math.round(secs % 60);
  return `${mins}m ${remainSecs}s`;
}

function formatRunId(runId: string): string {
  if (runId.length <= 12) {
    return runId;
  }
  return `${runId.slice(0, 8)}...`;
}

function liveDuration(job: TrackedJob): string {
  if (job.durationMs != null) {
    return formatDuration(job.durationMs);
  }
  if (job.startedAt) {
    return formatDuration(Date.now() - job.startedAt);
  }
  return "-";
}

export function renderJobs(props: JobsProps) {
  const jobs = props.result?.jobs ?? [];
  const activeCount = props.result?.activeCount ?? 0;
  const total = props.result?.total ?? 0;

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <div>
          <div class="card-title">Jobs</div>
          <div class="card-sub">
            ${
              activeCount > 0
                ? html`<span class="chip chip--running" style="margin-right: 8px;">${activeCount} active</span>`
                : nothing
            }
            ${total} total
          </div>
        </div>
        <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div class="filters" style="margin-top: 14px;">
        <label class="field">
          <span>Status</span>
          <select
            .value=${props.filterStatus}
            @change=${(e: Event) =>
              props.onFilterStatusChange((e.target as HTMLSelectElement).value)}
          >
            ${STATUS_OPTIONS.map((opt) => html`<option value=${opt.value}>${opt.label}</option>`)}
          </select>
        </label>
        <label class="field">
          <span>Channel</span>
          <select
            .value=${props.filterChannel}
            @change=${(e: Event) =>
              props.onFilterChannelChange((e.target as HTMLSelectElement).value)}
          >
            ${CHANNEL_OPTIONS.map((opt) => html`<option value=${opt.value}>${opt.label}</option>`)}
          </select>
        </label>
        <label class="field checkbox">
          <span>Hide heartbeats</span>
          <input
            type="checkbox"
            .checked=${props.hideHeartbeats}
            @change=${(e: Event) =>
              props.onHideHeartbeatsChange((e.target as HTMLInputElement).checked)}
          />
        </label>
      </div>

      ${
        props.error
          ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
          : nothing
      }

      <div class="table" style="margin-top: 16px;">
        <div class="table-head">
          <div>Status</div>
          <div>Run ID</div>
          <div>Channel</div>
          <div>Started</div>
          <div>Duration</div>
          <div>Tools</div>
          <div>Preview</div>
        </div>
        ${
          jobs.length === 0
            ? html`
                <div class="muted" style="padding: 12px 0">No jobs found.</div>
              `
            : jobs.map((job) => renderJobRow(job, props))
        }
      </div>
    </section>

    ${props.selectedJob ? renderJobDetail(props.selectedJob, props.onSelectJob) : nothing}
  `;
}

function renderJobRow(job: TrackedJob, props: JobsProps) {
  const isSelected = props.selectedRunId === job.runId;
  const started = job.startedAt ? formatAgo(job.startedAt) : "-";
  const duration = liveDuration(job);
  const toolCount = job.toolCalls?.length ?? 0;
  const activeTool = job.activeToolCount > 0 ? ` (${job.activeToolCount} active)` : "";
  const preview = job.textPreview
    ? job.textPreview.length > 60
      ? `${job.textPreview.slice(0, 60)}...`
      : job.textPreview
    : job.error
      ? `Error: ${job.error.slice(0, 50)}`
      : "";

  return html`
    <div
      class="table-row ${isSelected ? "table-row--selected" : ""}"
      style="cursor: pointer;"
      @click=${() => props.onSelectJob(isSelected ? null : job.runId)}
    >
      <div>
        <span class=${statusChipClass(job.status)}>
          ${job.status}${job.isHeartbeat ? " (hb)" : ""}
        </span>
      </div>
      <div class="mono" title=${job.runId}>${formatRunId(job.runId)}</div>
      <div>${job.channel ?? "-"}</div>
      <div>${started}</div>
      <div>${duration}</div>
      <div>${toolCount}${activeTool}</div>
      <div class="muted" style="font-size: 0.85em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">${preview}</div>
    </div>
  `;
}

function renderJobDetail(job: TrackedJob, onClose: (runId: string | null) => void) {
  const started = job.startedAt ? new Date(job.startedAt).toLocaleString() : "-";
  const ended = job.endedAt ? new Date(job.endedAt).toLocaleString() : "-";
  const duration = liveDuration(job);

  return html`
    <section class="card" style="margin-top: 16px;">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <div class="card-title">Job Detail</div>
        <button class="btn" @click=${() => onClose(null)}>Close</button>
      </div>

      <div style="margin-top: 12px; display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; font-size: 0.9em;">
        <span class="muted">Run ID</span>
        <span class="mono">${job.runId}</span>
        <span class="muted">Status</span>
        <span><span class=${statusChipClass(job.status)}>${job.status}</span></span>
        <span class="muted">Channel</span>
        <span>${job.channel ?? "-"}</span>
        <span class="muted">Agent</span>
        <span>${job.agentId ?? "-"}</span>
        <span class="muted">Lane</span>
        <span>${job.lane ?? "-"}</span>
        <span class="muted">Session</span>
        <span class="mono" style="font-size: 0.85em; word-break: break-all;">${job.sessionKey ?? "-"}</span>
        <span class="muted">Started</span>
        <span>${started}</span>
        <span class="muted">Ended</span>
        <span>${ended}</span>
        <span class="muted">Duration</span>
        <span>${duration}</span>
        ${
          job.isHeartbeat
            ? html`
                <span class="muted">Type</span><span>Heartbeat</span>
              `
            : nothing
        }
      </div>

      ${
        job.error
          ? html`<div class="callout danger" style="margin-top: 12px;">${job.error}</div>`
          : nothing
      }

      ${
        job.textPreview
          ? html`
            <div style="margin-top: 16px;">
              <div class="card-sub" style="margin-bottom: 4px;">Output preview</div>
              <pre class="code-block" style="max-height: 200px; overflow: auto; white-space: pre-wrap; word-break: break-word; font-size: 0.85em;">${job.textPreview}</pre>
            </div>
          `
          : nothing
      }

      ${
        job.thinkingPreview
          ? html`
            <div style="margin-top: 12px;">
              <div class="card-sub" style="margin-bottom: 4px;">Thinking</div>
              <pre class="code-block" style="max-height: 120px; overflow: auto; white-space: pre-wrap; word-break: break-word; font-size: 0.85em; opacity: 0.7;">${job.thinkingPreview}</pre>
            </div>
          `
          : nothing
      }

      ${renderToolCallTimeline(job.toolCalls ?? [])}
    </section>
  `;
}

function renderToolCallTimeline(toolCalls: JobToolCall[]) {
  if (toolCalls.length === 0) {
    return nothing;
  }

  return html`
    <div style="margin-top: 16px;">
      <div class="card-sub" style="margin-bottom: 8px;">Tool calls (${toolCalls.length})</div>
      <div class="table" style="font-size: 0.85em;">
        <div class="table-head">
          <div>Tool</div>
          <div>Status</div>
          <div>Duration</div>
        </div>
        ${toolCalls.map((tc) => {
          const isActive = !tc.endedAt;
          const duration = tc.endedAt
            ? formatDuration(tc.endedAt - tc.startedAt)
            : formatDuration(Date.now() - tc.startedAt);
          const statusLabel = isActive ? "running" : tc.isError ? "error" : "done";
          const chipClass = isActive
            ? "chip chip--running"
            : tc.isError
              ? "chip chip--danger"
              : "chip chip--success";
          return html`
            <div class="table-row">
              <div class="mono">${tc.name}</div>
              <div><span class=${chipClass}>${statusLabel}</span></div>
              <div>${duration}</div>
            </div>
          `;
        })}
      </div>
    </div>
  `;
}

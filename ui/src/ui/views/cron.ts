import { html, nothing } from "lit";
import type { ChannelUiMetaEntry, CronJob, CronRunLogEntry, CronStatus } from "../types.ts";
import type { CronFormState } from "../ui-types.ts";
import { formatRelativeTimestamp, formatMs } from "../format.ts";
import { pathForTab } from "../navigation.ts";
import { formatCronSchedule, formatNextRun } from "../presenter.ts";
import { icons } from "../icons.ts";

export type CronProps = {
  basePath: string;
  loading: boolean;
  status: CronStatus | null;
  jobs: CronJob[];
  error: string | null;
  busy: boolean;
  form: CronFormState;
  channels: string[];
  channelLabels?: Record<string, string>;
  channelMeta?: ChannelUiMetaEntry[];
  runsJobId: string | null;
  runs: CronRunLogEntry[];
  onFormChange: (patch: Partial<CronFormState>) => void;
  onRefresh: () => void;
  onAdd: () => void;
  onToggle: (job: CronJob, enabled: boolean) => void;
  onRun: (job: CronJob) => void;
  onRemove: (job: CronJob) => void;
  onLoadRuns: (jobId: string) => void;
};

function buildChannelOptions(props: CronProps): string[] {
  const options = ["last", ...props.channels.filter(Boolean)];
  const current = props.form.deliveryChannel?.trim();
  if (current && !options.includes(current)) {
    options.push(current);
  }
  const seen = new Set<string>();
  return options.filter((value) => {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

function resolveChannelLabel(props: CronProps, channel: string): string {
  if (channel === "last") {
    return "last";
  }
  const meta = props.channelMeta?.find((entry) => entry.id === channel);
  if (meta?.label) {
    return meta.label;
  }
  return props.channelLabels?.[channel] ?? channel;
}

export function renderCron(props: CronProps) {
  const channelOptions = buildChannelOptions(props);
  const selectedJob =
    props.runsJobId == null ? undefined : props.jobs.find((job) => job.id === props.runsJobId);
  const selectedRunTitle = selectedJob?.name ?? props.runsJobId ?? "(select a job)";
  const orderedRuns = props.runs.toSorted((a, b) => b.ts - a.ts);
  return html`
    <section class="grid grid-cols-2">
      <div class="card">
        <div class="card-title">Scheduler</div>
        <div class="card-sub">Gateway-owned cron scheduler status.</div>
        <div class="stat-grid" style="margin-top: 16px;">
          <div class="stat">
            <div class="stat-label">Enabled</div>
            <div class="stat-value">
              ${props.status ? (props.status.enabled ? "Yes" : "No") : "n/a"}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">Jobs</div>
            <div class="stat-value">${props.status?.jobs ?? "n/a"}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Next wake</div>
            <div class="stat-value">${formatNextRun(props.status?.nextWakeAtMs ?? null)}</div>
          </div>
        </div>
        <div class="row" style="margin-top: 12px;">
          <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "Refreshing…" : "Refresh"}
          </button>
          ${props.error ? html`<span class="muted">${props.error}</span>` : nothing}
        </div>
      </div>

      <div class="card">
        <div class="card-title">New Job</div>
        <div class="card-sub">Create a scheduled wakeup or agent run.</div>
        <div class="form-grid" style="margin-top: 16px;">
          <label class="field">
            <span>Name</span>
            <input
              .value=${props.form.name}
              @input=${(e: Event) =>
                props.onFormChange({ name: (e.target as HTMLInputElement).value })}
            />
          </label>
          <label class="field">
            <span>Description</span>
            <input
              .value=${props.form.description}
              @input=${(e: Event) =>
                props.onFormChange({ description: (e.target as HTMLInputElement).value })}
            />
          </label>
          <label class="field">
            <span>Agent ID</span>
            <input
              .value=${props.form.agentId}
              @input=${(e: Event) =>
                props.onFormChange({ agentId: (e.target as HTMLInputElement).value })}
              placeholder="default"
            />
          </label>
          <label class="field checkbox">
            <span>Enabled</span>
            <input
              type="checkbox"
              .checked=${props.form.enabled}
              @change=${(e: Event) =>
                props.onFormChange({ enabled: (e.target as HTMLInputElement).checked })}
            />
          </label>
          <label class="field">
            <span>Schedule</span>
            <select
              .value=${props.form.scheduleKind}
              @change=${(e: Event) =>
                props.onFormChange({
                  scheduleKind: (e.target as HTMLSelectElement)
                    .value as CronFormState["scheduleKind"],
                })}
            >
              <option value="every">Every</option>
              <option value="at">At</option>
              <option value="cron">Cron</option>
            </select>
          </label>
        </div>
        ${renderScheduleFields(props)}
        <div class="form-grid" style="margin-top: 12px;">
          <label class="field">
            <span>Session</span>
            <select
              .value=${props.form.sessionTarget}
              @change=${(e: Event) =>
                props.onFormChange({
                  sessionTarget: (e.target as HTMLSelectElement)
                    .value as CronFormState["sessionTarget"],
                })}
            >
              <option value="main">Main</option>
              <option value="isolated">Isolated</option>
            </select>
          </label>
          <label class="field">
            <span>Wake mode</span>
            <select
              .value=${props.form.wakeMode}
              @change=${(e: Event) =>
                props.onFormChange({
                  wakeMode: (e.target as HTMLSelectElement).value as CronFormState["wakeMode"],
                })}
            >
              <option value="now">Now</option>
              <option value="next-heartbeat">Next heartbeat</option>
            </select>
          </label>
          <label class="field">
            <span>Payload</span>
            <select
              .value=${props.form.payloadKind}
              @change=${(e: Event) =>
                props.onFormChange({
                  payloadKind: (e.target as HTMLSelectElement)
                    .value as CronFormState["payloadKind"],
                })}
            >
              <option value="systemEvent">System event</option>
              <option value="agentTurn">Agent turn</option>
            </select>
          </label>
        </div>
        <label class="field" style="margin-top: 12px;">
          <span>${props.form.payloadKind === "systemEvent" ? "System text" : "Agent message"}</span>
          <textarea
            .value=${props.form.payloadText}
            @input=${(e: Event) =>
              props.onFormChange({
                payloadText: (e.target as HTMLTextAreaElement).value,
              })}
            rows="4"
          ></textarea>
        </label>
        ${
          props.form.payloadKind === "agentTurn"
            ? html`
                <div class="form-grid" style="margin-top: 12px;">
                  <label class="field">
                    <span>Delivery</span>
                    <select
                      .value=${props.form.deliveryMode}
                      @change=${(e: Event) =>
                        props.onFormChange({
                          deliveryMode: (e.target as HTMLSelectElement)
                            .value as CronFormState["deliveryMode"],
                        })}
                    >
                      <option value="announce">Announce summary (default)</option>
                      <option value="none">None (internal)</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Timeout (seconds)</span>
                    <input
                      .value=${props.form.timeoutSeconds}
                      @input=${(e: Event) =>
                        props.onFormChange({
                          timeoutSeconds: (e.target as HTMLInputElement).value,
                        })}
                    />
                  </label>
                  ${
                    props.form.deliveryMode === "announce"
                      ? html`
                          <label class="field">
                            <span>Channel</span>
                            <select
                              .value=${props.form.deliveryChannel || "last"}
                              @change=${(e: Event) =>
                                props.onFormChange({
                                  deliveryChannel: (e.target as HTMLSelectElement).value,
                                })}
                            >
                              ${channelOptions.map(
                                (channel) =>
                                  html`<option value=${channel}>
                                    ${resolveChannelLabel(props, channel)}
                                  </option>`,
                              )}
                            </select>
                          </label>
                          <label class="field">
                            <span>To</span>
                            <input
                              .value=${props.form.deliveryTo}
                              @input=${(e: Event) =>
                                props.onFormChange({
                                  deliveryTo: (e.target as HTMLInputElement).value,
                                })}
                              placeholder="+1555… or chat id"
                            />
                          </label>
                        `
                      : nothing
                  }
                </div>
              `
            : nothing
        }
        <div class="row" style="margin-top: 14px;">
          <button class="btn primary" ?disabled=${props.busy} @click=${props.onAdd}>
            ${props.busy ? "Saving…" : "Add job"}
          </button>
        </div>
      </div>
    </section>

    ${renderJobsSection(props)}
    ${renderRunsSection(props, selectedRunTitle, orderedRuns)}
  `;
}

function renderScheduleFields(props: CronProps) {
  const form = props.form;
  if (form.scheduleKind === "at") {
    return html`
      <label class="field" style="margin-top: 12px;">
        <span>Run at</span>
        <input
          type="datetime-local"
          .value=${form.scheduleAt}
          @input=${(e: Event) =>
            props.onFormChange({
              scheduleAt: (e.target as HTMLInputElement).value,
            })}
        />
      </label>
    `;
  }
  if (form.scheduleKind === "every") {
    return html`
      <div class="form-grid" style="margin-top: 12px;">
        <label class="field">
          <span>Every</span>
          <input
            .value=${form.everyAmount}
            @input=${(e: Event) =>
              props.onFormChange({
                everyAmount: (e.target as HTMLInputElement).value,
              })}
          />
        </label>
        <label class="field">
          <span>Unit</span>
          <select
            .value=${form.everyUnit}
            @change=${(e: Event) =>
              props.onFormChange({
                everyUnit: (e.target as HTMLSelectElement).value as CronFormState["everyUnit"],
              })}
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </label>
      </div>
    `;
  }
  return html`
    <div class="form-grid" style="margin-top: 12px;">
      <label class="field">
        <span>Expression</span>
        <input
          .value=${form.cronExpr}
          @input=${(e: Event) =>
            props.onFormChange({ cronExpr: (e.target as HTMLInputElement).value })}
        />
      </label>
      <label class="field">
        <span>Timezone (optional)</span>
        <input
          .value=${form.cronTz}
          @input=${(e: Event) =>
            props.onFormChange({ cronTz: (e.target as HTMLInputElement).value })}
        />
      </label>
    </div>
  `;
}

function renderJobsSection(props: CronProps) {
  return html`
    <section class="card" style="margin-top: 18px; padding: 0;">
      <div style="padding: 12px 14px; border-bottom: 1px solid var(--border);">
        <div class="card-title">Jobs</div>
        <div class="card-sub">All scheduled jobs stored in the gateway.</div>
      </div>
      ${
        props.jobs.length === 0
          ? html`
              <div style="padding: 12px 14px;" class="muted">No jobs yet.</div>
            `
          : html`
              <div class="log-header" style="grid-template-columns: 2fr 2fr 1fr 1fr;">
                <div>Name</div>
                <div>Schedule</div>
                <div>Status</div>
                <div>Last Run</div>
              </div>
              ${props.jobs.map((job) => renderJob(job, props))}
            `
      }
    </section>
  `;
}

function renderRunsSection(props: CronProps, selectedRunTitle: string, orderedRuns: CronRunLogEntry[]) {
  return html`
    <section class="card" style="margin-top: 18px; padding: 0;">
      <div style="padding: 12px 14px; border-bottom: 1px solid var(--border);">
        <div class="card-title">Run history</div>
        <div class="card-sub">Latest runs for ${selectedRunTitle}.</div>
      </div>
      ${
        props.runsJobId == null
          ? html`
              <div style="padding: 12px 14px;" class="muted">Select a job to inspect run history.</div>
            `
          : orderedRuns.length === 0
            ? html`
                <div style="padding: 12px 14px;" class="muted">No runs yet.</div>
              `
            : html`
              <div class="log-header" style="grid-template-columns: 1fr 2fr 1fr 1fr;">
                <div>Status</div>
                <div>Summary</div>
                <div>Time</div>
                <div>Duration</div>
              </div>
              ${orderedRuns.map((entry) => renderRun(entry, props.basePath))}
            `
      }
    </section>
  `;
}

function renderJob(job: CronJob, props: CronProps) {
  const isSelected = props.runsJobId === job.id;
  const rowStyle = isSelected ? "background: var(--bg-elevated);" : "";
  const statusClass = job.enabled ? "info" : "error";
  const statusText = job.enabled ? "enabled" : "disabled";
  const lastRun = job.state?.lastRunAtMs ? formatRelativeTimestamp(job.state.lastRunAtMs) : "never";
  
  return html`
    <div 
      class="log-row" 
      style="grid-template-columns: 2fr 2fr 1fr 1fr; height: 36px; padding: 0 14px; align-items: center; cursor: pointer; ${rowStyle}"
      @click=${() => props.onLoadRuns(job.id)}
    >
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        <span class="icon" style="width:14px;height:14px;margin-right:6px;">${icons.zap}</span>
        ${job.name}
      </div>
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${formatCronSchedule(job)}</div>
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        <span class="log-level ${statusClass}">${statusText}</span>
      </div>
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lastRun}</div>
    </div>
  `;
}

function renderRun(entry: CronRunLogEntry, basePath: string) {
  const chatUrl =
    typeof entry.sessionKey === "string" && entry.sessionKey.trim().length > 0
      ? `${pathForTab("chat", basePath)}?session=${encodeURIComponent(entry.sessionKey)}`
      : null;
  const statusClass = entry.status === "ok" ? "info" : entry.status === "error" ? "error" : "warn";
  const duration = `${entry.durationMs ?? 0}ms`;
  
  return html`
    <div class="log-row" style="grid-template-columns: 1fr 2fr 1fr 1fr; height: 36px; padding: 0 14px; align-items: center;">
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        <span class="log-level ${statusClass}">${entry.status}</span>
      </div>
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        ${entry.summary ?? ""}
        ${chatUrl ? html` · <a href=${chatUrl} style="font-size: 12px;">view</a>` : nothing}
      </div>
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${formatMs(entry.ts)}</div>
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${duration}</div>
    </div>
  `;
}

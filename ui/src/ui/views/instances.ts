import { html, nothing } from "lit";
import type { PresenceEntry } from "../types.ts";
import { formatPresenceAge, formatPresenceSummary } from "../presenter.ts";
import { icons } from "../icons.ts";

export type InstancesProps = {
  loading: boolean;
  entries: PresenceEntry[];
  lastError: string | null;
  statusMessage: string | null;
  onRefresh: () => void;
};

export function renderInstances(props: InstancesProps) {
  return html`
    <section class="card" style="padding: 0;">
      <div style="padding: 12px 14px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div class="card-title">Connected Instances</div>
          <div class="card-sub">Presence beacons from the gateway and clients.</div>
        </div>
        <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      ${
        props.lastError
          ? html`<div class="callout danger" style="margin: 12px 14px;">
            ${props.lastError}
          </div>`
          : nothing
      }
      ${
        props.statusMessage
          ? html`<div class="callout" style="margin: 12px 14px;">
            ${props.statusMessage}
          </div>`
          : nothing
      }
      ${
        props.entries.length === 0
          ? html`
              <div style="padding: 12px 14px;" class="muted">No instances reported yet.</div>
            `
          : html`
              <div class="log-header" style="grid-template-columns: 2fr 1fr 1fr 1fr;">
                <div>Host</div>
                <div>Mode</div>
                <div>Platform</div>
                <div>Last Seen</div>
              </div>
              ${props.entries.map((entry) => renderEntry(entry))}
            `
      }
    </section>
  `;
}

function renderEntry(entry: PresenceEntry) {
  const mode = entry.mode ?? "unknown";
  const platform = entry.platform ?? "unknown";
  const lastSeen = formatPresenceAge(entry);
  const host = entry.host ?? "unknown host";
  const roles = Array.isArray(entry.roles) ? entry.roles.filter(Boolean) : [];
  const scopes = Array.isArray(entry.scopes) ? entry.scopes.filter(Boolean) : [];
  const scopesLabel =
    scopes.length > 0
      ? scopes.length > 3
        ? `${scopes.length} scopes`
        : scopes.join(", ")
      : null;
  
  // Build tooltip/summary text
  const summary = formatPresenceSummary(entry);
  
  return html`
    <div 
      class="log-row" 
      style="grid-template-columns: 2fr 1fr 1fr 1fr; height: 36px; padding: 0 14px; align-items: center;"
      title="${summary}"
    >
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        <span class="icon" style="width:14px;height:14px;margin-right:6px;">${icons.monitor}</span>
        ${host}
      </div>
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        <span class="log-level info">${mode}</span>
      </div>
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${platform}</div>
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lastSeen}</div>
    </div>
  `;
}

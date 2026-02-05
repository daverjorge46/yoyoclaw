import { html, nothing } from "lit";
import { renderSpinner, renderEmptyState } from "../app-render.helpers.ts";
import { icons } from "../icons.ts";

export type UsageProps = {
  loading: boolean;
  error: string | null;
  status: unknown;
  cost: unknown;
  period: "24h" | "7d" | "30d" | "all";
  onPeriodChange: (period: "24h" | "7d" | "30d" | "all") => void;
  onRefresh: () => void;
};

/** Shape returned by usage.status (rate-limit windows per provider). */
type UsageStatusResponse = {
  updatedAt?: number;
  providers?: Array<{
    provider: string;
    displayName: string;
    windows?: Array<{ label: string; usedPercent?: number; resetAt?: number }>;
  }>;
};

/** Shape returned by usage.cost (token/cost totals). */
type UsageCostResponse = {
  updatedAt?: number;
  days?: number;
  daily?: unknown[];
  totals?: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
    totalTokens?: number;
    totalCost?: number;
    missingCostEntries?: number;
  };
};

const PERIOD_OPTIONS: Array<{ value: "24h" | "7d" | "30d" | "all"; label: string }> = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All" },
];

function formatTokenCount(n: number | undefined | null): string {
  if (n == null) {
    return "0";
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}k`;
  }
  return String(n);
}

function formatCost(n: number | undefined | null): string {
  if (n == null || n === 0) {
    return "$0.00";
  }
  if (n < 0.01) {
    return `$${n.toFixed(4)}`;
  }
  return `$${n.toFixed(2)}`;
}

function formatResetTime(resetAt: number | undefined): string {
  if (!resetAt) {
    return "";
  }
  const diff = resetAt - Date.now();
  if (diff <= 0) {
    return "resetting…";
  }
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) {
    return `resets in ${hours}h ${minutes}m`;
  }
  return `resets in ${minutes}m`;
}

/** Interpolate from green (#22c55e) → yellow (#eab308) → red (#ef4444) based on usage %. */
function usedPercentColor(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  let r: number, g: number, b: number;
  if (clamped <= 50) {
    // green → yellow
    const t = clamped / 50;
    r = Math.round(0x22 + (0xea - 0x22) * t);
    g = Math.round(0xc5 + (0xb3 - 0xc5) * t);
    b = Math.round(0x5e + (0x08 - 0x5e) * t);
  } else {
    // yellow → red
    const t = (clamped - 50) / 50;
    r = Math.round(0xea + (0xef - 0xea) * t);
    g = Math.round(0xb3 + (0x44 - 0xb3) * t);
    b = Math.round(0x08 + (0x44 - 0x08) * t);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

export function renderUsage(props: UsageProps) {
  const status = props.status as UsageStatusResponse | null;
  const cost = props.cost as UsageCostResponse | null;
  const hasData = status || cost;

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="card-title">Usage &amp; Cost</div>
          <div class="card-sub">Token usage and estimated costs across providers.</div>
        </div>
        <div class="row" style="gap: 8px;">
          <div class="usage-period-select">
            ${PERIOD_OPTIONS.map(
              (opt) => html`
                <button
                  class="chip"
                  style="cursor: pointer; ${props.period === opt.value ? "background: var(--text-strong); color: var(--bg); border-color: var(--text-strong);" : ""}"
                  @click=${() => props.onPeriodChange(opt.value)}
                >
                  ${opt.label}
                </button>
              `,
            )}
          </div>
          <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      ${props.error ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>` : nothing}

      ${
        props.loading && !hasData
          ? renderSpinner("Loading usage data...")
          : !hasData
            ? renderEmptyState({
                icon: icons.barChart,
                title: "No usage data",
                subtitle: "Usage data will appear as providers are used.",
              })
            : html`${renderCostSummary(cost)} ${renderRateLimitStatus(status)}`
      }
    </section>
  `;
}

function renderCostSummary(cost: UsageCostResponse | null) {
  const totals = cost?.totals;
  if (!totals) {
    return nothing;
  }

  return html`
    <div class="usage-summary" style="margin-top: 16px;">
      <div class="card stat-card">
        <div class="stat-label">Tokens In</div>
        <div class="stat-value">${formatTokenCount(totals.input)}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Tokens Out</div>
        <div class="stat-value">${formatTokenCount(totals.output)}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Estimated Cost</div>
        <div class="stat-value">${formatCost(totals.totalCost)}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Total Tokens</div>
        <div class="stat-value">${formatTokenCount(totals.totalTokens)}</div>
      </div>
    </div>
  `;
}

function renderRateLimitStatus(status: UsageStatusResponse | null) {
  const providers = status?.providers;
  if (!providers || providers.length === 0) {
    return nothing;
  }

  return html`
    <div style="margin-top: 16px;">
      <div style="font-weight: 600; font-size: 13px; margin-bottom: 8px;">
        Rate-Limit Usage
      </div>
      ${providers.map(
        (p) => html`
          <div
            style="border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; margin-bottom: 8px;"
          >
            <div style="font-weight: 600; margin-bottom: 8px;">${p.displayName}</div>
            ${
              p.windows && p.windows.length > 0
                ? html`
                  <div style="display: flex; flex-direction: column; gap: 6px;">
                    ${p.windows.map((w) => {
                      const pct = w.usedPercent ?? 0;
                      return html`
                        <div>
                          <div
                            style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 2px;"
                          >
                            <span>${w.label}</span>
                            <span class="muted">
                              ${pct.toFixed(1)}%
                              ${w.resetAt ? html` · <span style="opacity: 0.7;">${formatResetTime(w.resetAt)}</span>` : nothing}
                            </span>
                          </div>
                          <div class="usage-bar">
                            <div
                              class="usage-bar__fill"
                              style="width: ${pct.toFixed(1)}%; background: ${usedPercentColor(pct)};"
                            ></div>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                `
                : html`
                    <div class="muted" style="font-size: 12px">No usage windows.</div>
                  `
            }
          </div>
        `,
      )}
    </div>
  `;
}

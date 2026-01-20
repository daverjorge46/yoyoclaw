import { html, type TemplateResult } from "lit";

const COPIED_FOR_MS = 1500;

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function renderCopyAsMarkdownButton(markdown: string): TemplateResult {
  return html`
    <button
      class="chat-copy-btn"
      type="button"
      title="Copy as markdown"
      aria-label="Copy as markdown"
      @click=${async (e: Event) => {
        const btn = e.currentTarget as HTMLButtonElement | null;
        const icon = btn?.querySelector(
          ".chat-copy-btn__icon",
        ) as HTMLElement | null;

        if (btn) btn.dataset.copied = "1";
        if (icon) icon.textContent = "Copied";

        window.setTimeout(() => {
          if (!btn?.isConnected) return;
          delete btn.dataset.copied;
          if (icon) icon.textContent = "📋";
        }, COPIED_FOR_MS);

        await copyTextToClipboard(markdown);
      }}
    >
      <span class="chat-copy-btn__icon" aria-hidden="true">📋</span>
    </button>
  `;
}

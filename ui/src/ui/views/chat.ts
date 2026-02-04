import { html, nothing } from "lit";
import { ref } from "lit/directives/ref.js";
import { repeat } from "lit/directives/repeat.js";
import type { SessionsListResult } from "../types";
import type { ChatItem, MessageGroup } from "../types/chat-types";
import type { ChatAttachment, ChatQueueItem } from "../ui-types";
import {
  renderMessageGroup,
  renderReadingIndicatorGroup,
  renderStreamingGroup,
} from "../chat/grouped-render";
import { normalizeMessage, normalizeRoleForGrouping } from "../chat/message-normalizer";
import { icons } from "../icons";
import { renderMarkdownSidebar } from "./markdown-sidebar";
import { t } from "../i18n";
import type { ConfiguredModelOption } from "./agents";
import "../components/resizable-divider";

export type CompactionIndicatorStatus = {
  active: boolean;
  startedAt: number | null;
  completedAt: number | null;
};

export type ChatProps = {
  sessionKey: string;
  onSessionKeyChange: (next: string) => void;
  thinkingLevel: string | null;
  showThinking: boolean;
  loading: boolean;
  sending: boolean;
  canAbort?: boolean;
  availableModels: ConfiguredModelOption[];
  selectedModel: string | null;
  onModelChange: (model: string) => void;
  reasoningLevel: "off" | "on" | "stream";
  onReasoningLevelChange: (level: "off" | "on" | "stream") => void;
  compactionStatus?: CompactionIndicatorStatus | null;
  messages: unknown[];
  toolMessages: unknown[];
  stream: string | null;
  streamStartedAt: number | null;
  assistantAvatarUrl?: string | null;
  draft: string;
  queue: ChatQueueItem[];
  connected: boolean;
  canSend: boolean;
  disabledReason: string | null;
  error: string | null;
  sessions: SessionsListResult | null;
  // Focus mode
  focusMode: boolean;
  // Sidebar state
  sidebarOpen?: boolean;
  sidebarContent?: string | null;
  sidebarError?: string | null;
  splitRatio?: number;
  assistantName: string;
  assistantAvatar: string | null;
  // Image attachments
  attachments?: ChatAttachment[];
  onAttachmentsChange?: (attachments: ChatAttachment[]) => void;
  // Scroll control
  showNewMessages?: boolean;
  onScrollToBottom?: () => void;
  // Event handlers
  onRefresh: () => void;
  onToggleFocusMode: () => void;
  onDraftChange: (next: string) => void;
  onSend: () => void;
  onAbort?: () => void;
  onQueueRemove: (id: string) => void;
  onNewSession: () => void;
  onOpenSidebar?: (content: string) => void;
  onCloseSidebar?: () => void;
  onSplitRatioChange?: (ratio: number) => void;
  onChatScroll?: (event: Event) => void;
};

const COMPACTION_TOAST_DURATION_MS = 5000;

function adjustTextareaHeight(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function renderCompactionIndicator(status: CompactionIndicatorStatus | null | undefined) {
  if (!status) {
    return nothing;
  }

  // Show "compacting..." while active
  if (status.active) {
    return html`
      <div class="callout info compaction-indicator compaction-indicator--active">
        ${icons.loader} ${t().ui.views.chat.compacting}
      </div>
    `;
  }

  // Show "compaction complete" briefly after completion
  if (status.completedAt) {
    const elapsed = Date.now() - status.completedAt;
    if (elapsed < COMPACTION_TOAST_DURATION_MS) {
      return html`
        <div class="callout success compaction-indicator compaction-indicator--complete">
          ${icons.check} ${t().ui.views.chat.compacted}
        </div>
      `;
    }
  }

  return nothing;
}

function generateAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function handlePaste(e: ClipboardEvent, props: ChatProps) {
  const items = e.clipboardData?.items;
  if (!items || !props.onAttachmentsChange) {
    return;
  }

  const imageItems: DataTransferItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith("image/")) {
      imageItems.push(item);
    }
  }

  if (imageItems.length === 0) {
    return;
  }

  e.preventDefault();

  for (const item of imageItems) {
    const file = item.getAsFile();
    if (!file) {
      continue;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const dataUrl = reader.result as string;
      const newAttachment: ChatAttachment = {
        id: generateAttachmentId(),
        dataUrl,
        mimeType: file.type,
      };
      const current = props.attachments ?? [];
      props.onAttachmentsChange?.([...current, newAttachment]);
    });
    reader.readAsDataURL(file);
  }
}

function renderAttachmentPreview(props: ChatProps) {
  const attachments = props.attachments ?? [];
  if (attachments.length === 0) {
    return nothing;
  }

  return html`
    <div class="chat-attachments">
      ${attachments.map(
    (att) => html`
          <div class="chat-attachment">
            <img
              src=${att.dataUrl}
              alt="${t().ui.views.chat.attachmentAlt}"
              class="chat-attachment__img"
            />
            <button
              class="chat-attachment__remove"
              type="button"
              aria-label="${t().ui.views.chat.removeAttachment}"
              @click=${() => {
        const next = (props.attachments ?? []).filter((a) => a.id !== att.id);
        props.onAttachmentsChange?.(next);
      }}
            >
              ${icons.x}
            </button>
          </div>
        `,
  )}
    </div>
  `;
}

export function renderChat(props: ChatProps) {
  const canCompose = props.connected;
  const isBusy = props.sending || props.stream !== null;
  const canAbort = Boolean(props.canAbort && props.onAbort);
  const activeSession = props.sessions?.sessions?.find((row) => row.key === props.sessionKey);
  const reasoningLevel = activeSession?.reasoningLevel ?? "off";
  const showReasoning = props.showThinking && reasoningLevel !== "off";
  const assistantIdentity = {
    name: props.assistantName,
    avatar: props.assistantAvatar ?? props.assistantAvatarUrl ?? null,
  };

  const hasAttachments = (props.attachments?.length ?? 0) > 0;
  const composePlaceholder = props.connected
    ? hasAttachments
      ? t().ui.views.chat.placeholderWithAttachments
      : t().ui.views.chat.placeholderConnected
    : t().ui.views.chat.placeholderDisconnected;

  const splitRatio = props.splitRatio ?? 0.6;
  const sidebarOpen = Boolean(props.sidebarOpen && props.onCloseSidebar);
  const thread = html`
    <div
      class="chat-thread"
      role="log"
      aria-live="polite"
      @scroll=${props.onChatScroll}
    >
      ${props.loading
      ? html`
              <div class="muted">${t().ui.views.chat.loading}</div>
            `
      : nothing
    }
      ${repeat(
      buildChatItems(props),
      (item) => item.key,
      (item) => {
        if (item.kind === "reading-indicator") {
          return renderReadingIndicatorGroup(assistantIdentity);
        }

        if (item.kind === "stream") {
          return renderStreamingGroup(
            item.text,
            item.startedAt,
            props.onOpenSidebar,
            assistantIdentity,
          );
        }

        if (item.kind === "group") {
          return renderMessageGroup(item, {
            onOpenSidebar: props.onOpenSidebar,
            showReasoning,
            assistantName: props.assistantName,
            assistantAvatar: assistantIdentity.avatar,
          });
        }

        return nothing;
      },
    )}
    </div>
  `;

  return html`
    <section class="card chat">
      ${props.disabledReason ? html`<div class="callout">${props.disabledReason}</div>` : nothing}

      ${props.error ? html`<div class="callout danger">${props.error}</div>` : nothing}

      ${renderCompactionIndicator(props.compactionStatus)}

      ${props.focusMode
      ? html`
            <button
              class="chat-focus-exit"
              type="button"
              @click=${props.onToggleFocusMode}
              aria-label="${t().ui.views.chat.exitFocusMode}"
              title="${t().ui.views.chat.exitFocusMode}"
            >
              ${icons.x}
            </button>
          `
      : nothing
    }

      <div
        class="chat-split-container ${sidebarOpen ? "chat-split-container--open" : ""}"
      >
        <div
          class="chat-main"
          style="flex: ${sidebarOpen ? `0 0 ${splitRatio * 100}%` : "1 1 100%"}"
        >
          ${thread}
        </div>

        ${sidebarOpen
      ? html`
              <resizable-divider
                .splitRatio=${splitRatio}
                @resize=${(e: CustomEvent) => props.onSplitRatioChange?.(e.detail.splitRatio)}
              ></resizable-divider>
              <div class="chat-sidebar">
                ${renderMarkdownSidebar({
        content: props.sidebarContent ?? null,
        error: props.sidebarError ?? null,
        onClose: props.onCloseSidebar!,
        onViewRawText: () => {
          if (!props.sidebarContent || !props.onOpenSidebar) {
            return;
          }
          props.onOpenSidebar(`\`\`\`\n${props.sidebarContent}\n\`\`\``);
        },
      })}
              </div>
            `
      : nothing
    }
      </div>

      ${props.queue.length
      ? html`
            <div class="chat-queue" role="status" aria-live="polite">
              <div class="chat-queue__title">${t().ui.views.chat.queued(props.queue.length)}</div>
              <div class="chat-queue__list">
                ${props.queue.map(
        (item) => html`
                    <div class="chat-queue__item">
                      <div class="chat-queue__text">
                        ${item.text ||
          (item.attachments?.length ? `Image (${item.attachments.length})` : "")
          }
                      </div>
                      <button
                        class="btn chat-queue__remove"
                        type="button"
                        aria-label="${t().ui.views.chat.removeQueued}"
                        @click=${() => props.onQueueRemove(item.id)}
                      >
                        ${icons.x}
                      </button>
                    </div>
                  `,
      )}
              </div>
            </div>
          `
      : nothing
    }

      ${props.showNewMessages
      ? html`
            <button
              class="chat-new-messages"
              type="button"
              style="
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border-radius: 20px;
                background: var(--bg-surface-glass);
                backdrop-filter: blur(8px);
                border: 1px solid var(--border-subtle);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                color: var(--fg-default);
                font-size: 0.85rem;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-bottom: 8px;
              "
              @mouseover=${(e: MouseEvent) => (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"}
              @mouseout=${(e: MouseEvent) => (e.currentTarget as HTMLElement).style.transform = "translateY(0)"}
              @click=${props.onScrollToBottom}
            >
              ${t().ui.views.chat.newMessages}
              <span style="display: flex; width: 14px; height: 14px;">${icons.arrowDown}</span>
            </button>
          `
      : nothing
    }

      <div class="chat-compose">
        ${props.availableModels.length > 0 ? html`
          <div class="chat-model-selector" style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <select
              class="select select--sm"
              style="max-width: 200px; font-size: 0.85rem;" title="Select Model"
              .value=${props.selectedModel || ""}
              ?disabled=${!props.connected}
              @change=${(e: Event) => props.onModelChange((e.target as HTMLSelectElement).value)}
            >
              <option value="" ?selected=${!props.selectedModel}>Default Model</option>
              ${props.availableModels.map(
      (m) => html`<option value=${m.value} ?selected=${m.value === props.selectedModel}>${m.label}</option>`
    )}
            </select>
<select
              title="Reasoning Level"
              class="select select--sm"
              style="max-width: 120px; font-size: 0.85rem;"
              .value=${props.reasoningLevel}
              ?disabled=${!props.connected}
              @change=${(e: Event) => props.onReasoningLevelChange((e.target as HTMLSelectElement).value as any)}
            >
              <option value="off" ?selected=${props.reasoningLevel === "off"}>Reasoning: Off</option>
              <option value="on" ?selected=${props.reasoningLevel === "on"}>Reasoning: On</option>
              <option value="stream" ?selected=${props.reasoningLevel === "stream"}>Reasoning: Stream</option>
            </select>
          </div>
        ` : nothing}
        ${renderAttachmentPreview(props)}
        <div class="chat-compose__row">
          <label class="field chat-compose__field">
            <span>${t().ui.views.chat.messageLabel}</span>
            <textarea
              ${ref((el) => el && adjustTextareaHeight(el as HTMLTextAreaElement))}
              .value=${props.draft}
              ?disabled=${!props.connected}
              @keydown=${(e: KeyboardEvent) => {
      if (e.key !== "Enter") {
        return;
      }
      if (e.isComposing || e.keyCode === 229) {
        return;
      }
      if (e.shiftKey) {
        return;
      } // Allow Shift+Enter for line breaks
      if (!props.connected) {
        return;
      }
      e.preventDefault();
      if (canCompose) {
        props.onSend();
      }
    }}
              @input=${(e: Event) => {
      const target = e.target as HTMLTextAreaElement;
      adjustTextareaHeight(target);
      props.onDraftChange(target.value);
    }}
              @paste=${(e: ClipboardEvent) => handlePaste(e, props)}
              placeholder=${composePlaceholder}
            ></textarea>
          </label>
          <div class="chat-compose__actions">
            <button
              class="btn"
              ?disabled=${!props.connected || (!canAbort && props.sending)}
              @click=${canAbort ? props.onAbort : props.onNewSession}
            >
              ${canAbort ? t().ui.views.chat.stop : t().ui.views.chat.newSession}
            </button>
            <button
              class="btn primary"
              ?disabled=${!props.connected}
              @click=${props.onSend}
            >
              ${isBusy ? t().ui.views.chat.queue : t().ui.views.chat.send}<kbd class="btn-kbd">↵</kbd>
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

const CHAT_HISTORY_RENDER_LIMIT = 200;

function groupMessages(items: ChatItem[]): Array<ChatItem | MessageGroup> {
  const result: Array<ChatItem | MessageGroup> = [];
  let currentGroup: MessageGroup | null = null;

  for (const item of items) {
    if (item.kind !== "message") {
      if (currentGroup) {
        result.push(currentGroup);
        currentGroup = null;
      }
      result.push(item);
      continue;
    }

    const normalized = normalizeMessage(item.message);
    const role = normalizeRoleForGrouping(normalized.role);
    const timestamp = normalized.timestamp || Date.now();

    if (!currentGroup || currentGroup.role !== role) {
      if (currentGroup) {
        result.push(currentGroup);
      }
      currentGroup = {
        kind: "group",
        key: `group:${role}:${item.key}`,
        role,
        messages: [{ message: item.message, key: item.key }],
        timestamp,
        isStreaming: false,
      };
    } else {
      currentGroup.messages.push({ message: item.message, key: item.key });
    }
  }

  if (currentGroup) {
    result.push(currentGroup);
  }
  return result;
}

function buildChatItems(props: ChatProps): Array<ChatItem | MessageGroup> {
  const items: ChatItem[] = [];
  const history = Array.isArray(props.messages) ? props.messages : [];
  const tools = Array.isArray(props.toolMessages) ? props.toolMessages : [];
  const historyStart = Math.max(0, history.length - CHAT_HISTORY_RENDER_LIMIT);
  if (historyStart > 0) {
    items.push({
      kind: "message",
      key: "chat:history:notice",
      message: {
        role: "system",
        content: t().ui.views.chat.historyNotice(CHAT_HISTORY_RENDER_LIMIT, historyStart),
        timestamp: Date.now(),
      },
    });
  }
  for (let i = historyStart; i < history.length; i++) {
    const msg = history[i];
    const normalized = normalizeMessage(msg);

    if (!props.showThinking && normalized.role.toLowerCase() === "toolresult") {
      continue;
    }

    items.push({
      kind: "message",
      key: messageKey(msg, i),
      message: msg,
    });
  }
  if (props.showThinking) {
    for (let i = 0; i < tools.length; i++) {
      items.push({
        kind: "message",
        key: messageKey(tools[i], i + history.length),
        message: tools[i],
      });
    }
  }

  if (props.stream !== null) {
    const key = `stream:${props.sessionKey}:${props.streamStartedAt ?? "live"}`;
    if (props.stream.trim().length > 0) {
      items.push({
        kind: "stream",
        key,
        text: props.stream,
        startedAt: props.streamStartedAt ?? Date.now(),
      });
    } else {
      items.push({ kind: "reading-indicator", key });
    }
  }

  return groupMessages(items);
}

function messageKey(message: unknown, index: number): string {
  const m = message as Record<string, unknown>;
  const toolCallId = typeof m.toolCallId === "string" ? m.toolCallId : "";
  if (toolCallId) {
    return `tool:${toolCallId}`;
  }
  const id = typeof m.id === "string" ? m.id : "";
  if (id) {
    return `msg:${id}`;
  }
  const messageId = typeof m.messageId === "string" ? m.messageId : "";
  if (messageId) {
    return `msg:${messageId}`;
  }
  const timestamp = typeof m.timestamp === "number" ? m.timestamp : null;
  const role = typeof m.role === "string" ? m.role : "unknown";
  if (timestamp != null) {
    return `msg:${role}:${timestamp}:${index}`;
  }
  return `msg:${role}:${index}`;
}

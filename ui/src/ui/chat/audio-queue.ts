/**
 * Audio autoplay queue for TTS playback.
 * 
 * Uses standalone Audio objects (not DOM elements) to avoid Lit re-render issues.
 * Tracks message count to distinguish initial load from new messages.
 * New audio plays automatically and sequentially; old audio is manual only.
 */

const seenDataUris = new Set<string>();
const queue: string[] = [];
let playing = false;
let settled = false;

function processQueue() {
  if (playing || queue.length === 0) return;
  playing = true;
  const uri = queue.shift()!;
  const audio = new Audio(uri);

  const done = () => {
    audio.removeEventListener("ended", done);
    audio.removeEventListener("error", done);
    playing = false;
    processQueue();
  };
  audio.addEventListener("ended", done);
  audio.addEventListener("error", done);
  audio.play().catch(() => {
    playing = false;
    processQueue();
  });
}

/**
 * Called at render time for each audio block. Tracks the URI and queues
 * playback only for genuinely new audio (after initial load settles).
 */
export function trackAudio(dataUri: string): void {
  if (seenDataUris.has(dataUri)) return;
  seenDataUris.add(dataUri);
  if (!settled) return;
  queue.push(dataUri);
  queueMicrotask(() => processQueue());
}

/**
 * Called from handleUpdated when chatMessages change.
 * On the first call with messages, marks all current audio as "old".
 * On subsequent calls, any new audio from trackAudio will autoplay.
 */
export function onMessagesUpdated(messageCount: number): void {
  if (!settled && messageCount > 0) {
    settled = true;
  }
}

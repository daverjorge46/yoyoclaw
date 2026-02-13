/**
 * Extract inline audio data markers from message text.
 * Markers look like: <audio-data:data:audio/mpeg;base64,XXXXX>
 * Returns the cleaned text (markers removed) and an array of data URIs.
 */

export type AudioBlock = {
  dataUri: string;
  mimeType: string;
};

const AUDIO_DATA_RE = /<audio-data:(data:audio\/[^;]+;base64,[A-Za-z0-9+/=]+)>/g;

export function extractAudioBlocks(text: string): { text: string; audioBlocks: AudioBlock[] } {
  const audioBlocks: AudioBlock[] = [];

  if (!text || !text.includes("<audio-data:")) {
    return { text, audioBlocks };
  }

  const cleaned = text.replace(AUDIO_DATA_RE, (_match, dataUri: string) => {
    const mimeMatch = dataUri.match(/^data:(audio\/[^;]+);/);
    const mimeType = mimeMatch?.[1] ?? "audio/mpeg";
    audioBlocks.push({ dataUri, mimeType });
    return "";
  });

  // Clean up leftover blank lines from removed markers
  const trimmed = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  return { text: trimmed, audioBlocks };
}

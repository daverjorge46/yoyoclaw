import { Type } from "@sinclair/typebox";

import { optionalStringEnum, stringEnum } from "../schema/typebox.js";

const BROWSER_ACT_KINDS = [
  "click",
  "type",
  "press",
  "hover",
  "drag",
  "select",
  "fill",
  "resize",
  "wait",
  "evaluate",
  "close",
] as const;

const BROWSER_TOOL_ACTIONS = [
  "status",
  "start",
  "stop",
  "profiles",
  "tabs",
  "open",
  "focus",
  "close",
  "snapshot",
  "screenshot",
  "navigate",
  "console",
  "pdf",
  "upload",
  "dialog",
  "act",
] as const;

const BROWSER_TARGETS = ["sandbox", "host", "node"] as const;

const BROWSER_SNAPSHOT_FORMATS = ["aria", "ai"] as const;
const BROWSER_SNAPSHOT_MODES = ["efficient"] as const;
const BROWSER_SNAPSHOT_REFS = ["role", "aria"] as const;

const BROWSER_IMAGE_TYPES = ["png", "jpeg"] as const;

// NOTE: Using a flattened object schema instead of Type.Union([Type.Object(...), ...])
// because Claude API on Vertex AI rejects nested anyOf schemas as invalid JSON Schema.
// The discriminator (kind) determines which properties are relevant; runtime validates.
const BrowserActSchema = Type.Object({
  kind: stringEnum(BROWSER_ACT_KINDS, {
    description:
      "Action type: click, type, press, hover, drag, select, fill, resize, wait, evaluate, close.",
  }),
  // Common fields
  targetId: Type.Optional(Type.String({ description: "Tab ID to target (from tabs action)." })),
  ref: Type.Optional(
    Type.String({ description: "Element reference from snapshot (e.g., 'E1', 'button[0]')." }),
  ),
  // click
  doubleClick: Type.Optional(
    Type.Boolean({ description: "Perform a double-click instead of single-click." }),
  ),
  button: Type.Optional(
    Type.String({ description: "Mouse button: 'left', 'right', or 'middle'." }),
  ),
  modifiers: Type.Optional(
    Type.Array(Type.String(), {
      description: "Keyboard modifiers to hold: 'Alt', 'Control', 'Meta', 'Shift'.",
    }),
  ),
  // type
  text: Type.Optional(Type.String({ description: "Text to type into the focused element." })),
  submit: Type.Optional(Type.Boolean({ description: "Press Enter after typing to submit." })),
  slowly: Type.Optional(
    Type.Boolean({ description: "Type slowly with delays between keystrokes." }),
  ),
  // press
  key: Type.Optional(
    Type.String({ description: "Key to press (e.g., 'Enter', 'Escape', 'Tab')." }),
  ),
  // drag
  startRef: Type.Optional(Type.String({ description: "Starting element reference for drag." })),
  endRef: Type.Optional(Type.String({ description: "Ending element reference for drag." })),
  // select
  values: Type.Optional(
    Type.Array(Type.String(), { description: "Values to select in a dropdown/select element." }),
  ),
  // fill - use permissive array of objects
  fields: Type.Optional(
    Type.Array(Type.Object({}, { additionalProperties: true }), {
      description: "Array of field objects to fill in a form.",
    }),
  ),
  // resize
  width: Type.Optional(Type.Number({ description: "New viewport width in pixels." })),
  height: Type.Optional(Type.Number({ description: "New viewport height in pixels." })),
  // wait
  timeMs: Type.Optional(Type.Number({ description: "Time to wait in milliseconds." })),
  textGone: Type.Optional(
    Type.String({ description: "Wait until this text disappears from the page." }),
  ),
  // evaluate
  fn: Type.Optional(
    Type.String({ description: "JavaScript function body to evaluate in the page context." }),
  ),
});

// IMPORTANT: OpenAI function tool schemas must have a top-level `type: "object"`.
// A root-level `Type.Union([...])` compiles to `{ anyOf: [...] }` (no `type`),
// which OpenAI rejects ("Invalid schema ... type: None"). Keep this schema an object.
export const BrowserToolSchema = Type.Object({
  action: stringEnum(BROWSER_TOOL_ACTIONS, {
    description:
      "Browser action: status, start, stop, profiles, tabs, open, focus, close, snapshot, screenshot, navigate, console, pdf, upload, dialog, act.",
  }),
  target: optionalStringEnum(BROWSER_TARGETS, {
    description: "Browser target: 'sandbox' (isolated), 'host' (local), or 'node' (paired node).",
  }),
  node: Type.Optional(Type.String({ description: "Node ID or name when target='node'." })),
  profile: Type.Optional(
    Type.String({ description: "Browser profile name (for persistent state/cookies)." }),
  ),
  targetUrl: Type.Optional(
    Type.String({ description: "URL to navigate to when opening a new tab." }),
  ),
  targetId: Type.Optional(Type.String({ description: "Tab ID to target (from tabs action)." })),
  limit: Type.Optional(
    Type.Number({ description: "Limit for console logs or other list results." }),
  ),
  maxChars: Type.Optional(
    Type.Number({ description: "Maximum characters to return in snapshot text." }),
  ),
  mode: optionalStringEnum(BROWSER_SNAPSHOT_MODES, {
    description: "Snapshot mode: 'efficient' for optimized output.",
  }),
  snapshotFormat: optionalStringEnum(BROWSER_SNAPSHOT_FORMATS, {
    description: "Snapshot format: 'aria' (accessibility tree) or 'ai' (AI-optimized).",
  }),
  refs: optionalStringEnum(BROWSER_SNAPSHOT_REFS, {
    description: "Reference style for elements: 'role' or 'aria'.",
  }),
  interactive: Type.Optional(
    Type.Boolean({ description: "Include only interactive elements in snapshot." }),
  ),
  compact: Type.Optional(Type.Boolean({ description: "Use compact snapshot format." })),
  depth: Type.Optional(Type.Number({ description: "Maximum DOM depth to traverse." })),
  selector: Type.Optional(Type.String({ description: "CSS selector to scope the snapshot to." })),
  frame: Type.Optional(Type.String({ description: "Frame name or index to target." })),
  labels: Type.Optional(Type.Boolean({ description: "Include element labels in snapshot." })),
  fullPage: Type.Optional(
    Type.Boolean({ description: "Capture full page screenshot (not just viewport)." }),
  ),
  ref: Type.Optional(Type.String({ description: "Element reference for act or screenshot." })),
  element: Type.Optional(Type.String({ description: "Element selector for screenshot." })),
  type: optionalStringEnum(BROWSER_IMAGE_TYPES, {
    description: "Screenshot image format: 'png' or 'jpeg'.",
  }),
  level: Type.Optional(
    Type.String({ description: "Console log level filter (e.g., 'error', 'warn')." }),
  ),
  paths: Type.Optional(Type.Array(Type.String(), { description: "File paths for upload action." })),
  inputRef: Type.Optional(Type.String({ description: "File input element reference for upload." })),
  timeoutMs: Type.Optional(Type.Number({ description: "Timeout in milliseconds for the action." })),
  accept: Type.Optional(
    Type.Boolean({ description: "Accept or dismiss the dialog (for dialog action)." }),
  ),
  promptText: Type.Optional(Type.String({ description: "Text to enter in a prompt dialog." })),
  request: Type.Optional(BrowserActSchema),
});

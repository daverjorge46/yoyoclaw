/**
 * penpot_design_ui - Design a complete UI layout in one batch call.
 *
 * This is the primary tool for Frank. It accepts a component tree
 * (frames, shapes, text with children) and translates it into
 * PenPot changes in a single update-file call.
 */

import type { AnyAgentTool } from "openclaw/plugin-sdk";
import { Type } from "@sinclair/typebox";
import { jsonResult } from "openclaw/plugin-sdk";
import type { PenpotClient } from "../client.js";
import { ChangesBuilder, type ShapeInput } from "../changes.js";
import { generateUuid } from "../uuid.js";

// TypeBox schema for the recursive component tree
const FillSchema = Type.Object({
  "fill-color": Type.Optional(Type.String()),
  "fill-opacity": Type.Optional(Type.Number()),
});

const StrokeSchema = Type.Object({
  "stroke-color": Type.Optional(Type.String()),
  "stroke-opacity": Type.Optional(Type.Number()),
  "stroke-width": Type.Optional(Type.Number()),
  "stroke-alignment": Type.Optional(Type.String()),
  "stroke-style": Type.Optional(Type.String()),
});

const TextSpanSchema = Type.Object({
  text: Type.String(),
  fontFamily: Type.Optional(Type.String()),
  fontSize: Type.Optional(Type.String()),
  fontWeight: Type.Optional(Type.String()),
  fontStyle: Type.Optional(Type.String()),
  fillColor: Type.Optional(Type.String()),
  fillOpacity: Type.Optional(Type.Number()),
  letterSpacing: Type.Optional(Type.String()),
  lineHeight: Type.Optional(Type.String()),
  textDecoration: Type.Optional(Type.String()),
  textTransform: Type.Optional(Type.String()),
});

const TextParagraphSchema = Type.Object({
  spans: Type.Array(TextSpanSchema),
  textAlign: Type.Optional(Type.String()),
});

const LayoutSchema = Type.Object({
  layout: Type.Optional(Type.String({ description: "flex or grid" })),
  "layout-flex-dir": Type.Optional(
    Type.String({ description: "row, column, row-reverse, column-reverse" }),
  ),
  "layout-gap": Type.Optional(
    Type.Object({ "row-gap": Type.Number(), "column-gap": Type.Number() }),
  ),
  "layout-padding": Type.Optional(
    Type.Object({ p1: Type.Number(), p2: Type.Number(), p3: Type.Number(), p4: Type.Number() }),
  ),
  "layout-justify-content": Type.Optional(Type.String()),
  "layout-align-items": Type.Optional(Type.String()),
  "layout-align-content": Type.Optional(Type.String()),
  "layout-wrap-type": Type.Optional(Type.String()),
});

// Use Type.Unsafe for the recursive shape tree since TypeBox doesn't support recursive refs easily
const ShapeTreeSchema = Type.Unsafe<ShapeInput>(
  Type.Object({
    type: Type.String({ description: "rect, circle, text, frame, or group" }),
    name: Type.String({ description: "Shape name" }),
    x: Type.Number({ description: "X position" }),
    y: Type.Number({ description: "Y position" }),
    width: Type.Number({ description: "Width" }),
    height: Type.Number({ description: "Height" }),
    rotation: Type.Optional(Type.Number()),
    opacity: Type.Optional(Type.Number()),
    hidden: Type.Optional(Type.Boolean()),
    fills: Type.Optional(Type.Array(FillSchema)),
    strokes: Type.Optional(Type.Array(StrokeSchema)),
    // Rect-specific
    r1: Type.Optional(Type.Number({ description: "Top-left border radius" })),
    r2: Type.Optional(Type.Number({ description: "Top-right border radius" })),
    r3: Type.Optional(Type.Number({ description: "Bottom-right border radius" })),
    r4: Type.Optional(Type.Number({ description: "Bottom-left border radius" })),
    // Text-specific
    paragraphs: Type.Optional(Type.Array(TextParagraphSchema)),
    growType: Type.Optional(Type.String()),
    // Frame-specific
    fillColor: Type.Optional(Type.String()),
    fillOpacity: Type.Optional(Type.Number()),
    layout: Type.Optional(LayoutSchema),
    // Children (for frames and groups)
    children: Type.Optional(Type.Array(Type.Any())),
  }),
);

export function createDesignUiTool(client: PenpotClient): AnyAgentTool {
  return {
    name: "penpot_design_ui",
    label: "PenPot: Design UI",
    description: `Design a complete UI layout in PenPot by describing a component tree. This is the primary design tool.

Each shape in the tree has: type (rect/circle/text/frame/group), name, x, y, width, height.

Frames can have children (nested shapes) and layout properties (flex/grid).
Text shapes need paragraphs with spans containing the text content.
Rects can have border radius (r1-r4) and fills.

Example component tree for a button:
{
  "type": "frame", "name": "Button", "x": 0, "y": 0, "width": 200, "height": 48,
  "fillColor": "#3B82F6", "r1": 8, "r2": 8, "r3": 8, "r4": 8,
  "layout": { "layout": "flex", "layout-flex-dir": "row", "layout-justify-content": "center", "layout-align-items": "center" },
  "children": [
    { "type": "text", "name": "Label", "x": 0, "y": 0, "width": 100, "height": 24,
      "paragraphs": [{ "spans": [{ "text": "Click Me", "fontSize": "16", "fontWeight": "600", "fillColor": "#FFFFFF" }], "textAlign": "center" }]
    }
  ]
}`,
    parameters: Type.Object({
      fileId: Type.String({ description: "The file ID to design in" }),
      pageId: Type.String({ description: "The page ID to add shapes to" }),
      revn: Type.Number({ description: "Current file revision number" }),
      shapes: Type.Array(ShapeTreeSchema, {
        description: "Array of shape trees to add to the page",
      }),
    }),
    async execute(_toolCallId, params) {
      const { fileId, pageId, revn, shapes } = params as {
        fileId: string;
        pageId: string;
        revn: number;
        shapes: ShapeInput[];
      };

      const sessionId = generateUuid();
      const builder = new ChangesBuilder(pageId);
      const shapeIds: string[] = [];

      for (const shape of shapes) {
        const id = builder.addShape(shape);
        shapeIds.push(id);
      }

      const changes = builder.getChanges();

      await client.updateFile({
        id: fileId,
        revn,
        "session-id": sessionId,
        changes: changes as unknown as Record<string, unknown>[],
      });

      return jsonResult({
        success: true,
        shapesCreated: changes.filter((c) => c.type === "add-obj").length,
        rootShapeIds: shapeIds,
        newRevn: revn + 1,
      });
    },
  };
}

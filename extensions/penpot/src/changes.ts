/**
 * ChangesBuilder - High-level DSL for constructing PenPot file changes.
 *
 * Translates simple shape descriptions into the low-level change format
 * expected by PenPot's update-file RPC command.
 *
 * Handles:
 * - Computing selrect and points from x,y,width,height
 * - Building text content trees (root > paragraph-set > paragraph > spans)
 * - Identity transforms
 * - Parent-child relationships
 */

import type {
  AddColorChange,
  AddObjChange,
  AddPageChange,
  AddTypographyChange,
  DelObjChange,
  DelPageChange,
  Fill,
  LayoutProps,
  ModObjChange,
  MovObjectsChange,
  PenpotChange,
  Selrect,
  SetOperation,
  ShapePoints,
  ShapeType,
  Stroke,
  TextContent,
} from "./types.js";
import { ROOT_FRAME_ID, generateUuid } from "./uuid.js";

// ============================================================================
// Geometry helpers
// ============================================================================

export function computeSelrect(x: number, y: number, w: number, h: number): Selrect {
  return { x, y, width: w, height: h, x1: x, y1: y, x2: x + w, y2: y + h };
}

export function computePoints(x: number, y: number, w: number, h: number): ShapePoints {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

const IDENTITY_TRANSFORM = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

// ============================================================================
// Text content builder
// ============================================================================

export type TextSpanInput = {
  text: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  fillColor?: string;
  fillOpacity?: number;
  letterSpacing?: string;
  lineHeight?: string;
  textDecoration?: string;
  textTransform?: string;
};

export type TextParagraphInput = {
  spans: TextSpanInput[];
  textAlign?: string;
};

export function buildTextContent(paragraphs: TextParagraphInput[]): TextContent {
  return {
    type: "root",
    children: [
      {
        type: "paragraph-set",
        children: paragraphs.map((p) => ({
          type: "paragraph" as const,
          ...(p.textAlign ? { "text-align": p.textAlign } : {}),
          children: p.spans.map((s) => ({
            type: "text" as const,
            text: s.text,
            ...(s.fontFamily ? { "font-family": s.fontFamily } : {}),
            ...(s.fontSize ? { "font-size": s.fontSize } : {}),
            ...(s.fontWeight ? { "font-weight": s.fontWeight } : {}),
            ...(s.fontStyle ? { "font-style": s.fontStyle } : {}),
            ...(s.fillColor ? { "fill-color": s.fillColor } : {}),
            ...(s.fillOpacity !== undefined ? { "fill-opacity": s.fillOpacity } : {}),
            ...(s.letterSpacing ? { "letter-spacing": s.letterSpacing } : {}),
            ...(s.lineHeight ? { "line-height": s.lineHeight } : {}),
            ...(s.textDecoration ? { "text-decoration": s.textDecoration } : {}),
            ...(s.textTransform ? { "text-transform": s.textTransform } : {}),
          })),
        })),
      },
    ],
  };
}

// ============================================================================
// Shape input types (what the user/Frank provides)
// ============================================================================

export type BaseShapeInput = {
  id?: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  hidden?: boolean;
  fills?: Fill[];
  strokes?: Stroke[];
};

export type RectInput = BaseShapeInput & {
  type: "rect";
  r1?: number;
  r2?: number;
  r3?: number;
  r4?: number;
};

export type CircleInput = BaseShapeInput & {
  type: "circle";
};

export type TextInput = BaseShapeInput & {
  type: "text";
  paragraphs?: TextParagraphInput[];
  growType?: "auto-width" | "auto-height" | "fixed";
};

export type FrameInput = BaseShapeInput & {
  type: "frame";
  fillColor?: string;
  fillOpacity?: number;
  layout?: LayoutProps;
  children?: ShapeInput[];
};

export type GroupInput = BaseShapeInput & {
  type: "group";
  children?: ShapeInput[];
};

export type ShapeInput = RectInput | CircleInput | TextInput | FrameInput | GroupInput;

// ============================================================================
// ChangesBuilder
// ============================================================================

export class ChangesBuilder {
  private changes: PenpotChange[] = [];
  private pageId: string;

  constructor(pageId: string) {
    this.pageId = pageId;
  }

  getChanges(): PenpotChange[] {
    return this.changes;
  }

  setPageId(pageId: string) {
    this.pageId = pageId;
  }

  // --------------------------------------------------------------------------
  // Pages
  // --------------------------------------------------------------------------

  addPage(id?: string, name?: string): string {
    const pageId = id ?? generateUuid();
    const change: AddPageChange = {
      type: "add-page",
      id: pageId,
      name: name ?? "Page",
    };
    this.changes.push(change);
    return pageId;
  }

  delPage(id: string): void {
    const change: DelPageChange = { type: "del-page", id };
    this.changes.push(change);
  }

  // --------------------------------------------------------------------------
  // Shapes
  // --------------------------------------------------------------------------

  private buildShapeObj(
    input: BaseShapeInput,
    type: ShapeType,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const { x, y, width, height } = input;
    const obj: Record<string, unknown> = {
      id: input.id ?? generateUuid(),
      name: input.name,
      type,
      x,
      y,
      width,
      height,
      rotation: input.rotation ?? 0,
      selrect: computeSelrect(x, y, width, height),
      points: computePoints(x, y, width, height),
      transform: IDENTITY_TRANSFORM,
      "transform-inverse": IDENTITY_TRANSFORM,
      "proportion-lock": false,
      ...(input.opacity !== undefined ? { opacity: input.opacity } : {}),
      ...(input.hidden !== undefined ? { hidden: input.hidden } : {}),
      ...(input.fills ? { fills: input.fills } : {}),
      ...(input.strokes ? { strokes: input.strokes } : {}),
      ...extra,
    };
    return obj;
  }

  addRect(
    input: RectInput,
    parentId: string = ROOT_FRAME_ID,
    frameId: string = ROOT_FRAME_ID,
  ): string {
    const extra: Record<string, unknown> = {};
    if (input.r1 !== undefined) extra.r1 = input.r1;
    if (input.r2 !== undefined) extra.r2 = input.r2;
    if (input.r3 !== undefined) extra.r3 = input.r3;
    if (input.r4 !== undefined) extra.r4 = input.r4;

    const obj = this.buildShapeObj(input, "rect", extra);
    obj["frame-id"] = frameId;
    obj["parent-id"] = parentId;
    const id = obj.id as string;

    const change: AddObjChange = {
      type: "add-obj",
      id,
      "page-id": this.pageId,
      "frame-id": frameId,
      "parent-id": parentId,
      obj,
    };
    this.changes.push(change);
    return id;
  }

  addCircle(
    input: CircleInput,
    parentId: string = ROOT_FRAME_ID,
    frameId: string = ROOT_FRAME_ID,
  ): string {
    const obj = this.buildShapeObj(input, "circle");
    obj["frame-id"] = frameId;
    obj["parent-id"] = parentId;
    const id = obj.id as string;

    const change: AddObjChange = {
      type: "add-obj",
      id,
      "page-id": this.pageId,
      "frame-id": frameId,
      "parent-id": parentId,
      obj,
    };
    this.changes.push(change);
    return id;
  }

  addText(
    input: TextInput,
    parentId: string = ROOT_FRAME_ID,
    frameId: string = ROOT_FRAME_ID,
  ): string {
    const extra: Record<string, unknown> = {};

    if (input.paragraphs) {
      extra.content = buildTextContent(input.paragraphs);
    }
    if (input.growType) {
      extra["grow-type"] = input.growType;
    }

    const obj = this.buildShapeObj(input, "text", extra);
    obj["frame-id"] = frameId;
    obj["parent-id"] = parentId;
    const id = obj.id as string;

    const change: AddObjChange = {
      type: "add-obj",
      id,
      "page-id": this.pageId,
      "frame-id": frameId,
      "parent-id": parentId,
      obj,
    };
    this.changes.push(change);
    return id;
  }

  addFrame(
    input: FrameInput,
    parentId: string = ROOT_FRAME_ID,
    frameId: string = ROOT_FRAME_ID,
  ): string {
    const extra: Record<string, unknown> = {
      shapes: [],
    };

    if (input.fillColor) {
      extra.fills = [{ "fill-color": input.fillColor, "fill-opacity": input.fillOpacity ?? 1 }];
    }

    // Layout properties
    if (input.layout) {
      const lp = input.layout;
      if (lp.layout) extra.layout = lp.layout;
      if (lp["layout-flex-dir"]) extra["layout-flex-dir"] = lp["layout-flex-dir"];
      if (lp["layout-gap"]) extra["layout-gap"] = lp["layout-gap"];
      if (lp["layout-padding"]) extra["layout-padding"] = lp["layout-padding"];
      if (lp["layout-justify-content"])
        extra["layout-justify-content"] = lp["layout-justify-content"];
      if (lp["layout-align-items"]) extra["layout-align-items"] = lp["layout-align-items"];
      if (lp["layout-align-content"]) extra["layout-align-content"] = lp["layout-align-content"];
      if (lp["layout-wrap-type"]) extra["layout-wrap-type"] = lp["layout-wrap-type"];
    }

    const obj = this.buildShapeObj(input, "frame", extra);
    obj["frame-id"] = frameId;
    obj["parent-id"] = parentId;
    const id = obj.id as string;

    const change: AddObjChange = {
      type: "add-obj",
      id,
      "page-id": this.pageId,
      "frame-id": frameId,
      "parent-id": parentId,
      obj,
    };
    this.changes.push(change);

    // Recursively add children
    if (input.children) {
      for (const child of input.children) {
        this.addShape(child, id, id);
      }
    }

    return id;
  }

  addGroup(
    input: GroupInput,
    parentId: string = ROOT_FRAME_ID,
    frameId: string = ROOT_FRAME_ID,
  ): string {
    const extra: Record<string, unknown> = { shapes: [] };
    const obj = this.buildShapeObj(input, "group", extra);
    obj["frame-id"] = frameId;
    obj["parent-id"] = parentId;
    const id = obj.id as string;

    const change: AddObjChange = {
      type: "add-obj",
      id,
      "page-id": this.pageId,
      "frame-id": frameId,
      "parent-id": parentId,
      obj,
    };
    this.changes.push(change);

    if (input.children) {
      for (const child of input.children) {
        this.addShape(child, id, frameId);
      }
    }

    return id;
  }

  /**
   * Add any shape type, dispatching to the appropriate method.
   */
  addShape(
    input: ShapeInput,
    parentId: string = ROOT_FRAME_ID,
    frameId: string = ROOT_FRAME_ID,
  ): string {
    switch (input.type) {
      case "rect":
        return this.addRect(input, parentId, frameId);
      case "circle":
        return this.addCircle(input, parentId, frameId);
      case "text":
        return this.addText(input, parentId, frameId);
      case "frame":
        return this.addFrame(input, parentId, frameId);
      case "group":
        return this.addGroup(input, parentId, frameId);
      default:
        throw new Error(`Unknown shape type: ${(input as ShapeInput).type}`);
    }
  }

  // --------------------------------------------------------------------------
  // Modifications
  // --------------------------------------------------------------------------

  modShape(shapeId: string, attrs: Record<string, unknown>): void {
    const operations: SetOperation[] = Object.entries(attrs).map(([attr, val]) => ({
      type: "set",
      attr,
      val,
    }));

    const change: ModObjChange = {
      type: "mod-obj",
      id: shapeId,
      "page-id": this.pageId,
      operations,
    };
    this.changes.push(change);
  }

  delShape(shapeId: string): void {
    const change: DelObjChange = {
      type: "del-obj",
      id: shapeId,
      "page-id": this.pageId,
    };
    this.changes.push(change);
  }

  moveShapes(shapeIds: string[], newParentId: string, index?: number): void {
    const change: MovObjectsChange = {
      type: "mov-objects",
      "page-id": this.pageId,
      "parent-id": newParentId,
      shapes: shapeIds,
      ...(index !== undefined ? { index } : {}),
    };
    this.changes.push(change);
  }

  // --------------------------------------------------------------------------
  // Library
  // --------------------------------------------------------------------------

  addColor(id: string, name: string, color: string, opacity: number = 1): void {
    const change: AddColorChange = {
      type: "add-color",
      color: { id, name, color, opacity },
    };
    this.changes.push(change);
  }

  addTypography(
    id: string,
    name: string,
    fontFamily: string,
    fontSize: string,
    fontWeight: string = "400",
    opts: {
      fontId?: string;
      fontVariantId?: string;
      fontStyle?: string;
      lineHeight?: string;
      letterSpacing?: string;
      textTransform?: string;
    } = {},
  ): void {
    const change: AddTypographyChange = {
      type: "add-typography",
      typography: {
        id,
        name,
        "font-id": opts.fontId ?? fontFamily.toLowerCase().replace(/\s+/g, "-"),
        "font-family": fontFamily,
        "font-variant-id": opts.fontVariantId ?? "regular",
        "font-size": fontSize,
        "font-weight": fontWeight,
        "font-style": opts.fontStyle ?? "normal",
        "line-height": opts.lineHeight ?? "1.2",
        "letter-spacing": opts.letterSpacing ?? "0",
        "text-transform": opts.textTransform ?? "none",
      },
    };
    this.changes.push(change);
  }
}

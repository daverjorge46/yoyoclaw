/**
 * TypeScript types for PenPot shapes, changes, and operations.
 * Mirrors the Clojure specs in penpot/common/src/app/common/types/shape.cljc
 * and penpot/common/src/app/common/files/changes.cljc
 */

// ============================================================================
// Geometry
// ============================================================================

export type Point = { x: number; y: number };

export type Selrect = {
  x: number;
  y: number;
  width: number;
  height: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

/** Four corners: top-left, top-right, bottom-right, bottom-left */
export type ShapePoints = [Point, Point, Point, Point];

// ============================================================================
// Fill & Stroke
// ============================================================================

export type Fill = {
  "fill-color"?: string;
  "fill-opacity"?: number;
};

export type Stroke = {
  "stroke-color"?: string;
  "stroke-opacity"?: number;
  "stroke-width"?: number;
  "stroke-alignment"?: "inner" | "center" | "outer";
  "stroke-style"?: "solid" | "dotted" | "dashed" | "mixed" | "none" | "svg";
};

// ============================================================================
// Text Content
// ============================================================================

export type TextSpan = {
  type: "text";
  text: string;
  "font-family"?: string;
  "font-size"?: string;
  "font-weight"?: string;
  "font-style"?: string;
  "fill-color"?: string;
  "fill-opacity"?: number;
  "letter-spacing"?: string;
  "line-height"?: string;
  "text-decoration"?: string;
  "text-transform"?: string;
};

export type TextParagraph = {
  type: "paragraph";
  children: TextSpan[];
  "text-align"?: string;
};

export type TextParagraphSet = {
  type: "paragraph-set";
  children: TextParagraph[];
};

export type TextContent = {
  type: "root";
  children: TextParagraphSet[];
};

// ============================================================================
// Layout (Flex/Grid)
// ============================================================================

export type LayoutType = "flex" | "grid";
export type FlexDirection = "row" | "row-reverse" | "column" | "column-reverse";
export type JustifyContent =
  | "start"
  | "center"
  | "end"
  | "space-between"
  | "space-around"
  | "space-evenly";
export type AlignItems = "start" | "center" | "end" | "stretch";
export type AlignContent =
  | "start"
  | "center"
  | "end"
  | "space-between"
  | "space-around"
  | "space-evenly"
  | "stretch";

export type LayoutProps = {
  layout?: LayoutType;
  "layout-flex-dir"?: FlexDirection;
  "layout-gap"?: { "row-gap": number; "column-gap": number };
  "layout-padding"?: { p1: number; p2: number; p3: number; p4: number };
  "layout-justify-content"?: JustifyContent;
  "layout-align-items"?: AlignItems;
  "layout-align-content"?: AlignContent;
  "layout-wrap-type"?: "wrap" | "nowrap";
};

// ============================================================================
// Shape Types
// ============================================================================

export type ShapeType = "rect" | "circle" | "text" | "frame" | "path" | "group" | "image" | "bool";

export type ShapeBase = {
  id: string;
  name: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  hidden?: boolean;
  blocked?: boolean;
  fills?: Fill[];
  strokes?: Stroke[];
  "blend-mode"?: string;
  selrect?: Selrect;
  points?: ShapePoints;
  transform?: { a: number; b: number; c: number; d: number; e: number; f: number };
  "transform-inverse"?: { a: number; b: number; c: number; d: number; e: number; f: number };
  /** Child shape IDs (for frames/groups) */
  shapes?: string[];
  /** Parent frame ID */
  "frame-id"?: string;
  /** Parent shape ID */
  "parent-id"?: string;
};

export type RectShape = ShapeBase & {
  type: "rect";
  r1?: number;
  r2?: number;
  r3?: number;
  r4?: number;
};

export type CircleShape = ShapeBase & {
  type: "circle";
};

export type TextShape = ShapeBase & {
  type: "text";
  content?: TextContent;
  "grow-type"?: "auto-width" | "auto-height" | "fixed";
};

export type FrameShape = ShapeBase & {
  type: "frame";
  "fill-color"?: string;
  "fill-opacity"?: number;
  "hide-fill-on-export"?: boolean;
  shapes: string[];
} & LayoutProps;

export type GroupShape = ShapeBase & {
  type: "group";
  shapes: string[];
};

export type PenpotShape = RectShape | CircleShape | TextShape | FrameShape | GroupShape;

// ============================================================================
// Changes
// ============================================================================

export type SetOperation = {
  type: "set";
  attr: string;
  val: unknown;
};

export type AddObjChange = {
  type: "add-obj";
  id: string;
  "page-id": string;
  "frame-id": string;
  "parent-id": string;
  obj: Record<string, unknown>;
  "ignore-touched"?: boolean;
};

export type ModObjChange = {
  type: "mod-obj";
  id: string;
  "page-id": string;
  operations: SetOperation[];
};

export type DelObjChange = {
  type: "del-obj";
  id: string;
  "page-id": string;
};

export type AddPageChange = {
  type: "add-page";
  id: string;
  name: string;
};

export type ModPageChange = {
  type: "mod-page";
  id: string;
  name: string;
};

export type DelPageChange = {
  type: "del-page";
  id: string;
};

export type MovObjectsChange = {
  type: "mov-objects";
  "page-id": string;
  "parent-id": string;
  shapes: string[];
  index?: number;
};

export type AddColorChange = {
  type: "add-color";
  color: {
    id: string;
    name: string;
    color: string;
    opacity: number;
  };
};

export type AddTypographyChange = {
  type: "add-typography";
  typography: {
    id: string;
    name: string;
    "font-id": string;
    "font-family": string;
    "font-variant-id": string;
    "font-size": string;
    "font-weight": string;
    "font-style": string;
    "line-height": string;
    "letter-spacing": string;
    "text-transform": string;
  };
};

export type AddComponentChange = {
  type: "add-component";
  id: string;
  name: string;
  path?: string;
  "main-instance-id": string;
  "main-instance-page": string;
};

export type PenpotChange =
  | AddObjChange
  | ModObjChange
  | DelObjChange
  | AddPageChange
  | ModPageChange
  | DelPageChange
  | MovObjectsChange
  | AddColorChange
  | AddTypographyChange
  | AddComponentChange;

// ============================================================================
// API Types
// ============================================================================

export type PenpotTeam = {
  id: string;
  name: string;
};

export type PenpotProject = {
  id: string;
  name: string;
  "team-id": string;
  "created-at"?: string;
  "modified-at"?: string;
};

export type PenpotFile = {
  id: string;
  name: string;
  "project-id": string;
  revn: number;
  vern?: number;
  data?: PenpotFileData;
};

export type PenpotFileData = {
  pages: string[];
  "pages-index": Record<string, PenpotPageData>;
};

export type PenpotPageData = {
  id: string;
  name: string;
  objects: Record<string, Record<string, unknown>>;
};

export type PenpotProfile = {
  id: string;
  email: string;
  fullname: string;
  "default-team-id": string;
  "default-project-id": string;
};

export type UpdateFileParams = {
  id: string;
  revn: number;
  vern?: number;
  "session-id": string;
  changes: PenpotChange[];
};

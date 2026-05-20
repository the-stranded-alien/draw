export type ToolType =
  | "select"
  | "hand"
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "cylinder"
  | "triangle"
  | "parallelogram"
  | "arrow"
  | "line"
  | "freedraw"
  | "text"
  | "eraser"
  | "image";

export type StrokeStyle = "solid" | "dashed" | "dotted";
export type FillStyle = "none" | "hachure" | "cross-hatch" | "solid";
export type FontFamily = "hand" | "normal" | "code";
export type TextAlign = "left" | "center" | "right";
export type ArrowHead = "none" | "arrow" | "dot" | "bar";
export type RoughnessLevel = 0 | 1 | 2;

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BaseElement {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roughness: RoughnessLevel;
  opacity: number;
  seed: number;
  version: number;
  isDeleted: boolean;
  groupIds: string[];
}

export interface RectangleElement extends BaseElement {
  type: "rectangle";
  roundness: number;
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
}

export interface DiamondElement extends BaseElement {
  type: "diamond";
}

export interface CylinderElement extends BaseElement {
  type: "cylinder";
}

export interface TriangleElement extends BaseElement {
  type: "triangle";
}

export interface ParallelogramElement extends BaseElement {
  type: "parallelogram";
}

export interface LinearElement extends BaseElement {
  type: "arrow" | "line";
  points: Point[];
  startArrowHead: ArrowHead;
  endArrowHead: ArrowHead;
  lastCommittedPoint: Point | null;
}

export interface FreedrawElement extends BaseElement {
  type: "freedraw";
  points: Point[];
  pressures: number[];
  simulatePressure: boolean;
  lastCommittedPoint: Point | null;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: FontFamily;
  textAlign: TextAlign;
  verticalAlign: "top" | "middle" | "bottom";
  lineHeight: number;
  containerId: string | null;
}

export interface ImageElement extends BaseElement {
  type: "image";
  fileId: string | null;
  scale: [number, number];
  src?: string;
}

export type ExcalidrawElement =
  | RectangleElement
  | EllipseElement
  | DiamondElement
  | CylinderElement
  | TriangleElement
  | ParallelogramElement
  | LinearElement
  | FreedrawElement
  | TextElement
  | ImageElement;

export interface AppState {
  zoom: { value: number };
  scrollX: number;
  scrollY: number;
  theme: "light" | "dark";
  viewBackgroundColor: string;
  gridSize: number | null;
  showGrid: boolean;
  activeTool: ToolType;
  selectedElementIds: Record<string, boolean>;
  editingElement: ExcalidrawElement | null;
  draggingElement: ExcalidrawElement | null;
  resizingElement: ExcalidrawElement | null;
  multiElement: LinearElement | null;
  isResizing: boolean;
  isDragging: boolean;
  cursorButton: "up" | "down";
  gestureScale: number;
  previousSelectedElementIds: Record<string, boolean>;
  shouldCacheIgnoreZoom: boolean;
}

export interface CanvasState {
  elements: ExcalidrawElement[];
  appState: AppState;
}

export type ResizeHandle =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw"
  | "rotation";

export interface StyleProps {
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roughness: RoughnessLevel;
  opacity: number;
}

export const FONT_FAMILY: Record<FontFamily, string> = {
  hand: "Caveat, cursive",
  normal: "Inter, sans-serif",
  code: "JetBrains Mono, monospace",
};

export const STROKE_WIDTHS = [1, 2, 4] as const;
export const DEFAULT_STROKE_COLOR = "#1e1e1e";
export const DEFAULT_BACKGROUND_COLOR = "transparent";
export const DEFAULT_FILL_COLOR = "transparent";
export const CANVAS_BACKGROUND_LIGHT = "#ffffff";
export const CANVAS_BACKGROUND_DARK = "#121212";

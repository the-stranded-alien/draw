import { nanoid } from "nanoid";
import {
  ExcalidrawElement,
  RectangleElement,
  EllipseElement,
  DiamondElement,
  CylinderElement,
  TriangleElement,
  ParallelogramElement,
  LinearElement,
  FreedrawElement,
  TextElement,
  StyleProps,
  Point,
} from "./types";

function base(
  type: ExcalidrawElement["type"],
  x: number,
  y: number,
  style: Partial<StyleProps>
): Omit<RectangleElement, "type" | "roundness"> {
  return {
    id: nanoid(),
    x,
    y,
    width: 0,
    height: 0,
    angle: 0,
    strokeColor: style.strokeColor ?? "#1e1e1e",
    backgroundColor: style.backgroundColor ?? "transparent",
    fillStyle: style.fillStyle ?? "hachure",
    strokeWidth: style.strokeWidth ?? 2,
    strokeStyle: style.strokeStyle ?? "solid",
    roughness: style.roughness ?? 1,
    opacity: style.opacity ?? 100,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    isDeleted: false,
    groupIds: [],
  };
}

export function createElement(
  type: ExcalidrawElement["type"],
  x: number,
  y: number,
  style: Partial<StyleProps>
): ExcalidrawElement {
  const b = base(type, x, y, style);

  switch (type) {
    case "rectangle":
      return { ...b, type: "rectangle", roundness: 0 } as RectangleElement;

    case "ellipse":
      return { ...b, type: "ellipse" } as EllipseElement;

    case "diamond":
      return { ...b, type: "diamond" } as DiamondElement;

    case "cylinder":
      return { ...b, type: "cylinder" } as CylinderElement;

    case "triangle":
      return { ...b, type: "triangle" } as TriangleElement;

    case "parallelogram":
      return { ...b, type: "parallelogram" } as ParallelogramElement;

    case "arrow":
      return {
        ...b,
        type: "arrow",
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
        startArrowHead: "none",
        endArrowHead: "arrow",
        lastCommittedPoint: null,
      } as LinearElement;

    case "line":
      return {
        ...b,
        type: "line",
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
        startArrowHead: "none",
        endArrowHead: "none",
        lastCommittedPoint: null,
      } as LinearElement;

    case "freedraw":
      return {
        ...b,
        type: "freedraw",
        points: [{ x: 0, y: 0 }],
        pressures: [0.5],
        simulatePressure: true,
        lastCommittedPoint: null,
      } as FreedrawElement;

    case "text":
      return {
        ...b,
        type: "text",
        text: "",
        fontSize: 20,
        fontFamily: "hand",
        textAlign: "left",
        verticalAlign: "top",
        lineHeight: 1.25,
        containerId: null,
      } as TextElement;

    default:
      return { ...b, type: "rectangle", roundness: 0 } as RectangleElement;
  }
}

export function updateElementPoints(
  element: ExcalidrawElement,
  x2: number,
  y2: number
): Partial<ExcalidrawElement> {
  const width = x2 - element.x;
  const height = y2 - element.y;

  if (element.type === "arrow" || element.type === "line") {
    return {
      points: [
        { x: 0, y: 0 },
        { x: width, y: height },
      ],
      width: Math.abs(width),
      height: Math.abs(height),
    };
  }

  if (element.type === "freedraw") {
    return {};
  }

  return {
    width: Math.abs(width),
    height: Math.abs(height),
    x: width < 0 ? x2 : element.x,
    y: height < 0 ? y2 : element.y,
  };
}

export function addPointToFreedraw(
  element: FreedrawElement,
  point: Point,
  pressure = 0.5
): Partial<FreedrawElement> {
  const lastPoint = element.points[element.points.length - 1];
  const dx = point.x - element.x - lastPoint.x;
  const dy = point.y - element.y - lastPoint.y;
  const dist = Math.hypot(dx, dy);

  // Deduplicate very close points
  if (dist < 1) return {};

  const newPoint: Point = { x: lastPoint.x + dx, y: lastPoint.y + dy };
  const newPoints = [...element.points, newPoint];
  const newPressures = [...element.pressures, pressure];

  const xs = newPoints.map((p) => p.x);
  const ys = newPoints.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    points: newPoints,
    pressures: newPressures,
    width: maxX - minX,
    height: maxY - minY,
    lastCommittedPoint: newPoint,
  };
}

export function getBoundingBox(element: ExcalidrawElement) {
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

export function hitTest(
  element: ExcalidrawElement,
  x: number,
  y: number,
  padding = 8
): boolean {
  const { x: ex, y: ey, width: ew, height: eh } = element;

  if (element.type === "freedraw") {
    // For freedraw, check against bounding box + points proximity
    if (
      x < ex - padding ||
      x > ex + ew + padding ||
      y < ey - padding ||
      y > ey + eh + padding
    ) {
      return false;
    }
    const el = element as FreedrawElement;
    return el.points.some((p) => {
      const px = p.x + ex;
      const py = p.y + ey;
      return Math.hypot(x - px, y - py) < padding * 2;
    });
  }

  if (element.type === "ellipse") {
    const cx = ex + ew / 2;
    const cy = ey + eh / 2;
    const rx = ew / 2 + padding;
    const ry = eh / 2 + padding;
    return (
      Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2) <= 1
    );
  }

  return (
    x >= ex - padding &&
    x <= ex + ew + padding &&
    y >= ey - padding &&
    y <= ey + eh + padding
  );
}

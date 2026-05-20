import rough from "roughjs";
import { RoughCanvas } from "roughjs/bin/canvas";
import getStroke from "perfect-freehand";
import {
  ExcalidrawElement,
  RectangleElement,
  EllipseElement,
  DiamondElement,
  LinearElement,
  FreedrawElement,
  TextElement,
  FONT_FAMILY,
} from "./types";
import { AppState } from "./types";

function getStrokeDash(
  strokeStyle: string,
  strokeWidth: number
): number[] | undefined {
  if (strokeStyle === "dashed") return [strokeWidth * 8, strokeWidth * 4];
  if (strokeStyle === "dotted") return [strokeWidth, strokeWidth * 4];
  return undefined;
}

function getRoughOptions(element: ExcalidrawElement) {
  return {
    seed: element.seed,
    roughness: element.roughness,
    stroke: element.strokeColor,
    strokeWidth: element.strokeWidth,
    fill:
      element.backgroundColor === "transparent"
        ? undefined
        : element.backgroundColor,
    fillStyle: element.fillStyle === "none" ? undefined : element.fillStyle,
    strokeLineDash: getStrokeDash(element.strokeStyle, element.strokeWidth),
  };
}

function drawFreedraw(ctx: CanvasRenderingContext2D, el: FreedrawElement) {
  const stroke = getStroke(
    el.points.map((p, i) => [p.x + el.x, p.y + el.y, el.pressures[i] ?? 0.5]),
    {
      size: el.strokeWidth * 4,
      thinning: el.simulatePressure ? 0.5 : 0,
      smoothing: 0.5,
      streamline: 0.5,
    }
  );

  if (!stroke.length) return;

  ctx.save();
  ctx.globalAlpha = el.opacity / 100;
  ctx.fillStyle = el.strokeColor;
  ctx.beginPath();
  const [first, ...rest] = stroke;
  ctx.moveTo(first[0], first[1]);
  rest.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, el: TextElement, zoom: number) {
  ctx.save();
  ctx.globalAlpha = el.opacity / 100;
  ctx.fillStyle = el.strokeColor;
  ctx.font = `${el.fontSize * zoom}px ${FONT_FAMILY[el.fontFamily]}`;
  ctx.textAlign = el.textAlign;
  ctx.textBaseline = "top";

  const lines = el.text.split("\n");
  const lineH = el.fontSize * el.lineHeight * zoom;
  const startX =
    el.textAlign === "center"
      ? el.x * zoom + (el.width * zoom) / 2
      : el.textAlign === "right"
      ? el.x * zoom + el.width * zoom
      : el.x * zoom;

  lines.forEach((line, i) => {
    ctx.fillText(line, startX, el.y * zoom + i * lineH);
  });
  ctx.restore();
}

export function renderElement(
  element: ExcalidrawElement,
  rc: RoughCanvas,
  ctx: CanvasRenderingContext2D,
  zoom: number
) {
  if (element.isDeleted) return;

  ctx.save();
  ctx.globalAlpha = element.opacity / 100;

  const { x, y, width, height } = element;

  switch (element.type) {
    case "rectangle": {
      const el = element as RectangleElement;
      rc.rectangle(x, y, width, height, getRoughOptions(el));
      break;
    }
    case "ellipse": {
      const el = element as EllipseElement;
      rc.ellipse(x + width / 2, y + height / 2, width, height, getRoughOptions(el));
      break;
    }
    case "diamond": {
      const el = element as DiamondElement;
      const cx = x + width / 2;
      const cy = y + height / 2;
      rc.polygon(
        [
          [cx, y],
          [x + width, cy],
          [cx, y + height],
          [x, cy],
        ],
        getRoughOptions(el)
      );
      break;
    }
    case "arrow":
    case "line": {
      const el = element as LinearElement;
      if (el.points.length < 2) break;

      const pts = el.points.map((p) => [p.x + x, p.y + y] as [number, number]);

      if (el.type === "line") {
        rc.linearPath(pts, getRoughOptions(el));
      } else {
        rc.linearPath(pts, getRoughOptions(el));
        // Draw arrowhead
        if (el.endArrowHead === "arrow" && pts.length >= 2) {
          const last = pts[pts.length - 1];
          const prev = pts[pts.length - 2];
          const angle = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
          const headLen = 12 + el.strokeWidth * 2;
          ctx.save();
          ctx.strokeStyle = el.strokeColor;
          ctx.lineWidth = el.strokeWidth;
          ctx.beginPath();
          ctx.moveTo(last[0], last[1]);
          ctx.lineTo(
            last[0] - headLen * Math.cos(angle - Math.PI / 6),
            last[1] - headLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(last[0], last[1]);
          ctx.lineTo(
            last[0] - headLen * Math.cos(angle + Math.PI / 6),
            last[1] - headLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
          ctx.restore();
        }
      }
      break;
    }
    case "freedraw": {
      ctx.restore(); // restore before drawing freehand (manages its own state)
      drawFreedraw(ctx, element as FreedrawElement);
      return;
    }
    case "text": {
      ctx.restore();
      drawText(ctx, element as TextElement, 1);
      return;
    }
  }

  ctx.restore();
}

export function renderScene(
  canvas: HTMLCanvasElement,
  elements: ExcalidrawElement[],
  appState: AppState
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { scrollX, scrollY, zoom, viewBackgroundColor, showGrid, gridSize } =
    appState;
  const z = zoom.value;
  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Background
  ctx.fillStyle = viewBackgroundColor;
  ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  // Grid
  if (showGrid && gridSize) {
    renderGrid(ctx, canvas.width / dpr, canvas.height / dpr, scrollX, scrollY, z, gridSize);
  }

  // Transform: scroll + zoom
  ctx.translate(scrollX, scrollY);
  ctx.scale(z, z);

  const rc = rough.canvas(canvas);

  for (const el of elements) {
    if (!el.isDeleted) {
      renderElement(el, rc, ctx, z);
    }
  }

  ctx.restore();
}

function renderGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scrollX: number,
  scrollY: number,
  zoom: number,
  gridSize: number
) {
  const scaledGrid = gridSize * zoom;
  const offsetX = ((scrollX % scaledGrid) + scaledGrid) % scaledGrid;
  const offsetY = ((scrollY % scaledGrid) + scaledGrid) % scaledGrid;

  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 0.5;

  for (let x = offsetX - scaledGrid; x < width + scaledGrid; x += scaledGrid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = offsetY - scaledGrid; y < height + scaledGrid; y += scaledGrid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
}

export function renderSelectionBox(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  scrollX: number,
  scrollY: number,
  zoom: number,
  dpr: number
) {
  const z = zoom;
  const padding = 8;

  const sx = (element.x * z + scrollX) * dpr;
  const sy = (element.y * z + scrollY) * dpr;
  const sw = element.width * z * dpr;
  const sh = element.height * z * dpr;
  const pad = padding * dpr;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.strokeStyle = "#6965db";
  ctx.lineWidth = 1.5 * dpr;
  ctx.setLineDash([]);
  ctx.strokeRect(sx - pad, sy - pad, sw + pad * 2, sh + pad * 2);

  const handleSize = 8 * dpr;
  const handles = [
    [sx - pad, sy - pad],
    [sx + sw / 2, sy - pad],
    [sx + sw + pad, sy - pad],
    [sx + sw + pad, sy + sh / 2],
    [sx + sw + pad, sy + sh + pad],
    [sx + sw / 2, sy + sh + pad],
    [sx - pad, sy + sh + pad],
    [sx - pad, sy + sh / 2],
  ];

  ctx.fillStyle = "#ffffff";
  handles.forEach(([hx, hy]) => {
    ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
  });

  ctx.restore();
}

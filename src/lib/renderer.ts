import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";
import getStroke from "perfect-freehand";
import {
  ExcalidrawElement,
  RectangleElement,
  EllipseElement,
  DiamondElement,
  LinearElement,
  FreedrawElement,
  TextElement,
  AppState,
  FONT_FAMILY,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function strokeDash(style: string, w: number): number[] | undefined {
  if (style === "dashed") return [w * 8, w * 4];
  if (style === "dotted") return [w, w * 4];
  return undefined;
}

function roughOpts(el: ExcalidrawElement) {
  return {
    seed: el.seed,
    roughness: el.roughness,
    stroke: el.strokeColor,
    strokeWidth: el.strokeWidth,
    fill: el.backgroundColor === "transparent" ? undefined : el.backgroundColor,
    fillStyle: el.fillStyle === "none" ? undefined : el.fillStyle,
    strokeLineDash: strokeDash(el.strokeStyle, el.strokeWidth),
  };
}

// ─── Per-type draw functions ───────────────────────────────────────────────────

function drawFreedraw(ctx: CanvasRenderingContext2D, el: FreedrawElement) {
  if (el.points.length < 2) return;

  // points[] are relative to el.x / el.y — add origin to get world coords.
  // The canvas transform (world→screen) is already applied on ctx, so we draw
  // directly in world space.
  const stroke = getStroke(
    el.points.map((p, i) => [p.x + el.x, p.y + el.y, el.pressures[i] ?? 0.5]),
    { size: el.strokeWidth * 4, thinning: 0.5, smoothing: 0.5, streamline: 0.5 }
  );
  if (!stroke.length) return;

  ctx.save();
  ctx.globalAlpha = el.opacity / 100;
  ctx.fillStyle = el.strokeColor;
  ctx.beginPath();
  ctx.moveTo(stroke[0][0], stroke[0][1]);
  for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i][0], stroke[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, el: TextElement) {
  // ctx already has the world→screen transform applied.
  // Do NOT manually multiply by zoom — the transform handles it.
  ctx.save();
  ctx.globalAlpha = el.opacity / 100;
  ctx.fillStyle = el.strokeColor;
  ctx.font = `${el.fontSize}px ${FONT_FAMILY[el.fontFamily]}`;
  ctx.textBaseline = "top";
  ctx.textAlign = el.textAlign;

  const lines = el.text.split("\n");
  const lineH = el.fontSize * el.lineHeight;
  const baseX =
    el.textAlign === "center" ? el.x + el.width / 2
    : el.textAlign === "right" ? el.x + el.width
    : el.x;

  lines.forEach((line, i) => {
    ctx.fillText(line, baseX, el.y + i * lineH);
  });
  ctx.restore();
}

// ─── renderElement ─────────────────────────────────────────────────────────────

export function renderElement(
  element: ExcalidrawElement,
  rc: RoughCanvas,
  ctx: CanvasRenderingContext2D
) {
  if (element.isDeleted) return;
  const { x, y, width: w, height: h } = element;

  // freedraw and text manage their own ctx.save/restore internally
  if (element.type === "freedraw") { drawFreedraw(ctx, element as FreedrawElement); return; }
  if (element.type === "text")     { drawText(ctx, element as TextElement);         return; }

  ctx.save();
  ctx.globalAlpha = element.opacity / 100;

  switch (element.type) {
    case "rectangle":
      rc.rectangle(x, y, w, h, roughOpts(element as RectangleElement));
      break;

    case "ellipse":
      rc.ellipse(x + w / 2, y + h / 2, w, h, roughOpts(element as EllipseElement));
      break;

    case "diamond": {
      const cx = x + w / 2, cy = y + h / 2;
      rc.polygon([[cx, y], [x + w, cy], [cx, y + h], [x, cy]],
        roughOpts(element as DiamondElement));
      break;
    }

    case "arrow":
    case "line": {
      const el = element as LinearElement;
      if (el.points.length < 2) break;
      const pts = el.points.map((p) => [p.x + x, p.y + y] as [number, number]);
      rc.linearPath(pts, roughOpts(el));

      if (el.type === "arrow" && el.endArrowHead === "arrow") {
        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2];
        const angle = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
        const len = 12 + el.strokeWidth * 2;
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(last[0], last[1]);
        ctx.lineTo(last[0] - len * Math.cos(angle - Math.PI / 6), last[1] - len * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(last[0], last[1]);
        ctx.lineTo(last[0] - len * Math.cos(angle + Math.PI / 6), last[1] - len * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
      break;
    }
  }

  ctx.restore();
}

// ─── renderScene ───────────────────────────────────────────────────────────────

export function renderScene(
  canvas: HTMLCanvasElement,
  elements: ExcalidrawElement[],
  appState: AppState
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { scrollX, scrollY, zoom, viewBackgroundColor, showGrid, gridSize } = appState;
  const z = zoom.value;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width;   // physical pixels
  const H = canvas.height;

  // 1. Background — identity transform, full canvas wipe
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = viewBackgroundColor;
  ctx.fillRect(0, 0, W, H);

  // 2. Grid — still in canvas-pixel space (identity), computed from scroll/zoom
  if (showGrid && gridSize) {
    renderGrid(ctx, W, H, scrollX, scrollY, z, gridSize, dpr);
  }

  // 3. World→screen transform for elements.
  //
  //    Correct formula: canvas_px = dpr * (world * z + scroll)
  //    i.e. setTransform(dpr·z, 0, 0, dpr·z, dpr·scrollX, dpr·scrollY)
  //
  //    The old code did setTransform(dpr) then translate(scroll) then scale(z),
  //    which produced dpr·z·(world + scroll) — scroll was wrongly scaled by zoom.
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * scrollX, dpr * scrollY);

  const rc = rough.canvas(canvas);
  for (const el of elements) {
    if (!el.isDeleted) renderElement(el, rc, ctx);
  }

  // Reset so selection boxes (drawn in canvas-px space) are unaffected
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ─── renderGrid ────────────────────────────────────────────────────────────────

function renderGrid(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  scrollX: number, scrollY: number,
  zoom: number, gridSize: number, dpr: number
) {
  // Work in canvas-pixel space (identity transform already set by caller).
  const step = gridSize * zoom * dpr;
  const offX = ((scrollX * dpr) % step + step) % step;
  const offY = ((scrollY * dpr) % step + step) % step;

  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.07)";
  ctx.lineWidth = 1;

  for (let x = offX - step; x < W + step; x += step) {
    ctx.beginPath(); ctx.moveTo(Math.round(x), 0); ctx.lineTo(Math.round(x), H); ctx.stroke();
  }
  for (let y = offY - step; y < H + step; y += step) {
    ctx.beginPath(); ctx.moveTo(0, Math.round(y)); ctx.lineTo(W, Math.round(y)); ctx.stroke();
  }
  ctx.restore();
}

// ─── renderSelectionBox ────────────────────────────────────────────────────────

export function renderSelectionBox(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  scrollX: number, scrollY: number,
  zoom: number, dpr: number
) {
  const PAD = 8;
  // Convert world coordinates to canvas pixels: dpr * (world * zoom + scroll)
  const sx = dpr * (element.x * zoom + scrollX);
  const sy = dpr * (element.y * zoom + scrollY);
  const sw = dpr * element.width  * zoom;
  const sh = dpr * element.height * zoom;
  const pad = PAD * dpr;

  // Draw in canvas-pixel space (identity transform)
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.strokeStyle = "#6965db";
  ctx.lineWidth = 1.5 * dpr;
  ctx.setLineDash([]);
  ctx.strokeRect(sx - pad, sy - pad, sw + pad * 2, sh + pad * 2);

  const hs = 8 * dpr;
  const handles: [number, number][] = [
    [sx - pad,       sy - pad      ],
    [sx + sw / 2,    sy - pad      ],
    [sx + sw + pad,  sy - pad      ],
    [sx + sw + pad,  sy + sh / 2   ],
    [sx + sw + pad,  sy + sh + pad ],
    [sx + sw / 2,    sy + sh + pad ],
    [sx - pad,       sy + sh + pad ],
    [sx - pad,       sy + sh / 2   ],
  ];

  ctx.fillStyle = "#ffffff";
  handles.forEach(([hx, hy]) => {
    ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
    ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs);
  });
  ctx.restore();
}

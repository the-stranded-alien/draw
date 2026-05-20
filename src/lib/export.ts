import { ExcalidrawElement, AppState } from "./types";
import { renderScene } from "./renderer";

const EXPORT_PADDING = 32;

function getBoundingBox(elements: ExcalidrawElement[]) {
  const visible = elements.filter((el) => !el.isDeleted && el.width > 0 && el.height > 0);
  if (!visible.length) return { x: 0, y: 0, width: 800, height: 600 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  visible.forEach((el) => {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  });

  return {
    x: minX - EXPORT_PADDING,
    y: minY - EXPORT_PADDING,
    width:  maxX - minX + EXPORT_PADDING * 2,
    height: maxY - minY + EXPORT_PADDING * 2,
  };
}

function makeExportAppState(
  appState: AppState,
  bbox: ReturnType<typeof getBoundingBox>,
  scale: number
): AppState {
  return {
    ...appState,
    zoom:  { value: scale },
    scrollX: -bbox.x * scale,
    scrollY: -bbox.y * scale,
    viewBackgroundColor: "#ffffff",
    showGrid: false,
    selectedElementIds: {},
  };
}

export function exportToImage(
  elements: ExcalidrawElement[],
  appState: AppState,
  format: "png" | "jpeg",
  scale = 2
) {
  const bbox     = getBoundingBox(elements);
  const W        = Math.ceil(bbox.width  * scale);
  const H        = Math.ceil(bbox.height * scale);
  const offscreen = document.createElement("canvas");
  offscreen.width  = W;
  offscreen.height = H;

  const exportState = makeExportAppState(appState, bbox, scale);

  // Render with a DPR of 1 (dimensions already account for scale)
  const originalDPR = window.devicePixelRatio;
  Object.defineProperty(window, "devicePixelRatio", { value: 1, configurable: true });
  renderScene(offscreen, elements, exportState);
  Object.defineProperty(window, "devicePixelRatio", { value: originalDPR, configurable: true });

  const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
  const quality  = format === "jpeg" ? 0.92 : undefined;
  const url = offscreen.toDataURL(mimeType, quality);

  const a = document.createElement("a");
  a.href     = url;
  a.download = `drawing.${format}`;
  a.click();
}

export function exportToJSON(elements: ExcalidrawElement[]) {
  const payload = JSON.stringify(
    { type: "draw-diagram", version: 1, elements: elements.filter((el) => !el.isDeleted) },
    null,
    2
  );
  const blob = new Blob([payload], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "drawing.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromJSON(
  json: string
): ExcalidrawElement[] | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed?.type === "draw-diagram" && Array.isArray(parsed.elements)) {
      return parsed.elements as ExcalidrawElement[];
    }
    return null;
  } catch {
    return null;
  }
}

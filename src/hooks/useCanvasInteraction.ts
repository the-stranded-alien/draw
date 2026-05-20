"use client";
import { useRef, useCallback, useEffect } from "react";
import { useDrawStore } from "@/lib/store";
import { createElement, addPointToFreedraw, hitTest } from "@/lib/elements";
import { ExcalidrawElement, FreedrawElement, TextElement, Point } from "@/lib/types";
import { MIN_ZOOM, MAX_ZOOM } from "@/lib/constants";

// All shape tool types that produce a draggable bounding-box element.
// Keep this in sync with ToolType in types.ts.
const SHAPE_TOOLS = new Set([
  "rectangle", "ellipse", "diamond",
  "cylinder", "triangle", "parallelogram",
  "arrow", "line", "freedraw",
]);

export function useCanvasInteraction(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const store = useDrawStore();

  const isDrawingRef   = useRef(false);
  const activeElRef    = useRef<ExcalidrawElement | null>(null);
  const isPanningRef   = useRef(false);
  const panStartRef    = useRef<Point>({ x: 0, y: 0 });
  const scrollStartRef = useRef<Point>({ x: 0, y: 0 });
  const textareaRef    = useRef<HTMLTextAreaElement | null>(null);

  // Fixed world-space origin of the current draw stroke.
  // NEVER mutated during the drag — always computed from this vs cursor.
  const drawOriginRef = useRef<Point>({ x: 0, y: 0 });

  // ── Coordinate helpers ────────────────────────────────────────────────────

  const getWorldPos = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { scrollX, scrollY, zoom } = useDrawStore.getState().appState;
    return {
      x: (clientX - rect.left - scrollX) / zoom.value,
      y: (clientY - rect.top  - scrollY) / zoom.value,
    };
  }, [canvasRef]);

  const getTopElementAt = useCallback((x: number, y: number) => {
    const { elements } = useDrawStore.getState();
    for (let i = elements.length - 1; i >= 0; i--) {
      if (!elements[i].isDeleted && hitTest(elements[i], x, y)) return elements[i];
    }
    return null;
  }, []);

  // ── Text editing ──────────────────────────────────────────────────────────

  const commitTextEdit = useCallback(() => {
    if (!textareaRef.current) return;
    const { editingElement } = useDrawStore.getState().appState;
    if (editingElement) {
      store.updateElement(editingElement.id, { text: textareaRef.current.value } as Partial<TextElement>);
      store.pushHistory();
    }
    textareaRef.current.remove();
    textareaRef.current = null;
    store.setEditingElement(null);
  }, [store]);

  const startTextEdit = useCallback((element: TextElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { scrollX, scrollY, zoom } = useDrawStore.getState().appState;
    const z = zoom.value;

    const ta = document.createElement("textarea");
    ta.value = element.text;
    ta.style.cssText = `
      position:fixed;
      left:${rect.left + element.x * z + scrollX}px;
      top:${rect.top  + element.y * z + scrollY}px;
      font-size:${element.fontSize * z}px;
      font-family:Caveat,cursive;
      min-width:100px; min-height:40px;
      border:2px solid #6965db; outline:none;
      background:transparent; resize:none; overflow:hidden;
      padding:4px; color:${element.strokeColor};
      z-index:9999; line-height:${element.lineHeight};
    `;
    ta.addEventListener("blur", commitTextEdit);
    ta.addEventListener("keydown", (e) => { if (e.key === "Escape") commitTextEdit(); });
    document.body.appendChild(ta);
    ta.focus();
    textareaRef.current = ta;
    store.setEditingElement(element);
  }, [canvasRef, store, commitTextEdit]);

  // ── Pointer down ──────────────────────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    // Capture pointer so onPointerMove/Up fire even when cursor leaves canvas
    e.currentTarget.setPointerCapture(e.pointerId);

    if (e.button === 1) {
      // Middle-mouse pan
      isPanningRef.current   = true;
      panStartRef.current    = { x: e.clientX, y: e.clientY };
      scrollStartRef.current = {
        x: useDrawStore.getState().appState.scrollX,
        y: useDrawStore.getState().appState.scrollY,
      };
      return;
    }

    const pos = getWorldPos(e.clientX, e.clientY);
    const { activeTool, editingElement } = useDrawStore.getState().appState;

    if (editingElement) { commitTextEdit(); return; }

    if (activeTool === "hand") {
      isPanningRef.current   = true;
      panStartRef.current    = { x: e.clientX, y: e.clientY };
      scrollStartRef.current = {
        x: useDrawStore.getState().appState.scrollX,
        y: useDrawStore.getState().appState.scrollY,
      };
      return;
    }

    if (activeTool === "select") {
      const hit = getTopElementAt(pos.x, pos.y);
      if (hit) {
        store.setSelectedElements([hit.id]);
        if (e.detail === 2 && hit.type === "text") startTextEdit(hit as TextElement);
      } else {
        store.clearSelection();
      }
      return;
    }

    if (activeTool === "eraser") {
      const hit = getTopElementAt(pos.x, pos.y);
      if (hit) store.deleteElements([hit.id]);
      return;
    }

    if (activeTool === "text") {
      const hit = getTopElementAt(pos.x, pos.y);
      if (hit?.type === "text") { startTextEdit(hit as TextElement); return; }
      const el = createElement("text", pos.x, pos.y, store.currentStyle);
      store.addElement(el);
      startTextEdit(el as TextElement);
      return;
    }

    if (SHAPE_TOOLS.has(activeTool)) {
      const el = createElement(activeTool as ExcalidrawElement["type"], pos.x, pos.y, store.currentStyle);
      activeElRef.current   = el;
      isDrawingRef.current  = true;
      drawOriginRef.current = { x: pos.x, y: pos.y };
      store.addElement(el);
    }
  }, [getWorldPos, store, getTopElementAt, commitTextEdit, startTextEdit]);

  // ── Pointer move ──────────────────────────────────────────────────────────

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const { x: sx, y: sy } = scrollStartRef.current;
      store.setScroll(sx + e.clientX - panStartRef.current.x, sy + e.clientY - panStartRef.current.y);
      return;
    }

    if (!isDrawingRef.current || !activeElRef.current) return;

    const cur = getWorldPos(e.clientX, e.clientY);
    const el  = activeElRef.current;
    const ox  = drawOriginRef.current.x;
    const oy  = drawOriginRef.current.y;

    if (el.type === "freedraw") {
      const updates = addPointToFreedraw(el as FreedrawElement, cur, e.pressure || 0.5);
      if (Object.keys(updates).length) {
        store.updateElement(el.id, updates);
        Object.assign(activeElRef.current!, updates);
      }
      return;
    }

    if (el.type === "arrow" || el.type === "line") {
      const updates = {
        width:  Math.abs(cur.x - ox),
        height: Math.abs(cur.y - oy),
        points: [{ x: 0, y: 0 }, { x: cur.x - ox, y: cur.y - oy }],
      };
      store.updateElement(el.id, updates);
      Object.assign(activeElRef.current!, updates);
      return;
    }

    // All box shapes (rectangle, ellipse, diamond, cylinder, triangle, parallelogram)
    // Re-derive from the fixed draw origin every frame — works in all directions.
    const updates = {
      x:      Math.min(ox, cur.x),
      y:      Math.min(oy, cur.y),
      width:  Math.abs(cur.x - ox),
      height: Math.abs(cur.y - oy),
    };
    store.updateElement(el.id, updates);
    activeElRef.current!.width  = updates.width;
    activeElRef.current!.height = updates.height;
  }, [getWorldPos, store]);

  // ── Pointer up ────────────────────────────────────────────────────────────

  const onPointerUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (isDrawingRef.current && activeElRef.current) {
      const el = activeElRef.current;
      // Delete only if the user just clicked without any drag at all
      const tooSmall =
        el.type !== "freedraw" &&
        el.type !== "text" &&
        el.width  < 1 &&
        el.height < 1;

      if (tooSmall) {
        store.deleteElements([el.id]);
      } else {
        store.pushHistory();
        if (el.type !== "freedraw") {
          store.setTool("select");
          store.setSelectedElements([el.id]);
        }
      }
    }

    isDrawingRef.current = false;
    activeElRef.current  = null;
  }, [store]);

  // ── Wheel (zoom + scroll) ─────────────────────────────────────────────────

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const { zoom, scrollX, scrollY } = useDrawStore.getState().appState;

    if (e.ctrlKey || e.metaKey) {
      const newZoom = Math.min(Math.max(zoom.value * (1 - e.deltaY * 0.01), MIN_ZOOM), MAX_ZOOM);
      const canvas  = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const r  = newZoom / zoom.value;
      store.setScroll(cx - (cx - scrollX) * r, cy - (cy - scrollY) * r);
      store.setZoom(newZoom);
    } else {
      store.setScroll(scrollX - e.deltaX, scrollY - e.deltaY);
    }
  }, [store, canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [canvasRef, onWheel]);

  return { onPointerDown, onPointerMove, onPointerUp };
}

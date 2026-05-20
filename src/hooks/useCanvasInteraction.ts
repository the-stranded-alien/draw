"use client";
import { useRef, useCallback, useEffect } from "react";
import { useDrawStore } from "@/lib/store";
import { createElement, addPointToFreedraw, hitTest } from "@/lib/elements";
import { ExcalidrawElement, FreedrawElement, TextElement, Point } from "@/lib/types";
import { MIN_ZOOM, MAX_ZOOM } from "@/lib/constants";

export function useCanvasInteraction(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const store = useDrawStore();

  const isDrawingRef   = useRef(false);
  const activeElRef    = useRef<ExcalidrawElement | null>(null);
  const isPanningRef   = useRef(false);
  const panStartRef    = useRef<Point>({ x: 0, y: 0 });
  const scrollStartRef = useRef<Point>({ x: 0, y: 0 });
  const textareaRef    = useRef<HTMLTextAreaElement | null>(null);

  // The original world-space position where the pointer went down.
  // MUST NOT be mutated during drawing — it is the fixed origin for width/height math.
  const drawOriginRef  = useRef<Point>({ x: 0, y: 0 });

  // ── Coordinate conversion ─────────────────────────────────────────────────

  const getWorldPos = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      // Reads live from store to stay current across zoom/scroll changes
      const { scrollX, scrollY, zoom } = useDrawStore.getState().appState;
      return {
        x: (clientX - rect.left - scrollX) / zoom.value,
        y: (clientY - rect.top  - scrollY) / zoom.value,
      };
    },
    [canvasRef]
  );

  // ── Hit-testing (used by select / eraser) ────────────────────────────────

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

  const startTextEdit = useCallback(
    (element: TextElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect   = canvas.getBoundingClientRect();
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
    },
    [canvasRef, store, commitTextEdit]
  );

  // ── Pointer handlers ──────────────────────────────────────────────────────

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      // Middle-mouse pan
      if (e.button === 1) {
        isPanningRef.current  = true;
        panStartRef.current   = { x: e.clientX, y: e.clientY };
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

      const shapeTools = ["rectangle", "ellipse", "diamond", "arrow", "line", "freedraw"];
      if (shapeTools.includes(activeTool)) {
        const el = createElement(activeTool as ExcalidrawElement["type"], pos.x, pos.y, store.currentStyle);
        activeElRef.current   = el;
        isDrawingRef.current  = true;
        // Store the fixed draw origin — this MUST NOT change during the drag
        drawOriginRef.current = { x: pos.x, y: pos.y };
        store.addElement(el);
      }
    },
    [getWorldPos, store, getTopElementAt, commitTextEdit, startTextEdit]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
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
          // Reflect updates in ref so next addPointToFreedraw has correct points[]
          Object.assign(activeElRef.current!, updates);
        }
        return;
      }

      if (el.type === "arrow" || el.type === "line") {
        // Element origin stays at the draw start; points[1] is relative to that origin.
        const updates = {
          width:  Math.abs(cur.x - ox),
          height: Math.abs(cur.y - oy),
          points: [{ x: 0, y: 0 }, { x: cur.x - ox, y: cur.y - oy }],
        };
        store.updateElement(el.id, updates);
        Object.assign(activeElRef.current!, updates);
        return;
      }

      // Shapes — re-derive x/y from the fixed origin on every move so
      // drawing in any direction (including up/left) works correctly.
      const updates = {
        x:      Math.min(ox, cur.x),
        y:      Math.min(oy, cur.y),
        width:  Math.abs(cur.x - ox),
        height: Math.abs(cur.y - oy),
      };
      store.updateElement(el.id, updates);
      // Only update width/height in the ref — x/y recalculate from drawOriginRef each frame
      activeElRef.current!.width  = updates.width;
      activeElRef.current!.height = updates.height;
    },
    [getWorldPos, store]
  );

  const onPointerUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (isDrawingRef.current && activeElRef.current) {
      const el = activeElRef.current;
      const tooSmall =
        el.type !== "freedraw" &&
        el.type !== "text" &&
        el.width  < 2 &&
        el.height < 2;

      if (tooSmall) {
        // User just clicked without dragging — discard the element
        store.deleteElements([el.id]);
      } else {
        // Commit to history, then switch to select with the new element selected
        store.pushHistory();
        if (el.type !== "freedraw") {
          // setTool clears selectedElementIds, so call setSelectedElements AFTER it
          store.setTool("select");
          store.setSelectedElements([el.id]);
        }
      }
    }

    isDrawingRef.current  = false;
    activeElRef.current   = null;
  }, [store]);

  // ── Wheel (zoom + scroll) ─────────────────────────────────────────────────

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const { zoom, scrollX, scrollY } = useDrawStore.getState().appState;

      if (e.ctrlKey || e.metaKey) {
        const newZoom = Math.min(Math.max(zoom.value * (1 - e.deltaY * 0.01), MIN_ZOOM), MAX_ZOOM);
        const canvas  = canvasRef.current;
        if (!canvas) return;
        const rect    = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const r  = newZoom / zoom.value;
        store.setScroll(cx - (cx - scrollX) * r, cy - (cy - scrollY) * r);
        store.setZoom(newZoom);
      } else {
        store.setScroll(scrollX - e.deltaX, scrollY - e.deltaY);
      }
    },
    [store, canvasRef]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [canvasRef, onWheel]);

  return { onPointerDown, onPointerMove, onPointerUp };
}

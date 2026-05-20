"use client";
import { useRef, useCallback, useEffect } from "react";
import { useDrawStore } from "@/lib/store";
import { createElement, updateElementPoints, addPointToFreedraw, hitTest } from "@/lib/elements";
import { ExcalidrawElement, FreedrawElement, LinearElement, TextElement, Point } from "@/lib/types";
import { renderScene, renderSelectionBox } from "@/lib/renderer";
import { ZOOM_STEP, MIN_ZOOM, MAX_ZOOM } from "@/lib/constants";

export function useCanvasInteraction(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const store = useDrawStore();
  const isDrawingRef = useRef(false);
  const activeElementRef = useRef<ExcalidrawElement | null>(null);
  const lastPosRef = useRef<Point>({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef<Point>({ x: 0, y: 0 });
  const scrollStartRef = useRef<Point>({ x: 0, y: 0 });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const getWorldPos = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const { scrollX, scrollY, zoom } = store.appState;
      const z = zoom.value;
      return {
        x: (clientX - rect.left - scrollX) / z,
        y: (clientY - rect.top - scrollY) / z,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canvasRef, store.appState.scrollX, store.appState.scrollY, store.appState.zoom.value]
  );

  const getTopElementAt = useCallback(
    (x: number, y: number): ExcalidrawElement | null => {
      const { elements } = store;
      for (let i = elements.length - 1; i >= 0; i--) {
        if (!elements[i].isDeleted && hitTest(elements[i], x, y)) {
          return elements[i];
        }
      }
      return null;
    },
    [store]
  );

  const commitTextEdit = useCallback(() => {
    if (textareaRef.current && store.appState.editingElement) {
      const text = textareaRef.current.value;
      store.updateElement(store.appState.editingElement.id, { text } as Partial<TextElement>);
      store.pushHistory();
      textareaRef.current.remove();
      textareaRef.current = null;
      store.setEditingElement(null);
    }
  }, [store]);

  const startTextEdit = useCallback(
    (element: TextElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const { scrollX, scrollY, zoom } = store.appState;
      const z = zoom.value;

      const textarea = document.createElement("textarea");
      textarea.value = element.text;
      textarea.style.cssText = `
        position: fixed;
        left: ${rect.left + element.x * z + scrollX}px;
        top: ${rect.top + element.y * z + scrollY}px;
        font-size: ${element.fontSize * z}px;
        font-family: Caveat, cursive;
        min-width: 100px;
        min-height: 40px;
        border: 2px solid #6965db;
        outline: none;
        background: transparent;
        resize: none;
        overflow: hidden;
        padding: 4px;
        color: ${element.strokeColor};
        z-index: 9999;
        line-height: ${element.lineHeight};
      `;
      textarea.addEventListener("blur", commitTextEdit);
      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          commitTextEdit();
        }
      });
      document.body.appendChild(textarea);
      textarea.focus();
      textareaRef.current = textarea;
      store.setEditingElement(element);
    },
    [canvasRef, store, commitTextEdit]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button === 1) {
        // Middle mouse = pan
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        scrollStartRef.current = {
          x: store.appState.scrollX,
          y: store.appState.scrollY,
        };
        return;
      }

      const pos = getWorldPos(e.clientX, e.clientY);
      const { activeTool, editingElement } = store.appState;

      if (editingElement) {
        commitTextEdit();
        return;
      }

      if (activeTool === "hand") {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        scrollStartRef.current = {
          x: store.appState.scrollX,
          y: store.appState.scrollY,
        };
        return;
      }

      if (activeTool === "select") {
        const hit = getTopElementAt(pos.x, pos.y);
        if (hit) {
          store.setSelectedElements([hit.id]);
          // Double-click to edit text
          if (e.detail === 2 && hit.type === "text") {
            startTextEdit(hit as TextElement);
          }
        } else {
          store.clearSelection();
        }
        lastPosRef.current = pos;
        return;
      }

      if (activeTool === "eraser") {
        const hit = getTopElementAt(pos.x, pos.y);
        if (hit) store.deleteElements([hit.id]);
        return;
      }

      if (activeTool === "text") {
        const hit = getTopElementAt(pos.x, pos.y);
        if (hit && hit.type === "text") {
          startTextEdit(hit as TextElement);
          return;
        }
        const el = createElement("text", pos.x, pos.y, store.currentStyle);
        store.addElement(el);
        startTextEdit(el as TextElement);
        return;
      }

      // Shape tools
      if (
        ["rectangle", "ellipse", "diamond", "arrow", "line", "freedraw"].includes(
          activeTool
        )
      ) {
        const el = createElement(activeTool as ExcalidrawElement["type"], pos.x, pos.y, store.currentStyle);
        activeElementRef.current = el;
        isDrawingRef.current = true;
        lastPosRef.current = pos;
        // Optimistically add to store
        store.addElement(el);
      }
    },
    [getWorldPos, store, getTopElementAt, commitTextEdit, startTextEdit]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        store.setScroll(
          scrollStartRef.current.x + dx,
          scrollStartRef.current.y + dy
        );
        return;
      }

      if (!isDrawingRef.current || !activeElementRef.current) return;

      const pos = getWorldPos(e.clientX, e.clientY);
      const el = activeElementRef.current;

      if (el.type === "freedraw") {
        const updates = addPointToFreedraw(el as FreedrawElement, pos, e.pressure || 0.5);
        store.updateElement(el.id, updates);
        Object.assign(activeElementRef.current!, updates);
      } else {
        const updates = updateElementPoints(el, pos.x, pos.y);
        store.updateElement(el.id, updates);
        Object.assign(activeElementRef.current!, updates);
      }
    },
    [getWorldPos, store]
  );

  const onPointerUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (isDrawingRef.current && activeElementRef.current) {
      const el = activeElementRef.current;
      // Remove zero-size elements
      if (
        el.type !== "freedraw" &&
        el.type !== "text" &&
        Math.abs(el.width) < 2 &&
        Math.abs(el.height) < 2
      ) {
        store.deleteElements([el.id]);
      } else {
        // Switch to select after drawing
        if (el.type !== "freedraw") {
          store.setSelectedElements([el.id]);
          store.setTool("select");
        }
        store.pushHistory();
      }
    }

    isDrawingRef.current = false;
    activeElementRef.current = null;
  }, [store]);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const { zoom, scrollX, scrollY } = store.appState;

      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.01;
        const newZoom = Math.min(
          Math.max(zoom.value + delta, MIN_ZOOM),
          MAX_ZOOM
        );
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const centerX = e.clientX - rect.left;
        const centerY = e.clientY - rect.top;

        const zoomRatio = newZoom / zoom.value;
        store.setScroll(
          centerX - (centerX - scrollX) * zoomRatio,
          centerY - (centerY - scrollY) * zoomRatio
        );
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

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderScene(canvas, store.elements, store.appState);

    // Draw selection boxes on top
    const selectedIds = store.appState.selectedElementIds;
    const { scrollX, scrollY, zoom } = store.appState;
    store.elements.forEach((el) => {
      if (selectedIds[el.id] && !el.isDeleted) {
        renderSelectionBox(ctx, el, scrollX, scrollY, zoom.value, dpr);
      }
    });
  }, [store.elements, store.appState, canvasRef]);

  return { onPointerDown, onPointerMove, onPointerUp };
}

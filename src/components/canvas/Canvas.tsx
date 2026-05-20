"use client";
import { useLayoutEffect, useRef } from "react";
import { useDrawStore } from "@/lib/store";
import { useCanvasInteraction } from "@/hooks/useCanvasInteraction";
import { renderScene, renderSelectionBox } from "@/lib/renderer";
import { CURSOR_MAP } from "@/lib/constants";

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subscribe to the full store so React re-renders on every state change.
  // useLayoutEffect below fires synchronously after each commit → canvas is
  // always painted before the browser shows the next frame.
  const { appState, elements } = useDrawStore();
  const { onPointerDown, onPointerMove, onPointerUp } = useCanvasInteraction(canvasRef);

  // ── Size canvas to physical pixels ───────────────────────────────────────
  useLayoutEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width  = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Render — synchronous, before paint ───────────────────────────────────
  // useLayoutEffect fires after every React commit that changes [elements] or
  // [appState]. Because Zustand triggers React re-renders synchronously on
  // every set() call, the canvas is redrawn on every pointer event — no rAF
  // scheduling, no subscription races, no async delay.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Guard: if the resize layoutEffect hasn't run yet (first paint),
    // size the canvas now so we never draw into a 0×0 surface.
    if (canvas.width === 0 || canvas.height === 0) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
    }

    renderScene(canvas, elements, appState);

    // Selection boxes live in canvas-pixel space (renderScene resets transform)
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const dpr = window.devicePixelRatio || 1;
      elements.forEach((el) => {
        if (!el.isDeleted && appState.selectedElementIds[el.id]) {
          renderSelectionBox(ctx, el, appState.scrollX, appState.scrollY, appState.zoom.value, dpr);
        }
      });
    }
  }, [elements, appState]);

  const cursor = appState.activeTool === "hand"
    ? "grab"
    : (CURSOR_MAP[appState.activeTool] ?? "default");

  return (
    <canvas
      ref={canvasRef}
      style={{ cursor, touchAction: "none" }}
      className="absolute inset-0"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    />
  );
}

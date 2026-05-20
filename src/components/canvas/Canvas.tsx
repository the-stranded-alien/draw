"use client";
import { useEffect, useRef } from "react";
import { useDrawStore } from "@/lib/store";
import { useCanvasInteraction } from "@/hooks/useCanvasInteraction";
import { renderScene, renderSelectionBox } from "@/lib/renderer";
import { CURSOR_MAP } from "@/lib/constants";

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { appState } = useDrawStore();
  const { onPointerDown, onPointerMove, onPointerUp } = useCanvasInteraction(canvasRef);

  // ── Size canvas to fill the window ────────────────────────────────────────
  useEffect(() => {
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

  // ── Rendering via Zustand subscribe + rAF ────────────────────────────────
  //
  // Why NOT a continuous rAF loop:
  //   A plain rAF loop captures the canvas ref once at setup. If the canvas
  //   dimensions are 0 at that instant (resize hasn't run yet), every frame
  //   renders a blank 0×0 rect and elements are never visible.
  //
  // Why NOT a React useEffect on store changes:
  //   React batches + delays commits. Pointer events fire at 60 Hz+; React may
  //   skip frames between pointer-down and pointer-up, so the in-progress shape
  //   never redraws during the drag.
  //
  // Solution — subscribe to Zustand (fires synchronously on every state change)
  //   and schedule ONE rAF per change (caps rendering at 60 fps). The render
  //   callback reads canvasRef.current fresh each frame, so it's immune to
  //   StrictMode remounts and resize races.
  useEffect(() => {
    let raf: number | null = null;

    const renderFrame = () => {
      raf = null;
      const canvas = canvasRef.current;
      if (!canvas || canvas.width === 0 || canvas.height === 0) return;

      const { elements, appState: state } = useDrawStore.getState();
      renderScene(canvas, elements, state);

      // Selection boxes are drawn in canvas-pixel space (renderScene resets transform)
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        const { scrollX, scrollY, zoom, selectedElementIds } = state;
        elements.forEach((el) => {
          if (!el.isDeleted && selectedElementIds[el.id]) {
            renderSelectionBox(ctx, el, scrollX, scrollY, zoom.value, dpr);
          }
        });
      }
    };

    const scheduleRender = () => {
      if (raf !== null) return; // Already queued for this frame
      raf = requestAnimationFrame(renderFrame);
    };

    // Render once on mount (after resize has run)
    scheduleRender();

    // Re-render whenever any Zustand state changes
    const unsubscribe = useDrawStore.subscribe(scheduleRender);

    return () => {
      unsubscribe();
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cursor = appState.activeTool === "hand" ? "grab" : (CURSOR_MAP[appState.activeTool] ?? "default");

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

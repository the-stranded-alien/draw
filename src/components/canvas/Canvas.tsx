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

  // ── Resize canvas to fill window ──────────────────────────────────────────
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

  // ── requestAnimationFrame render loop ─────────────────────────────────────
  //
  // Why rAF instead of a React useEffect on store changes:
  //   Pointer events fire at 60 Hz+. React batches + delays state commits, so
  //   a useEffect render loop skips frames during active drawing — the element
  //   appears frozen or disappears between pointer-down and pointer-up.
  //
  //   rAF reads the Zustand store *directly* (getState, no React subscription)
  //   and renders every browser frame, so drawing is always smooth and current.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId: number;

    const frame = () => {
      // getState() reads the live Zustand state without triggering React renders
      const { elements, appState: state } = useDrawStore.getState();
      renderScene(canvas, elements, state);

      // Selection boxes are drawn in canvas-pixel space (after renderScene resets transform)
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        const { scrollX, scrollY, zoom, selectedElementIds } = state;
        elements.forEach((el) => {
          if (selectedElementIds[el.id] && !el.isDeleted) {
            renderSelectionBox(ctx, el, scrollX, scrollY, zoom.value, dpr);
          }
        });
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []); // empty deps — rAF loop runs for the lifetime of the canvas

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

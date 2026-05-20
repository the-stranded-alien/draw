"use client";
import { useEffect, useRef } from "react";
import { useDrawStore } from "@/lib/store";
import { useCanvasInteraction } from "@/hooks/useCanvasInteraction";
import { CURSOR_MAP } from "@/lib/constants";

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { appState } = useDrawStore();
  const { onPointerDown, onPointerMove, onPointerUp } =
    useCanvasInteraction(canvasRef);

  // Resize canvas to fill window
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const cursor =
    appState.activeTool === "hand"
      ? "grab"
      : CURSOR_MAP[appState.activeTool] ?? "default";

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

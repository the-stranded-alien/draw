"use client";
import { useEffect } from "react";
import { useDrawStore } from "@/lib/store";
import { ToolType } from "@/lib/types";
import { ZOOM_STEP } from "@/lib/constants";

const KEY_TO_TOOL: Record<string, ToolType> = {
  v: "select",
  h: "hand",
  r: "rectangle",
  o: "ellipse",
  d: "diamond",
  a: "arrow",
  l: "line",
  p: "freedraw",
  t: "text",
  e: "eraser",
};

export function useKeyboardShortcuts() {
  const store = useDrawStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      const key = e.key.toLowerCase();

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && key === "z" && !e.shiftKey) {
        e.preventDefault();
        store.undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        store.redo();
        return;
      }

      // Delete selected
      if (key === "delete" || key === "backspace") {
        const ids = Object.keys(store.appState.selectedElementIds);
        if (ids.length) store.deleteElements(ids);
        return;
      }

      // Duplicate
      if ((e.metaKey || e.ctrlKey) && key === "d") {
        e.preventDefault();
        const ids = Object.keys(store.appState.selectedElementIds);
        if (ids.length) store.duplicateElements(ids);
        return;
      }

      // Select all
      if ((e.metaKey || e.ctrlKey) && key === "a") {
        e.preventDefault();
        store.setSelectedElements(store.elements.map((el) => el.id));
        return;
      }

      // Zoom
      if ((e.metaKey || e.ctrlKey) && key === "=") {
        e.preventDefault();
        store.setZoom(store.appState.zoom.value + ZOOM_STEP);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && key === "-") {
        e.preventDefault();
        store.setZoom(store.appState.zoom.value - ZOOM_STEP);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && key === "0") {
        e.preventDefault();
        store.setZoom(1);
        store.setScroll(0, 0);
        return;
      }

      // Tool shortcuts
      if (!e.metaKey && !e.ctrlKey && !e.altKey && KEY_TO_TOOL[key]) {
        store.setTool(KEY_TO_TOOL[key]);
      }

      // Escape = back to select
      if (key === "escape") {
        store.setTool("select");
        store.clearSelection();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [store]);
}

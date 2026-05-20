"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";

const STORAGE_KEY = "draw-excalidraw-scene";

function loadSavedScene() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function ExcalidrawApp() {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initialData] = useState(() => loadSavedScene());

  // Point Excalidraw at our public/fonts directory for static hosting
  useEffect(() => {
    // @ts-expect-error — global set by Excalidraw to locate font assets
    window.EXCALIDRAW_ASSET_PATH = "/";
  }, []);

  // Debounced autosave to localStorage
  const handleChange = useCallback(() => {
    if (!apiRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const api = apiRef.current;
      if (!api) return;
      try {
        const json = serializeAsJSON(
          api.getSceneElements(),
          api.getAppState(),
          api.getFiles(),
          "local"
        );
        localStorage.setItem(STORAGE_KEY, json);
      } catch {
        // Ignore quota / private-browsing errors
      }
    }, 300);
  }, []);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Excalidraw
        excalidrawAPI={(api) => { apiRef.current = api; }}
        initialData={initialData}
        onChange={handleChange}
        autoFocus
        handleKeyboardGlobally
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            toggleTheme: true,
            export: { saveFileToDisk: true },
          },
        }}
      />
    </div>
  );
}

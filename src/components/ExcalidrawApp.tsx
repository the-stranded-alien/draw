"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Excalidraw, MainMenu, serializeAsJSON,
  exportToBlob, exportToSvg, exportToClipboard,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { LIBRARY_ITEMS } from "@/lib/libraryItems";
import { Maximize2, Copy, ImageDown, FileCode2, Expand, Minimize, Sun, Moon } from "lucide-react";

// ── Persistence ───────────────────────────────────────────────────────────────
const STORAGE_KEY = "draw-excalidraw-scene";
function loadSavedScene() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}

// ── Shared icon button ────────────────────────────────────────────────────────
function IconBtn({
  title, onClick, children, disabled, active,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 28, height: 28,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 6,
        border: "1px solid transparent",
        background: active || hovered
          ? "var(--color-surface-high, rgba(255,255,255,0.12))"
          : "transparent",
        color: active
          ? "var(--color-primary, #6965db)"
          : "var(--color-on-surface, #888)",
        cursor: disabled ? "default" : "pointer",
        padding: 0,
        opacity: disabled ? 0.4 : 1,
        transition: "background 120ms, color 120ms",
      }}
    >
      {children}
    </button>
  );
}

// ── Top-right toolbar ─────────────────────────────────────────────────────────
function TopBar({
  apiRef,
  theme,
  onToggleTheme,
}: {
  apiRef: React.RefObject<ExcalidrawImperativeAPI | null>;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const fitView = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const els = api.getSceneElements();
    api.scrollToContent(els.length ? els : undefined, { fitToContent: true });
  }, [apiRef]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const copyImage = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    try {
      await exportToClipboard({
        elements: api.getSceneElements(),
        appState: { ...api.getAppState(), exportBackground: true },
        files: api.getFiles(),
        type: "png",
      });
      api.setToast({ message: "Copied to clipboard ✓", duration: 2000 });
    } catch {
      api.setToast({ message: "Copy failed — try export instead", duration: 2500 });
    }
  }, [apiRef]);

  const savePng = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    try {
      const blob = await exportToBlob({
        elements: api.getSceneElements(),
        appState: { ...api.getAppState(), exportBackground: true },
        files: api.getFiles(),
        exportPadding: 16,
      });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: url, download: "drawing.png" }).click();
      URL.revokeObjectURL(url);
    } catch {
      api.setToast({ message: "PNG export failed", duration: 2000 });
    }
  }, [apiRef]);

  const saveSvg = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    try {
      const svg = await exportToSvg({
        elements: api.getSceneElements(),
        appState: { ...api.getAppState(), exportBackground: true },
        files: api.getFiles(),
        exportPadding: 16,
      });
      const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: url, download: "drawing.svg" }).click();
      URL.revokeObjectURL(url);
    } catch {
      api?.setToast({ message: "SVG export failed", duration: 2000 });
    }
  }, [apiRef]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "0 4px 0 2px" }}>
      <IconBtn title="Fit to view" onClick={fitView}><Maximize2 size={13} /></IconBtn>
      <IconBtn
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        onClick={toggleFullscreen}
        active={isFullscreen}
      >
        {isFullscreen ? <Minimize size={13} /> : <Expand size={13} />}
      </IconBtn>
      <IconBtn title="Copy as image" onClick={copyImage}><Copy size={13} /></IconBtn>
      <IconBtn title="Save PNG" onClick={savePng}><ImageDown size={13} /></IconBtn>
      <IconBtn title="Save SVG" onClick={saveSvg}><FileCode2 size={13} /></IconBtn>

      <div style={{
        width: 1, height: 16, flexShrink: 0, margin: "0 4px",
        background: "var(--color-border-outline-variant, rgba(128,128,128,0.3))",
      }} />

      <IconBtn
        title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        onClick={onToggleTheme}
      >
        {theme === "light" ? <Moon size={13} /> : <Sun size={13} />}
      </IconBtn>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ExcalidrawApp() {
  const apiRef    = useRef<ExcalidrawImperativeAPI | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [initialData] = useState(() => ({
    ...loadSavedScene(),
    libraryItems: LIBRARY_ITEMS,
  }));

  useEffect(() => {
    // @ts-expect-error — Excalidraw global for font asset resolution
    window.EXCALIDRAW_ASSET_PATH = "/";
  }, []);

  const handleChange = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY,
          serializeAsJSON(api.getSceneElements(), api.getAppState(), api.getFiles(), "local"));
      } catch { /* quota / private browsing */ }
    }, 300);
  }, []);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Excalidraw
        excalidrawAPI={(api) => { apiRef.current = api; }}
        initialData={initialData}
        theme={theme}
        onChange={handleChange}
        autoFocus
        handleKeyboardGlobally
        renderTopRightUI={() => (
          <TopBar
            apiRef={apiRef}
            theme={theme}
            onToggleTheme={() => setTheme(t => t === "light" ? "dark" : "light")}
          />
        )}
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            toggleTheme: false,
            changeViewBackgroundColor: true,
            export: { saveFileToDisk: true },
          },
        }}
      >
        <MainMenu>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
        </MainMenu>
      </Excalidraw>
    </div>
  );
}

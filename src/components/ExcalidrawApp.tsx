"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Excalidraw, MainMenu, serializeAsJSON,
  exportToBlob, exportToSvg, exportToClipboard,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { LIBRARY_ITEMS } from "@/lib/libraryItems";
import { Maximize2, Copy, ImageDown, FileCode2, Expand, Minimize } from "lucide-react";

// ── Persistence ───────────────────────────────────────────────────────────────
const STORAGE_KEY = "draw-excalidraw-scene";
function loadSavedScene() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}

// ── Themes ────────────────────────────────────────────────────────────────────
// swatch: left = accent, right = bg (gradient half-circle)
// --theme-filter: overrides the canvas CSS filter to tint the drawing surface
const THEMES = {
  light: {
    excalidrawTheme: "light" as const,
    accent: "#6965db",
    bg:     "#ffffff",
    label:  "Light",
    vars:   null,
  },
  dark: {
    excalidrawTheme: "dark" as const,
    accent: "#a8a5ff",
    bg:     "#1e1e1e",
    label:  "Dark",
    vars:   null,
  },
  ocean: {
    excalidrawTheme: "dark" as const,
    accent: "#22d3ee",
    bg:     "#0a1929",
    label:  "Ocean",
    vars: {
      "--color-primary":               "#22d3ee",
      "--color-primary-darker":        "#06b6d4",
      "--color-primary-darkest":       "#0891b2",
      "--color-primary-hover":         "#67e8f9",
      "--color-primary-light":         "#083344",
      "--color-primary-light-darker":  "#0e7490",
      "--color-brand-hover":           "#38bdf8",
      "--color-brand-active":          "#0284c7",
      "--color-selection":             "#22d3ee33",
      "--color-surface-lowest":        "hsl(207, 80%, 5%)",
      "--color-surface-low":           "hsl(207, 65%, 11%)",
      "--color-surface-mid":           "hsl(207, 68%, 8%)",
      "--color-surface-high":          "hsl(207, 55%, 17%)",
      "--island-bg-color":             "hsl(207, 58%, 13%)",
      "--default-bg-color":            "hsl(207, 80%, 6%)",
      "--input-bg-color":              "hsl(207, 68%, 9%)",
      "--input-hover-bg-color":        "hsl(207, 62%, 12%)",
      "--popup-secondary-bg-color":    "hsl(207, 65%, 10%)",
      // Canvas tint: dark + subtle cyan cast
      "--theme-filter": "invert(93%) hue-rotate(180deg) sepia(12%) hue-rotate(195deg)",
    },
  },
  sunset: {
    excalidrawTheme: "dark" as const,
    accent: "#fb923c",
    bg:     "#1c0800",
    label:  "Sunset",
    vars: {
      "--color-primary":               "#fb923c",
      "--color-primary-darker":        "#f97316",
      "--color-primary-darkest":       "#ea580c",
      "--color-primary-hover":         "#fdba74",
      "--color-primary-light":         "#431407",
      "--color-primary-light-darker":  "#7c2d12",
      "--color-brand-hover":           "#fed7aa",
      "--color-brand-active":          "#c2410c",
      "--color-selection":             "#fb923c33",
      "--color-surface-lowest":        "hsl(20, 80%, 4%)",
      "--color-surface-low":           "hsl(20, 60%, 10%)",
      "--color-surface-mid":           "hsl(20, 65%, 7%)",
      "--color-surface-high":          "hsl(20, 52%, 16%)",
      "--island-bg-color":             "hsl(20, 55%, 12%)",
      "--default-bg-color":            "hsl(20, 75%, 5%)",
      "--input-bg-color":              "hsl(20, 62%, 8%)",
      "--input-hover-bg-color":        "hsl(20, 58%, 11%)",
      "--popup-secondary-bg-color":    "hsl(20, 60%, 9%)",
      // Canvas tint: dark + subtle amber/warm cast
      "--theme-filter": "invert(93%) hue-rotate(180deg) sepia(18%) hue-rotate(350deg)",
    },
  },
  purple: {
    excalidrawTheme: "dark" as const,
    accent: "#c084fc",
    bg:     "#120024",
    label:  "Purple",
    vars: {
      "--color-primary":               "#c084fc",
      "--color-primary-darker":        "#a855f7",
      "--color-primary-darkest":       "#9333ea",
      "--color-primary-hover":         "#d8b4fe",
      "--color-primary-light":         "#3b0764",
      "--color-primary-light-darker":  "#4c1d95",
      "--color-brand-hover":           "#e9d5ff",
      "--color-brand-active":          "#7e22ce",
      "--color-selection":             "#c084fc33",
      "--color-surface-lowest":        "hsl(270, 78%, 4%)",
      "--color-surface-low":           "hsl(270, 62%, 11%)",
      "--color-surface-mid":           "hsl(270, 66%, 7%)",
      "--color-surface-high":          "hsl(270, 52%, 17%)",
      "--island-bg-color":             "hsl(270, 56%, 13%)",
      "--default-bg-color":            "hsl(270, 76%, 5%)",
      "--input-bg-color":              "hsl(270, 64%, 9%)",
      "--input-hover-bg-color":        "hsl(270, 58%, 12%)",
      "--popup-secondary-bg-color":    "hsl(270, 62%, 10%)",
      // Canvas tint: dark + subtle violet cast
      "--theme-filter": "invert(93%) hue-rotate(180deg) sepia(12%) hue-rotate(250deg)",
    },
  },
} as const;

type ThemeKey = keyof typeof THEMES;

// ── Shared icon button ────────────────────────────────────────────────────────
function IconBtn({
  title, onClick, children, disabled,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
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
        background: hovered
          ? "var(--color-surface-high, rgba(255,255,255,0.12))"
          : "transparent",
        color: "var(--color-on-surface, #888)",
        cursor: disabled ? "default" : "pointer",
        padding: 0,
        opacity: disabled ? 0.4 : 1,
        transition: "background 120ms",
      }}
    >
      {children}
    </button>
  );
}

// ── Action bar ────────────────────────────────────────────────────────────────
function ActionBar({ apiRef }: { apiRef: React.RefObject<ExcalidrawImperativeAPI | null> }) {
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
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      <IconBtn title="Fit to view" onClick={fitView}><Maximize2 size={13} /></IconBtn>
      <IconBtn title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
        {isFullscreen ? <Minimize size={13} /> : <Expand size={13} />}
      </IconBtn>
      <IconBtn title="Copy as image" onClick={copyImage}><Copy size={13} /></IconBtn>
      <IconBtn title="Save PNG" onClick={savePng}><ImageDown size={13} /></IconBtn>
      <IconBtn title="Save SVG" onClick={saveSvg}><FileCode2 size={13} /></IconBtn>
    </div>
  );
}

// ── Theme switcher ────────────────────────────────────────────────────────────
function ThemeSwitcher({ current, onChange }: { current: ThemeKey; onChange: (k: ThemeKey) => void }) {
  return (
    <div role="group" aria-label="Theme"
      style={{ display: "flex", alignItems: "center", gap: 5 }}>
      {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
        const t = THEMES[key];
        const active = current === key;
        const gradient = `linear-gradient(135deg, ${t.accent} 50%, ${t.bg} 50%)`;
        return (
          <button
            key={key}
            title={t.label}
            aria-label={t.label}
            aria-pressed={active}
            onClick={() => onChange(key)}
            style={{
              width: 22, height: 22,
              borderRadius: "50%",
              background: gradient,
              border: "none",
              outline: "none",
              cursor: "pointer",
              padding: 0,
              transform: active ? "scale(1.22)" : "scale(1)",
              transition: "transform 150ms cubic-bezier(0.16,1,0.3,1), box-shadow 120ms",
              // Subtle white ring on all; active gets accent glow + stronger white ring
              boxShadow: active
                ? `0 0 0 2px ${t.accent}, 0 0 0 3.5px rgba(255,255,255,0.55), 0 2px 8px ${t.accent}50`
                : "0 0 0 1.5px rgba(255,255,255,0.35)",
            }}
          />
        );
      })}
    </div>
  );
}

// ── Top-right toolbar ─────────────────────────────────────────────────────────
function TopBar({
  apiRef, theme, setTheme,
}: {
  apiRef: React.RefObject<ExcalidrawImperativeAPI | null>;
  theme: ThemeKey;
  setTheme: (k: ThemeKey) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px 0 2px" }}>
      <ActionBar apiRef={apiRef} />
      <div style={{
        width: 1, height: 16, flexShrink: 0,
        background: "var(--color-border-outline-variant, rgba(128,128,128,0.3))",
      }} />
      <ThemeSwitcher current={theme} onChange={setTheme} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ExcalidrawApp() {
  const apiRef      = useRef<ExcalidrawImperativeAPI | null>(null);
  const styleTagRef = useRef<HTMLStyleElement | null>(null);
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [theme, setTheme] = useState<ThemeKey>("light");

  const [initialData] = useState(() => ({
    ...loadSavedScene(),
    libraryItems: LIBRARY_ITEMS,
  }));

  useEffect(() => {
    // @ts-expect-error — Excalidraw global for font asset resolution
    window.EXCALIDRAW_ASSET_PATH = "/";
  }, []);

  const applyThemeColors = useCallback((themeKey: ThemeKey) => {
    if (typeof document === "undefined") return;
    if (!styleTagRef.current) {
      const existing = document.getElementById("draw-theme-override") as HTMLStyleElement | null;
      styleTagRef.current = existing ?? (() => {
        const el = document.createElement("style");
        el.id = "draw-theme-override";
        document.head.appendChild(el);
        return el;
      })();
    }
    const vars = THEMES[themeKey].vars;
    if (!vars) { styleTagRef.current.textContent = ""; return; }
    const decls = Object.entries(vars).map(([k, v]) => `  ${k}: ${v} !important;`).join("\n");
    styleTagRef.current.textContent = `.excalidraw {\n${decls}\n}`;
  }, []);

  useEffect(() => {
    applyThemeColors(theme);
    const raf = requestAnimationFrame(() => applyThemeColors(theme));
    return () => cancelAnimationFrame(raf);
  }, [theme, applyThemeColors]);

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
        theme={THEMES[theme].excalidrawTheme}
        onChange={handleChange}
        autoFocus
        handleKeyboardGlobally
        renderTopRightUI={() => (
          <TopBar apiRef={apiRef} theme={theme} setTheme={setTheme} />
        )}
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            toggleTheme: false,
            export: { saveFileToDisk: true },
          },
        }}
      >
        {/* Custom menu — same actions as default but without the Excalidraw links group */}
        <MainMenu>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
        </MainMenu>
      </Excalidraw>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { LIBRARY_ITEMS } from "@/lib/libraryItems";

// ── Persistence ───────────────────────────────────────────────────────────────
const STORAGE_KEY = "draw-excalidraw-scene";
function loadSavedScene() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}

// ── Themes ────────────────────────────────────────────────────────────────────
// The accent variables are applied via element.style.setProperty() on the
// .excalidraw DOM node (inline styles, specificity 1,0,0,0) — this beats any
// CSS-file rule unconditionally and works regardless of stylesheet load order.

const THEME_VARS = [
  "--color-primary", "--color-primary-darker", "--color-primary-darkest",
  "--color-primary-hover", "--color-primary-light", "--color-primary-light-darker",
  "--color-brand-hover", "--color-brand-active", "--color-selection",
] as const;

const THEMES = {
  light: {
    excalidrawTheme: "light" as const,
    swatch: "#ffffff", ring: "#6965db", label: "Light",
    vars: null, // use Excalidraw defaults
  },
  dark: {
    excalidrawTheme: "dark" as const,
    swatch: "#1e1e1e", ring: "#a8a5ff", label: "Dark",
    vars: null,
  },
  ocean: {
    excalidrawTheme: "dark" as const,
    swatch: "#0c4a6e", ring: "#22d3ee", label: "Ocean",
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
    },
  },
  sunset: {
    excalidrawTheme: "dark" as const,
    swatch: "#431407", ring: "#fb923c", label: "Sunset",
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
    },
  },
  purple: {
    excalidrawTheme: "dark" as const,
    swatch: "#3b0764", ring: "#c084fc", label: "Purple",
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
    },
  },
} as const;

type ThemeKey = keyof typeof THEMES;

// ── Theme switcher UI ─────────────────────────────────────────────────────────
function ThemeSwitcher({ current, onChange }: { current: ThemeKey; onChange: (k: ThemeKey) => void }) {
  return (
    <div role="group" aria-label="Theme"
      style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 10 }}>
      <span style={{ fontSize: 11, color: "var(--color-muted-darker,#888)", marginRight: 2, userSelect: "none" }}>
        Theme
      </span>
      {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
        const t = THEMES[key];
        const active = current === key;
        return (
          <button key={key} title={t.label} aria-label={t.label} aria-pressed={active}
            onClick={() => onChange(key)}
            style={{
              width: 20, height: 20, borderRadius: "50%",
              background: t.swatch,
              border: `2.5px solid ${active ? t.ring : "transparent"}`,
              outline: active ? `2px solid ${t.ring}50` : "none",
              outlineOffset: 1,
              cursor: "pointer", padding: 0,
              transform: active ? "scale(1.3)" : "scale(1)",
              transition: "transform 150ms cubic-bezier(0.16,1,0.3,1)",
              boxShadow: active ? `0 0 8px ${t.ring}80` : "0 0 0 1px #aaa5",
            }}
          />
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ExcalidrawApp() {
  const apiRef      = useRef<ExcalidrawImperativeAPI | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Apply accent-colour CSS variables directly on the .excalidraw DOM element.
  // Inline styles (specificity 1,0,0,0) beat every CSS rule unconditionally.
  const applyThemeColors = useCallback((themeKey: ThemeKey) => {
    const el = containerRef.current?.querySelector(".excalidraw") as HTMLElement | null;
    if (!el) return;
    // Clear any previous overrides
    THEME_VARS.forEach((k) => el.style.removeProperty(k));
    // Apply new overrides (null vars = use Excalidraw CSS defaults)
    const vars = THEMES[themeKey].vars;
    if (vars) Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
  }, []);

  useEffect(() => {
    // Try immediately, then after Excalidraw's first render tick
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
    <div ref={containerRef} style={{ width: "100vw", height: "100vh" }}>
      <Excalidraw
        excalidrawAPI={(api) => {
          apiRef.current = api;
          // API ready = Excalidraw is mounted, safe to apply theme now
          requestAnimationFrame(() => applyThemeColors(theme));
        }}
        initialData={initialData}
        theme={THEMES[theme].excalidrawTheme}
        onChange={handleChange}
        autoFocus
        handleKeyboardGlobally
        renderTopRightUI={() => (
          <ThemeSwitcher current={theme} onChange={setTheme} />
        )}
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            toggleTheme: false,
            export: { saveFileToDisk: true },
          },
        }}
      />
    </div>
  );
}

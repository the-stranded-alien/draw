"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { LIBRARY_ITEMS } from "@/lib/libraryItems";

// ── Persistence ───────────────────────────────────────────────────────────────
const STORAGE_KEY = "draw-excalidraw-scene";

function loadSavedScene() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── Theme system ───────────────────────────────────────────────────────────────
// Excalidraw CSS variables discovered from the built CSS:
//   .excalidraw                { --color-primary:#6965db; --color-primary-darker:#5b57d1; ... }
//   .excalidraw.theme--dark    { --color-primary:#a8a5ff; --color-primary-darker:#b2aeff; ... }
// Ocean / Sunset override those dark-mode vars via a higher-order style tag.

const THEMES = {
  light: {
    excalidrawTheme: "light" as const,
    swatch: "#ffffff",
    border: "#6965db",
    label: "Light",
    css: "", // use Excalidraw defaults
  },
  dark: {
    excalidrawTheme: "dark" as const,
    swatch: "#1e1e1e",
    border: "#a8a5ff",
    label: "Dark",
    css: "",
  },
  ocean: {
    excalidrawTheme: "dark" as const,
    swatch: "#0c1a2e",
    border: "#22d3ee",
    label: "Ocean",
    css: `
      .excalidraw.theme--dark {
        --color-primary:          #22d3ee !important;
        --color-primary-darker:   #06b6d4 !important;
        --color-primary-darkest:  #0891b2 !important;
        --color-primary-hover:    #67e8f9 !important;
        --color-primary-light:    #083344 !important;
        --color-primary-light-darker: #164e63 !important;
        --color-brand-hover:      #38bdf8 !important;
        --color-brand-active:     #0369a1 !important;
      }`,
  },
  sunset: {
    excalidrawTheme: "dark" as const,
    swatch: "#431407",
    border: "#fb923c",
    label: "Sunset",
    css: `
      .excalidraw.theme--dark {
        --color-primary:          #fb923c !important;
        --color-primary-darker:   #f97316 !important;
        --color-primary-darkest:  #ea580c !important;
        --color-primary-hover:    #fdba74 !important;
        --color-primary-light:    #431407 !important;
        --color-primary-light-darker: #7c2d12 !important;
        --color-brand-hover:      #fed7aa !important;
        --color-brand-active:     #c2410c !important;
      }`,
  },
} as const;

type ThemeKey = keyof typeof THEMES;

function injectThemeCSS(key: ThemeKey) {
  let el = document.getElementById("ex-theme-override") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "ex-theme-override";
    document.head.appendChild(el);
  }
  el.textContent = THEMES[key].css;
}

// ── Theme switcher UI ─────────────────────────────────────────────────────────
function ThemeSwitcher({
  current, onChange,
}: { current: ThemeKey; onChange: (k: ThemeKey) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 10, userSelect: "none" }}>
      <span style={{ fontSize: 11, color: "var(--color-muted-darker, #777)", marginRight: 2 }}>
        Theme
      </span>
      {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
        const t = THEMES[key];
        const active = current === key;
        return (
          <button
            key={key}
            title={t.label}
            onClick={() => onChange(key)}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: t.swatch,
              border: active
                ? `3px solid ${t.border}`
                : "2px solid #adb5bd",
              cursor: "pointer",
              outline: "none",
              padding: 0,
              transform: active ? "scale(1.25)" : "scale(1)",
              transition: "transform 150ms ease",
              boxShadow: active ? `0 0 0 2px ${t.border}40` : "none",
            }}
            aria-label={t.label}
            aria-pressed={active}
          />
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ExcalidrawApp() {
  const apiRef     = useRef<ExcalidrawImperativeAPI | null>(null);
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [theme, setTheme] = useState<ThemeKey>("light");

  const [initialData] = useState(() => ({
    ...loadSavedScene(),
    libraryItems: LIBRARY_ITEMS,
  }));

  // Set font asset path for static hosting (fonts in /public/fonts/)
  useEffect(() => {
    // @ts-expect-error — Excalidraw global
    window.EXCALIDRAW_ASSET_PATH = "/";
  }, []);

  // Apply theme CSS overrides
  useEffect(() => {
    injectThemeCSS(theme);
  }, [theme]);

  // Debounced autosave to localStorage (300 ms after last change)
  const handleChange = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const json = serializeAsJSON(
          api.getSceneElements(),
          api.getAppState(),
          api.getFiles(),
          "local"
        );
        localStorage.setItem(STORAGE_KEY, json);
      } catch { /* quota / private browsing */ }
    }, 300);
  }, []);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

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
          <ThemeSwitcher current={theme} onChange={setTheme} />
        )}
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            toggleTheme: false, // we provide our own switcher
            export: { saveFileToDisk: true },
          },
        }}
      />
    </div>
  );
}

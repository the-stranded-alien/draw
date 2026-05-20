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

// ── Theme definitions ─────────────────────────────────────────────────────────
// excalidrawTheme controls Excalidraw's light/dark mode.
// The accent overrides live in globals.css under [data-draw-theme="..."] selectors
// which have higher specificity (0,3,0) than Excalidraw's own (0,2,0) rules.
const THEMES = {
  light: {
    excalidrawTheme: "light" as const,
    swatch: "#ffffff",
    ring:   "#6965db",
    label:  "Light",
  },
  dark: {
    excalidrawTheme: "dark" as const,
    swatch: "#1e1e1e",
    ring:   "#a8a5ff",
    label:  "Dark",
  },
  ocean: {
    excalidrawTheme: "dark" as const,
    swatch: "#0c4a6e",
    ring:   "#22d3ee",
    label:  "Ocean",
  },
  sunset: {
    excalidrawTheme: "dark" as const,
    swatch: "#431407",
    ring:   "#fb923c",
    label:  "Sunset",
  },
  purple: {
    excalidrawTheme: "dark" as const,
    swatch: "#3b0764",
    ring:   "#c084fc",
    label:  "Purple",
  },
} as const;

type ThemeKey = keyof typeof THEMES;

// ── Theme switcher UI ─────────────────────────────────────────────────────────
function ThemeSwitcher({
  current, onChange,
}: { current: ThemeKey; onChange: (k: ThemeKey) => void }) {
  return (
    <div
      role="group"
      aria-label="Theme"
      style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 10 }}
    >
      <span style={{
        fontSize: 11,
        color: "var(--color-muted-darker, #888)",
        letterSpacing: "0.03em",
        marginRight: 2,
        userSelect: "none",
      }}>
        Theme
      </span>

      {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
        const t = THEMES[key];
        const active = current === key;
        return (
          <button
            key={key}
            title={t.label}
            aria-label={t.label}
            aria-pressed={active}
            onClick={() => onChange(key)}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: t.swatch,
              border: `2.5px solid ${active ? t.ring : "transparent"}`,
              outline: active ? `2px solid ${t.ring}40` : "none",
              outlineOffset: 1,
              cursor: "pointer",
              padding: 0,
              transform: active ? "scale(1.3)" : "scale(1)",
              transition: "transform 150ms cubic-bezier(0.16,1,0.3,1), border-color 150ms",
              boxShadow: active ? `0 0 6px ${t.ring}80` : "0 0 0 1px #aaa6",
            }}
          />
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ExcalidrawApp() {
  const apiRef    = useRef<ExcalidrawImperativeAPI | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [theme, setTheme] = useState<ThemeKey>("light");

  const [initialData] = useState(() => ({
    ...loadSavedScene(),
    libraryItems: LIBRARY_ITEMS,
  }));

  // Point Excalidraw at our public/fonts/ directory
  useEffect(() => {
    // @ts-expect-error — Excalidraw global
    window.EXCALIDRAW_ASSET_PATH = "/";
  }, []);

  // Debounced autosave (300 ms after last onChange)
  const handleChange = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          serializeAsJSON(api.getSceneElements(), api.getAppState(), api.getFiles(), "local")
        );
      } catch { /* quota / private browsing */ }
    }, 300);
  }, []);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  return (
    // data-draw-theme is read by [data-draw-theme="..."] selectors in globals.css
    // to apply accent-colour overrides on top of Excalidraw's dark theme defaults.
    <div
      data-draw-theme={theme}
      style={{ width: "100vw", height: "100vh" }}
    >
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
            toggleTheme: false,   // replaced by our own switcher
            export: { saveFileToDisk: true },
          },
        }}
      />
    </div>
  );
}

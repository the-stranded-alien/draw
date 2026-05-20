# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at localhost:3000
npm run build     # Production build
npm run lint      # ESLint
```

## Tech Stack

- **Next.js 15** (App Router, `src/` directory, `@/*` alias)
- **React 19** with TypeScript
- **Tailwind CSS v4** + **shadcn/ui** (components in `src/components/ui/`)
- **Zustand + Immer** for global state (`src/lib/store.ts`)
- **roughjs** — hand-drawn rendering via `RoughCanvas`
- **perfect-freehand** — pressure-sensitive stroke paths for freedraw tool
- **lucide-react** — all icons (no emojis as icons)
- **nanoid** — element IDs

## Architecture

### Data Flow

```
User input (pointer/keyboard)
  → useCanvasInteraction / useKeyboardShortcuts
  → useDrawStore (Zustand)
  → renderScene() redraws canvas on every store change
```

### State (`src/lib/store.ts`)

Single Zustand store holds:
- `elements: ExcalidrawElement[]` — the scene (all shapes)
- `appState: AppState` — zoom, scroll, active tool, selection, theme
- `currentStyle: StyleProps` — brush/stroke settings applied to new elements
- `history / historyIndex` — linear undo/redo stack (snapshots of elements)

### Element Model (`src/lib/types.ts`)

Every element extends `BaseElement`. Discriminated union `ExcalidrawElement`:
- `RectangleElement | EllipseElement | DiamondElement` — box shapes
- `LinearElement` — `arrow` or `line` with `points[]`
- `FreedrawElement` — freehand path with `points[]` + `pressures[]`
- `TextElement` — multi-line, per-element font/size/align
- `ImageElement` — raster images (not yet implemented)

### Rendering (`src/lib/renderer.ts`)

`renderScene()` is called after every store update. It:
1. Clears canvas, fills background, optionally draws grid
2. Applies `scrollX/scrollY` translation and `zoom` scale
3. Iterates elements, dispatching each to `renderElement()`
4. `renderElement()` routes to `rough.canvas` for shapes, `perfect-freehand` for freedraw, native Canvas 2D for text

Canvas is HiDPI-aware (`devicePixelRatio` scaling). Selection handles are drawn in screen-space after the transform is restored.

### Interaction (`src/hooks/useCanvasInteraction.ts`)

Converts pointer events to world-space coordinates (accounting for scroll/zoom), then:
- **select** tool: hit-tests elements (`hitTest()` in `elements.ts`), sets selection
- **shape tools**: `createElement()` → optimistic `addElement()` → `updateElement()` on move → finalize on up
- **freedraw**: streams points into `FreedrawElement.points` via `addPointToFreedraw()`
- **text**: injects a positioned `<textarea>` over the canvas; commits on blur/Escape
- **hand / middle-mouse**: pans via `scrollX/scrollY`
- **wheel**: zoom with Ctrl/Cmd, scroll otherwise

### Components

| Path | Role |
|------|------|
| `src/components/canvas/Canvas.tsx` | Canvas element, resize observer, pointer event bridge |
| `src/components/toolbar/Toolbar.tsx` | Centered top toolbar, tool buttons with keyboard shortcut badges |
| `src/components/panels/PropertiesPanel.tsx` | Right-side style panel (stroke, fill, roughness, opacity) |
| `src/components/panels/BottomBar.tsx` | Zoom controls, undo/redo, grid toggle, theme toggle, clear |

### Design System

Design tokens are persisted in `design-system/drawapp/MASTER.md`. Primary brand color is `#6965db` (Excalidraw purple). Use this for selection highlights, active tool states, and focus rings.

## Key Conventions

- All canvas drawing happens in `renderer.ts` — do not put `ctx.*` calls in components or hooks.
- `updateElement()` does **not** push history — call `pushHistory()` explicitly after a completed interaction.
- Element coordinates (`x`, `y`) are in **world space**. Convert pointer events with `getWorldPos()`.
- `LinearElement.points` are **relative** to the element's `(x, y)` origin.
- The canvas is sized to `window.innerWidth/Height * devicePixelRatio` with CSS size set separately.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at localhost:3000
npm run build     # Static export to out/
npm run lint      # ESLint
```

## Architecture

This is a Next.js 15 (App Router) static site that embeds the **real Excalidraw library** (`@excalidraw/excalidraw@0.18.x`).

```
src/
  app/
    page.tsx          — "use client"; dynamically imports ExcalidrawApp (ssr:false)
    layout.tsx        — Minimal layout, no custom providers
    globals.css       — Minimal reset; Excalidraw ships its own CSS
  components/
    ExcalidrawApp.tsx — "use client"; wraps <Excalidraw />, handles autosave
```

### Key decisions

**Static export** (`next.config.ts`: `output: "export"`, `trailingSlash: true`) — deploys as pure HTML/JS/CSS to GitHub Pages at `draw.guptasahil.in` via `.github/workflows/deploy.yml`.

**Font assets** — Excalidraw loads fonts relative to `window.EXCALIDRAW_ASSET_PATH`. The fonts from `node_modules/@excalidraw/excalidraw/dist/prod/fonts/` are copied to `public/fonts/` and the path is set to `"/"` in `ExcalidrawApp.tsx`.

**`transpilePackages`** in `next.config.ts` — required because `@excalidraw/*` packages ship as ESM.

**Autosave** — `ExcalidrawApp.tsx` debounces `onChange` (300 ms) and serialises the scene to `localStorage` under the key `draw-excalidraw-scene`. Page refreshes reload this scene via `initialData`.

**Dynamic import** — `page.tsx` must be `"use client"` to use `dynamic(..., { ssr: false })` in the App Router.

### Updating fonts after a package upgrade

```bash
cp -r node_modules/@excalidraw/excalidraw/dist/prod/fonts public/
```

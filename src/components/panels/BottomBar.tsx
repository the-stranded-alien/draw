"use client";
import { useRef } from "react";
import { useDrawStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ZoomIn, ZoomOut, Grid3X3, Sun, Moon, Undo2, Redo2, Trash2, Download, Upload, Image } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ZOOM_STEP, MIN_ZOOM, MAX_ZOOM } from "@/lib/constants";
import { exportToImage, exportToJSON, importFromJSON } from "@/lib/export";

function BarButton({
  onClick, title, children, disabled, danger,
}: {
  onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean; danger?: boolean;
}) {
  const { appState } = useDrawStore();
  const isDark = appState.theme === "dark";
  return (
    <Tooltip>
      <TooltipTrigger>
        <button onClick={onClick} disabled={disabled} aria-label={title}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            "transition-all duration-[150ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
            "active:scale-90 cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6965db]",
            disabled && "cursor-not-allowed opacity-30",
            !disabled && !danger && !isDark && "text-gray-600 hover:bg-black/[0.06] hover:text-gray-800",
            !disabled && !danger &&  isDark && "text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200",
            !disabled &&  danger && "text-red-400 hover:bg-red-500/10 hover:text-red-500"
          )}>
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="text-xs">{title}</TooltipContent>
    </Tooltip>
  );
}

function Divider() {
  const { appState } = useDrawStore();
  return <span aria-hidden className={cn("mx-0.5 h-5 w-px",
    appState.theme === "dark" ? "bg-white/[0.08]" : "bg-black/[0.08]")} />;
}

export default function BottomBar() {
  const store = useDrawStore();
  const { appState, setZoom, setScroll, toggleTheme, toggleGrid, undo, redo, resetCanvas, historyIndex, history, elements } = store;
  const isDark = appState.theme === "dark";
  const zoomPct = Math.round(appState.zoom.value * 100);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const importRef = useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const imported = importFromJSON(text);
      if (imported) store.setElements(imported);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <nav aria-label="Canvas controls"
      className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 z-30",
        "flex items-center gap-0.5 px-2 py-1.5 rounded-2xl border",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
        isDark
          ? "bg-[#1a1a1e]/90 backdrop-blur-xl border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          : "bg-white/90 backdrop-blur-xl border-black/[0.08]"
      )}>

      {/* Undo / Redo */}
      <BarButton onClick={undo} title="Undo (⌘Z)" disabled={!canUndo}><Undo2 size={16} strokeWidth={1.75} /></BarButton>
      <BarButton onClick={redo} title="Redo (⌘⇧Z)" disabled={!canRedo}><Redo2 size={16} strokeWidth={1.75} /></BarButton>

      <Divider />

      {/* Zoom */}
      <BarButton onClick={() => setZoom(Math.max(appState.zoom.value - ZOOM_STEP, MIN_ZOOM))} title="Zoom out (⌘−)">
        <ZoomOut size={16} strokeWidth={1.75} />
      </BarButton>

      <Tooltip>
        <TooltipTrigger>
          <button onClick={() => { setZoom(1); setScroll(0, 0); }}
            aria-label={`Zoom ${zoomPct}% — click to reset`}
            className={cn(
              "min-w-[54px] rounded-xl px-2 py-1 text-[11px] font-semibold tabular-nums",
              "transition-all duration-[150ms] active:scale-95 cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6965db]",
              isDark ? "text-zinc-300 hover:bg-white/[0.07]" : "text-gray-600 hover:bg-black/[0.06]"
            )}>
            {zoomPct}%
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8} className="text-xs">Reset zoom (⌘0)</TooltipContent>
      </Tooltip>

      <BarButton onClick={() => setZoom(Math.min(appState.zoom.value + ZOOM_STEP, MAX_ZOOM))} title="Zoom in (⌘+)">
        <ZoomIn size={16} strokeWidth={1.75} />
      </BarButton>

      <Divider />

      {/* Grid + Theme */}
      <BarButton onClick={toggleGrid} title={appState.showGrid ? "Hide grid" : "Show grid"}>
        <Grid3X3 size={16} strokeWidth={1.75} className={appState.showGrid ? "text-[#6965db]" : ""} />
      </BarButton>
      <BarButton onClick={toggleTheme} title={isDark ? "Light mode" : "Dark mode"}>
        {isDark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
      </BarButton>

      <Divider />

      {/* Export */}
      <Popover>
        <Tooltip>
          <TooltipTrigger>
            <PopoverTrigger>
              <button aria-label="Export"
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  "transition-all duration-[150ms] active:scale-90 cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6965db]",
                  isDark ? "text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200"
                         : "text-gray-600 hover:bg-black/[0.06] hover:text-gray-800"
                )}>
                <Download size={16} strokeWidth={1.75} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>

          <TooltipContent side="top" sideOffset={8} className="text-xs">Export</TooltipContent>
        </Tooltip>

        <PopoverContent side="top" sideOffset={12} align="center"
          className={cn(
            "w-44 p-1.5 rounded-xl border shadow-xl",
            isDark ? "bg-[#1a1a1e] border-white/[0.08]" : "bg-white border-black/[0.08]"
          )}>
          <p className={cn("px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-widest",
            isDark ? "text-zinc-500" : "text-gray-400")}>Export as</p>

          {([
            { label: "PNG Image",  icon: <Image size={14} />, action: () => exportToImage(elements, appState, "png") },
            { label: "JPEG Image", icon: <Image size={14} />, action: () => exportToImage(elements, appState, "jpeg") },
            { label: "Diagram JSON", icon: <Download size={14} />, action: () => exportToJSON(elements) },
          ] as const).map(({ label, icon, action }) => (
            <button key={label} onClick={action}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium",
                "transition-colors duration-[120ms] cursor-pointer",
                isDark ? "text-zinc-300 hover:bg-white/[0.07]" : "text-gray-700 hover:bg-black/[0.05]"
              )}>
              {icon}{label}
            </button>
          ))}

          <div className={cn("my-1 h-px", isDark ? "bg-white/[0.06]" : "bg-black/[0.06]")} />

          <button onClick={() => importRef.current?.click()}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium",
              "transition-colors duration-[120ms] cursor-pointer",
              isDark ? "text-zinc-300 hover:bg-white/[0.07]" : "text-gray-700 hover:bg-black/[0.05]"
            )}>
            <Upload size={14} /> Import JSON
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </PopoverContent>
      </Popover>

      <Divider />

      {/* Clear canvas */}
      <BarButton onClick={resetCanvas} title="Clear canvas" danger>
        <Trash2 size={16} strokeWidth={1.75} />
      </BarButton>
    </nav>
  );
}

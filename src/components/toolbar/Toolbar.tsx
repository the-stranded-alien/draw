"use client";
import { useDrawStore } from "@/lib/store";
import { ToolType } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  MousePointer2, Hand, Square, Circle, Diamond,
  MoveRight, Minus, Pencil, Type, Eraser,
  Triangle, AlignVerticalJustifyStart,
} from "lucide-react";

// Cylinder SVG (no lucide equivalent)
function CylinderIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

// Parallelogram SVG
function ParallelogramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6,4 22,4 18,20 2,20" />
    </svg>
  );
}

interface Tool {
  type: ToolType;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
  group: number; // separator after last item of each group
}

const TOOLS: Tool[] = [
  // Group 0 — navigation
  { type: "select",       label: "Select",       shortcut: "V", group: 0, icon: <MousePointer2 size={16} strokeWidth={1.75} /> },
  { type: "hand",         label: "Hand",         shortcut: "H", group: 0, icon: <Hand            size={16} strokeWidth={1.75} /> },
  // Group 1 — shapes
  { type: "rectangle",   label: "Rectangle",    shortcut: "R", group: 1, icon: <Square          size={16} strokeWidth={1.75} /> },
  { type: "ellipse",     label: "Ellipse",      shortcut: "O", group: 1, icon: <Circle          size={16} strokeWidth={1.75} /> },
  { type: "diamond",     label: "Diamond",      shortcut: "D", group: 1, icon: <Diamond         size={16} strokeWidth={1.75} /> },
  { type: "cylinder",    label: "Cylinder (DB)",shortcut: "Y", group: 1, icon: <CylinderIcon    size={16} /> },
  { type: "triangle",    label: "Triangle",     shortcut: "G", group: 1, icon: <Triangle        size={16} strokeWidth={1.75} /> },
  { type: "parallelogram",label:"Parallelogram (I/O)", shortcut: "I", group: 1, icon: <ParallelogramIcon size={16} /> },
  // Group 2 — lines
  { type: "arrow",       label: "Arrow",        shortcut: "A", group: 2, icon: <MoveRight       size={16} strokeWidth={1.75} /> },
  { type: "line",        label: "Line",         shortcut: "L", group: 2, icon: <Minus           size={16} strokeWidth={1.75} /> },
  { type: "freedraw",    label: "Draw",         shortcut: "P", group: 2, icon: <Pencil          size={16} strokeWidth={1.75} /> },
  // Group 3 — text/erase
  { type: "text",        label: "Text",         shortcut: "T", group: 3, icon: <Type            size={16} strokeWidth={1.75} /> },
  { type: "eraser",      label: "Eraser",       shortcut: "E", group: 3, icon: <Eraser          size={16} strokeWidth={1.75} /> },
];

export default function Toolbar() {
  const { appState, setTool } = useDrawStore();
  const active = appState.activeTool;
  const isDark = appState.theme === "dark";

  return (
    <div
      className={cn(
        "absolute left-1/2 top-4 -translate-x-1/2 z-30",
        "flex items-center gap-0.5 px-2 py-1.5 rounded-2xl border",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
        isDark
          ? "bg-[#1a1a1e]/90 backdrop-blur-xl border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          : "bg-white/90 backdrop-blur-xl border-black/[0.08]"
      )}
      role="toolbar"
      aria-label="Drawing tools"
    >
      {TOOLS.map((tool, i) => {
        const isLastInGroup = i < TOOLS.length - 1 && TOOLS[i + 1].group !== tool.group;
        return (
          <span key={tool.type} className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger>
                <button
                  onClick={() => setTool(tool.type)}
                  aria-label={`${tool.label} (${tool.shortcut})`}
                  aria-pressed={active === tool.type}
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-xl",
                    "transition-all duration-[180ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
                    "active:scale-95 cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:ring-offset-1",
                    active !== tool.type && !isDark && "text-gray-500 hover:bg-black/[0.06] hover:text-gray-800",
                    active !== tool.type &&  isDark && "text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-100",
                    active === tool.type && "bg-[#6965db] text-white shadow-[0_2px_8px_rgba(105,101,219,0.5)] hover:bg-[#5854c8]"
                  )}
                >
                  {tool.icon}
                  <span aria-hidden className={cn(
                    "absolute right-[3px] bottom-[2px] text-[7px] font-bold leading-none",
                    active === tool.type ? "opacity-70 text-white" : "opacity-30"
                  )}>
                    {tool.shortcut}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border shadow-lg",
                  isDark ? "bg-[#1a1a1e] border-white/[0.08] text-zinc-200" : "bg-white border-black/[0.08] text-gray-700"
                )}
              >
                {tool.label}
                <kbd className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  isDark ? "bg-white/[0.08] text-zinc-400" : "bg-gray-100 text-gray-500")}>
                  {tool.shortcut}
                </kbd>
              </TooltipContent>
            </Tooltip>

            {isLastInGroup && (
              <span aria-hidden className={cn("mx-0.5 h-5 w-px",
                isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
            )}
          </span>
        );
      })}
    </div>
  );
}

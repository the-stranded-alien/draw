"use client";
import { useDrawStore } from "@/lib/store";
import { ToolType } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Diamond,
  MoveRight,
  Minus,
  Pencil,
  Type,
  Eraser,
} from "lucide-react";

interface Tool {
  type: ToolType;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

const TOOLS: Tool[] = [
  { type: "select",    label: "Select",    shortcut: "V", icon: <MousePointer2 size={16} strokeWidth={1.75} /> },
  { type: "hand",      label: "Hand",      shortcut: "H", icon: <Hand           size={16} strokeWidth={1.75} /> },
  { type: "rectangle", label: "Rectangle", shortcut: "R", icon: <Square         size={16} strokeWidth={1.75} /> },
  { type: "ellipse",   label: "Ellipse",   shortcut: "O", icon: <Circle         size={16} strokeWidth={1.75} /> },
  { type: "diamond",   label: "Diamond",   shortcut: "D", icon: <Diamond        size={16} strokeWidth={1.75} /> },
  { type: "arrow",     label: "Arrow",     shortcut: "A", icon: <MoveRight      size={16} strokeWidth={1.75} /> },
  { type: "line",      label: "Line",      shortcut: "L", icon: <Minus          size={16} strokeWidth={1.75} /> },
  { type: "freedraw",  label: "Draw",      shortcut: "P", icon: <Pencil         size={16} strokeWidth={1.75} /> },
  { type: "text",      label: "Text",      shortcut: "T", icon: <Type           size={16} strokeWidth={1.75} /> },
  { type: "eraser",    label: "Eraser",    shortcut: "E", icon: <Eraser         size={16} strokeWidth={1.75} /> },
];

const SEPARATOR_AFTER = new Set(["hand", "arrow"]);

export default function Toolbar() {
  const { appState, setTool } = useDrawStore();
  const active = appState.activeTool;
  const isDark = appState.theme === "dark";

  return (
    <div
      className={cn(
        "absolute left-1/2 top-4 -translate-x-1/2 z-30",
        "flex items-center gap-0.5 px-2 py-1.5",
        "rounded-2xl border",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
        // Glassmorphism — light mode
        "bg-white/90 backdrop-blur-xl border-black/[0.08]",
        // Glassmorphism — dark mode
        isDark && "bg-[#1a1a1e]/90 border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      )}
      role="toolbar"
      aria-label="Drawing tools"
    >
      {TOOLS.map((tool, i) => (
        <span key={tool.type} className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger>
              <button
                onClick={() => setTool(tool.type)}
                aria-label={`${tool.label} (${tool.shortcut})`}
                aria-pressed={active === tool.type}
                className={cn(
                  // Base
                  "relative flex h-9 w-9 items-center justify-center rounded-xl",
                  "transition-all duration-[180ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
                  // Press feedback (scale-95 per UX guidelines)
                  "active:scale-95",
                  // Focus ring for keyboard nav
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:ring-offset-1",
                  // Cursor
                  "cursor-pointer",
                  // Inactive state
                  !isDark && active !== tool.type && "text-gray-500 hover:bg-black/[0.06] hover:text-gray-800",
                  isDark  && active !== tool.type && "text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-100",
                  // Active state
                  active === tool.type && [
                    "bg-[#6965db] text-white shadow-[0_2px_8px_rgba(105,101,219,0.5)]",
                    "hover:bg-[#5854c8]",
                  ]
                )}
              >
                {tool.icon}
                {/* Keyboard shortcut badge */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute right-[3px] bottom-[2px] text-[7px] font-bold leading-none tracking-tight",
                    active === tool.type ? "opacity-70 text-white" : "opacity-30"
                  )}
                >
                  {tool.shortcut}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              sideOffset={8}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
                "border shadow-lg",
                isDark
                  ? "bg-[#1a1a1e] border-white/[0.08] text-zinc-200"
                  : "bg-white border-black/[0.08] text-gray-700"
              )}
            >
              {tool.label}
              <kbd
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  isDark ? "bg-white/[0.08] text-zinc-400" : "bg-gray-100 text-gray-500"
                )}
              >
                {tool.shortcut}
              </kbd>
            </TooltipContent>
          </Tooltip>

          {/* Vertical separator between tool groups */}
          {SEPARATOR_AFTER.has(tool.type) && i < TOOLS.length - 1 && (
            <span
              className={cn(
                "mx-0.5 h-5 w-px",
                isDark ? "bg-white/[0.08]" : "bg-black/[0.08]"
              )}
              aria-hidden
            />
          )}
        </span>
      ))}
    </div>
  );
}

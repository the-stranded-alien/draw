"use client";
import { useDrawStore } from "@/lib/store";
import { COLORS } from "@/lib/constants";
import { FillStyle, StrokeStyle, RoughnessLevel } from "@/lib/types";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/* ─── Primitives ─────────────────────────────────────────── */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
        {label}
      </p>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="my-3 h-px bg-black/[0.06] dark:bg-white/[0.06]" />;
}

function ColorSwatch({
  color,
  selected,
  onClick,
  size = "md",
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
  size?: "sm" | "md";
}) {
  const isTransparent = color === "transparent";
  return (
    <button
      onClick={onClick}
      title={isTransparent ? "Transparent" : color}
      aria-pressed={selected}
      className={cn(
        "relative rounded-md border-2 transition-all duration-[150ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
        "active:scale-90 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6965db]",
        size === "md" ? "h-[26px] w-[26px]" : "h-5 w-5",
        selected
          ? "border-[#6965db] shadow-[0_0_0_1px_#6965db]"
          : "border-transparent hover:border-gray-300 dark:hover:border-zinc-500"
      )}
      style={
        isTransparent
          ? {
              backgroundImage:
                "linear-gradient(45deg,#d1d5db 25%,transparent 25%)," +
                "linear-gradient(-45deg,#d1d5db 25%,transparent 25%)," +
                "linear-gradient(45deg,transparent 75%,#d1d5db 75%)," +
                "linear-gradient(-45deg,transparent 75%,#d1d5db 75%)",
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0,0 4px,4px -4px,-4px 0",
            }
          : { backgroundColor: color }
      }
    />
  );
}

function IconToggle({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-9 flex-1 items-center justify-center rounded-xl text-xs font-medium",
        "transition-all duration-[150ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
        "active:scale-95 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6965db]",
        active
          ? "bg-[#6965db] text-white shadow-[0_2px_8px_rgba(105,101,219,0.35)]"
          : "bg-black/[0.05] text-gray-600 hover:bg-black/[0.09] dark:bg-white/[0.05] dark:text-zinc-400 dark:hover:bg-white/[0.09]"
      )}
    >
      {children}
    </button>
  );
}

/* ─── Stroke width visual indicators ─────────────────────── */
const STROKE_WIDTHS = [
  { value: 1, label: "Thin",   height: "h-[1.5px]" },
  { value: 2, label: "Medium", height: "h-[2.5px]" },
  { value: 4, label: "Bold",   height: "h-[4px]"   },
] as const;

/* ─── Main component ──────────────────────────────────────── */
export default function PropertiesPanel() {
  const { currentStyle, setCurrentStyle, appState, elements, updateElement } =
    useDrawStore();
  const isDark = appState.theme === "dark";

  const selectedIds = Object.keys(appState.selectedElementIds);

  const applyStyle = (updates: Partial<typeof currentStyle>) => {
    setCurrentStyle(updates);
    selectedIds.forEach((id) => updateElement(id, updates));
  };

  return (
    <aside
      aria-label="Properties"
      className={cn(
        "absolute right-4 top-1/2 -translate-y-1/2 z-30 w-[214px]",
        "rounded-2xl border p-4",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
        // Glassmorphism
        isDark
          ? "bg-[#1a1a1e]/90 backdrop-blur-xl border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          : "bg-white/90 backdrop-blur-xl border-black/[0.08]"
      )}
    >
      {/* Stroke color */}
      <Section label="Stroke">
        <div className="flex flex-wrap gap-1.5">
          {COLORS.stroke.map((c) => (
            <ColorSwatch
              key={c}
              color={c}
              selected={currentStyle.strokeColor === c}
              onClick={() => applyStyle({ strokeColor: c })}
            />
          ))}
        </div>
      </Section>

      <Divider />

      {/* Background color */}
      <Section label="Background">
        <div className="flex flex-wrap gap-1.5">
          {COLORS.fill.slice(0, 11).map((c) => (
            <ColorSwatch
              key={c}
              color={c}
              selected={currentStyle.backgroundColor === c}
              onClick={() => applyStyle({ backgroundColor: c })}
            />
          ))}
        </div>
      </Section>

      <Divider />

      {/* Fill style */}
      <Section label="Fill Style">
        <div className="flex gap-1">
          {(
            [
              { val: "none" as FillStyle,       icon: "—",  tip: "None"       },
              { val: "hachure" as FillStyle,    icon: "≡",  tip: "Hachure"    },
              { val: "cross-hatch" as FillStyle, icon: "#",  tip: "Cross-hatch"},
              { val: "solid" as FillStyle,       icon: "■",  tip: "Solid"      },
            ]
          ).map(({ val, icon, tip }) => (
            <IconToggle
              key={val}
              active={currentStyle.fillStyle === val}
              onClick={() => applyStyle({ fillStyle: val })}
              title={tip}
            >
              {icon}
            </IconToggle>
          ))}
        </div>
      </Section>

      <Divider />

      {/* Stroke width */}
      <Section label="Stroke Width">
        <div className="flex gap-1">
          {STROKE_WIDTHS.map(({ value, label, height }) => (
            <IconToggle
              key={value}
              active={currentStyle.strokeWidth === value}
              onClick={() => applyStyle({ strokeWidth: value })}
              title={label}
            >
              <span
                className={cn(
                  "block w-5 rounded-full",
                  height,
                  currentStyle.strokeWidth === value
                    ? "bg-white"
                    : "bg-gray-500 dark:bg-zinc-400"
                )}
              />
            </IconToggle>
          ))}
        </div>
      </Section>

      {/* Stroke style */}
      <Section label="Stroke Style">
        <div className="flex gap-1">
          {(
            [
              { val: "solid" as StrokeStyle,  dash: "none",        tip: "Solid"  },
              { val: "dashed" as StrokeStyle, dash: "8px,4px",     tip: "Dashed" },
              { val: "dotted" as StrokeStyle, dash: "2px,5px",     tip: "Dotted" },
            ]
          ).map(({ val, dash, tip }) => (
            <IconToggle
              key={val}
              active={currentStyle.strokeStyle === val}
              onClick={() => applyStyle({ strokeStyle: val })}
              title={tip}
            >
              <svg width="20" height="4" viewBox="0 0 20 4" aria-hidden>
                <line
                  x1="0" y1="2" x2="20" y2="2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={dash === "none" ? undefined : dash}
                  strokeLinecap="round"
                />
              </svg>
            </IconToggle>
          ))}
        </div>
      </Section>

      <Divider />

      {/* Roughness */}
      <Section label="Roughness">
        <div className="flex gap-1">
          {(
            [
              { val: 0 as RoughnessLevel, label: "Architect", emoji: "◻" },
              { val: 1 as RoughnessLevel, label: "Artist",    emoji: "▱" },
              { val: 2 as RoughnessLevel, label: "Cartoonist",emoji: "⬡" },
            ]
          ).map(({ val, label, emoji }) => (
            <IconToggle
              key={val}
              active={currentStyle.roughness === val}
              onClick={() => applyStyle({ roughness: val })}
              title={label}
            >
              <span className="text-base">{emoji}</span>
            </IconToggle>
          ))}
        </div>
      </Section>

      <Divider />

      {/* Opacity */}
      <Section label={`Opacity — ${currentStyle.opacity}%`}>
        <Slider
          value={[currentStyle.opacity]}
          min={0}
          max={100}
          step={5}
          onValueChange={(vals) =>
            applyStyle({ opacity: Array.isArray(vals) ? vals[0] : vals })
          }
          className="mt-1"
          aria-label="Opacity"
        />
      </Section>
    </aside>
  );
}

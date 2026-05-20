"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useDrawStore } from "@/lib/store";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import Toolbar from "@/components/toolbar/Toolbar";
import PropertiesPanel from "@/components/panels/PropertiesPanel";
import BottomBar from "@/components/panels/BottomBar";

// Canvas uses browser APIs — SSR disabled (per react perf guidelines: dynamic() for heavy components)
const Canvas = dynamic(() => import("@/components/canvas/Canvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 animate-pulse bg-gray-100 dark:bg-zinc-900" />
  ),
});

export default function DrawPage() {
  useKeyboardShortcuts();
  const { appState } = useDrawStore();

  // Sync dark class with store theme (drives Tailwind dark: variants)
  useEffect(() => {
    const root = document.documentElement;
    if (appState.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [appState.theme]);

  return (
    <main
      className="relative h-screen w-screen overflow-hidden select-none"
      style={{ background: appState.viewBackgroundColor }}
    >
      <Canvas />
      <Toolbar />
      <PropertiesPanel />
      <BottomBar />
    </main>
  );
}

"use client";
import dynamic from "next/dynamic";

// Excalidraw uses browser-only APIs — must be client-side only
const ExcalidrawApp = dynamic(
  () => import("@/components/ExcalidrawApp"),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: "100vh", width: "100vw", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#aaa", fontSize: 14 }}>Loading…</span>
      </div>
    ),
  }
);

export default function Page() {
  return (
    <main style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      <ExcalidrawApp />
    </main>
  );
}

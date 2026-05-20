import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Draw",
  description: "Collaborative hand-drawn style whiteboard — powered by Excalidraw.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

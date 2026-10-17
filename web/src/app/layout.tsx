import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders({ variable: "--font-display", subsets: ["latin"], weight: ["600", "800"] });
const sans = Hanken_Grotesk({ variable: "--font-body", subsets: ["latin"] });
const mono = Spline_Sans_Mono({ variable: "--font-readout", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Open Higgsfield — Reshoot",
  description:
    "Put a virtual camera anywhere around your subject, preview the move, and shoot it. Open-weights models on ComfyUI.",
};

export const viewport: Viewport = { themeColor: "#0c0d0e", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}

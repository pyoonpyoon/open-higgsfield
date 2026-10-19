import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "Open Higgsfield — Cinema Studio & Angles",
  description:
    "Re-shoot any photo from any angle and add cinematic camera moves. Open-weight models on ComfyUI.",
};

export const viewport: Viewport = { themeColor: "#131416", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable} ${grotesk.variable} h-full`}>
      <body className="h-full">{children}</body>
    </html>
  );
}

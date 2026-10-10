// src/app/layout.tsx
import React from "react";
import type { Metadata } from "next";
import { Cinzel, Alegreya_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ScriptExecutor } from "@/components/ScriptExecutor";
import { DevToolsHandler } from "@/components/DevToolsHandler";
import { GlobalErrorCatcher } from "@/components/GlobalErrorCatcher";
import { TemporalLinkBanner } from "@/components/TemporalLinkBanner";
import { DownloadProjectButton } from "@/components/DownloadProjectButton";
import { Toaster } from "sonner";

const display = Cinzel({ variable: "--font-display", subsets: ["latin"], weight: ["500", "700", "900"] });
const body = Alegreya_Sans({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "700", "800"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shadowhorn Dark Fantasy — Faucet RPG",
  description:
    "Lucha contra monstruos, conquista territorios, únete a hermandades y gana monedas SHC con el faucet y anuncios PTC en Shadowhorn Dark Fantasy.",
};

// SUPER IMPORTANT: NOT EDIT THE FOLLOWING 2 LINES TO FORCE NEXT.JS TO RENDER DYNAMICALLY
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`${display.variable} ${body.variable} ${geistMono.variable} font-sans antialiased`}>
        <GlobalErrorCatcher />
        <ScriptExecutor />
        <DevToolsHandler />
        {/* Development-preview only banner. Kept outside the page wrapper so it never covers content. */}
        <TemporalLinkBanner />
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">{children}</main>
        </div>
        <DownloadProjectButton />
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          toastOptions={{ style: { fontFamily: "var(--font-body)", border: "1px solid rgba(224,168,79,0.3)" } }}
        />
      </body>
    </html>
  );
}

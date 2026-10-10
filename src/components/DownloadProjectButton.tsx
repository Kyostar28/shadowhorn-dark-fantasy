"use client";

import { Download } from "lucide-react";

/** Floating bottom-left button to download the whole project as a ZIP (generated on every build). */
export function DownloadProjectButton() {
  return (
    <a
      href="/shadowhorn-project.zip"
      download="shadowhorn-dark-fantasy.zip"
      onClick={() => console.log("[ZIP] Descargando proyecto completo")}
      className="group fixed bottom-4 left-4 z-[70] flex items-center gap-2 rounded-full border border-[#fde7b0]/70 bg-gradient-to-b from-[#f6d48e] via-[#d39a3e] to-[#9a6a22] py-2.5 pl-3 pr-4 text-sm font-bold text-[#2a1a06] shadow-[0_0_0_1px_rgba(0,0,0,.6),0_10px_30px_-8px_rgba(224,168,79,.8)] transition-all hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0a84f]"
      aria-label="Descargar todo el proyecto en ZIP"
      title="Descargar todo el proyecto (ZIP)"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/80 text-[#f6d48e] transition-transform group-hover:scale-110">
        <Download className="h-4 w-4" />
      </span>
      <span className="hidden sm:inline">Descargar proyecto ZIP</span>
      <span className="sm:hidden">ZIP</span>
    </a>
  );
}

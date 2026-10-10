import type { ReactNode } from "react";
import Link from "next/link";
import { files } from "../../../assets/files";
import { Embers } from "./Embers";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <img src={files.heroBanner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0810]/70 via-[#0b0810]/85 to-[#0b0810]" />
      <Embers />
      <div className="rise-in relative w-full max-w-md">
        <Link href="/" className="mb-6 block text-center">
          <span className="font-display text-3xl font-black gold-gradient-text">SHADOWHORN</span>
          <span className="block text-xs uppercase tracking-[0.4em] text-white/50">Dark Fantasy</span>
        </Link>
        <div className="panel p-7">
          <h1 className="font-display text-2xl font-black text-[#fde7b0]">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

export function PageTitle({ kicker, title, subtitle, right }: { kicker?: string; title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rise-in">
      <div>
        {kicker && <p className="mb-1 text-xs font-bold uppercase tracking-[0.3em] text-[#e0a84f]/80">{kicker}</p>}
        <h1 className="font-display text-3xl font-black gold-gradient-text sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-base text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

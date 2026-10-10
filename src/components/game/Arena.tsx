"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { StatBar } from "./StatBar";
import { cn } from "@/lib/utils";

export interface Fighter {
  name: string;
  hp: number;
  maxHp: number;
  image?: string;
  subtitle?: string;
  isBoss?: boolean;
  accent?: string;
}

export interface Pop {
  id: number;
  side: "left" | "right";
  text: string;
  color: string;
}

/** Hook managing arena animations (lunges, hit shakes, damage popups). */
export function useArenaFx() {
  const [leftAnim, setLeftAnim] = useState("");
  const [rightAnim, setRightAnim] = useState("");
  const [pops, setPops] = useState<Pop[]>([]);
  const idRef = useRef(0);

  const pop = useCallback((side: "left" | "right", text: string, color: string) => {
    const id = ++idRef.current;
    setPops((p) => [...p, { id, side, text, color }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1100);
  }, []);

  /** Attacker on `from` side hits the other side. */
  const strike = useCallback(
    (from: "left" | "right", dmg?: number, crit?: boolean, heal?: number) => {
      const target = from === "left" ? "right" : "left";
      if (from === "left") setLeftAnim("lunge-right");
      else setRightAnim("lunge-left");
      setTimeout(() => {
        if (dmg) {
          if (target === "right") setRightAnim("hit-shake");
          else setLeftAnim("hit-shake");
          pop(target, `${crit ? "¡" : "-"}${dmg}${crit ? "!" : ""}`, crit ? "#fde047" : "#f87171");
        }
        if (heal) pop(from, `+${heal}`, "#4ade80");
      }, 200);
      setTimeout(() => {
        setLeftAnim("");
        setRightAnim("");
      }, 650);
    },
    [pop]
  );

  return { leftAnim, rightAnim, pops, strike, pop };
}

function FighterView({ f, side, anim, pops }: { f: Fighter; side: "left" | "right"; anim: string; pops: Pop[] }) {
  const dead = f.hp <= 0;
  return (
    <div className="relative flex w-[42%] max-w-[260px] flex-col items-center">
      <div className="mb-3 w-full">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <p className="truncate font-display text-sm font-bold text-white sm:text-base">
            {f.isBoss && <span className="mr-1 text-[#f97316]">☠</span>}
            {f.name}
          </p>
          {f.subtitle && <span className="shrink-0 text-[11px] text-white/60">{f.subtitle}</span>}
        </div>
        <StatBar value={f.hp} max={f.maxHp} color={side === "left" ? "linear-gradient(90deg,#14532d,#16a34a,#4ade80)" : "linear-gradient(90deg,#7f1d1d,#dc2626,#f87171)"} />
      </div>
      <div className="relative w-full" style={{ perspective: 800 }}>
        {pops.filter((p) => p.side === side).map((p) => (
          <span key={p.id} className="dmg-pop" style={{ color: p.color }}>{p.text}</span>
        ))}
        <div className={cn("float-idle", dead && "opacity-30 grayscale transition-all duration-700")} style={{ ["--ry" as any]: side === "left" ? "14deg" : "-14deg" }}>
          <div className={cn("relative", anim)}>
            <div
              className={cn("aspect-square overflow-hidden rounded-2xl border-2 shadow-2xl", f.isBoss ? "border-[#f97316]" : "border-[#e0a84f]/50")}
              style={{ boxShadow: `0 30px 60px -20px rgba(0,0,0,.9), 0 0 40px -10px ${f.accent || (side === "left" ? "#3b82f6" : "#dc2626")}` }}
            >
              {f.image ? (
                <img src={f.image} alt={f.name} className={cn("h-full w-full object-cover", side === "left" && "scale-x-[-1]")} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-black/60 text-6xl">🛡️</div>
              )}
            </div>
          </div>
        </div>
        {/* ground shadow */}
        <div className="mx-auto mt-3 h-4 w-3/4 rounded-[100%] bg-black/70 blur-md" />
      </div>
    </div>
  );
}

export function ArenaStage({
  left,
  right,
  leftAnim,
  rightAnim,
  pops,
  background,
  children,
}: {
  left: Fighter;
  right: Fighter;
  leftAnim: string;
  rightAnim: string;
  pops: Pop[];
  background?: string;
  children?: ReactNode;
}) {
  return (
    <div className="panel relative overflow-hidden" style={{ perspective: 900 }}>
      {background && <img src={background} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 blur-[2px]" />}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(193,39,45,.25),transparent_65%)]" />
      <div className="arena-floor" />
      <div className="relative flex items-end justify-between gap-2 px-4 pb-6 pt-6 sm:px-10">
        <FighterView f={left} side="left" anim={leftAnim} pops={pops} />
        <div className="mb-24 font-display text-3xl font-black text-[#e0a84f]/70 sm:text-5xl">VS</div>
        <FighterView f={right} side="right" anim={rightAnim} pops={pops} />
      </div>
      {children}
    </div>
  );
}

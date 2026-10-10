"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useHero } from "@/components/game/HeroProvider";
import { PageTitle } from "@/components/game/PageTitle";
import { Loader2, Flame, MapPin, MonitorPlay } from "lucide-react";

interface FaucetInfo {
  history: { _id: string; amount: number; streak: number; claimed_at: string }[];
  territoryBonus: number;
  streak: number;
  baseMin: number;
  baseMax: number;
  readyAt: number;
}

export default function FaucetPage() {
  const { refresh } = useHero();
  const [info, setInfo] = useState<FaucetInfo | null>(null);
  const [now, setNow] = useState(Date.now());
  const [claiming, setClaiming] = useState(false);
  const [lastWin, setLastWin] = useState<number | null>(null);

  const load = useCallback(async () => {
    const r = await api.get<FaucetInfo>("/api/faucet");
    if (r.ok && r.data) setInfo(r.data);
    else console.error("[FAUCET] load", r.error);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [load]);

  const remaining = info ? Math.max(0, info.readyAt - now) : 0;
  const ready = info && remaining === 0;
  const pct = info?.readyAt ? 100 - (remaining / (60 * 60 * 1000)) * 100 : 100;

  const claim = async () => {
    setClaiming(true);
    const r = await api.post<{ amount: number; streak: number }>("/api/faucet", {});
    setClaiming(false);
    if (!r.ok || !r.data) {
      toast.error(String(r.error));
      return;
    }
    setLastWin(r.data.amount);
    toast.success(`¡Has reclamado ${r.data.amount} SHC! Racha x${r.data.streak}`);
    await Promise.all([load(), refresh()]);
  };

  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);

  return (
    <div>
      <PageTitle kicker="Fuente de las Almas" title="Faucet de Shadowhorn" subtitle="Reclama Shadowhorn Coins (SHC) gratis cada hora. Mantén tu racha y conquista territorios para multiplicar tus ganancias." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="panel relative flex flex-col items-center overflow-hidden p-8 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(139,92,246,.25),transparent_60%)]" />
          {/* Orb */}
          <div className="relative my-4 h-56 w-56">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="4" />
              <circle
                cx="50" cy="50" r="46" fill="none" stroke="url(#g)" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 289} 289`} style={{ transition: "stroke-dasharray 1s linear" }}
              />
              <defs>
                <linearGradient id="g" x1="0" x2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <div
              className={`absolute inset-6 flex flex-col items-center justify-center rounded-full border border-[#8b5cf6]/40 bg-[radial-gradient(circle_at_35%_30%,#c4b5fd_0%,#6d28d9_35%,#1e1035_75%)] shadow-[0_0_60px_-10px_#8b5cf6] ${ready ? "float-idle glow-pulse" : ""}`}
            >
              {ready ? (
                <>
                  <span className="text-5xl">💎</span>
                  <span className="mt-1 font-display text-sm font-bold text-white">¡LISTO!</span>
                </>
              ) : (
                <>
                  <span className="font-display text-4xl font-black text-white">
                    {mm}:{String(ss).padStart(2, "0")}
                  </span>
                  <span className="text-xs text-white/70">para el próximo reclamo</span>
                </>
              )}
            </div>
          </div>
          {lastWin !== null && <p className="mb-2 font-display text-2xl font-black text-[#c4b5fd] rise-in">+{lastWin} SHC</p>}
          <p className="text-muted-foreground">
            Recompensa estimada: <span className="font-bold text-[#c4b5fd]">{info?.baseMin ?? "…"}–{info?.baseMax ?? "…"} SHC</span>
          </p>
          <button
            onClick={claim}
            disabled={!ready || claiming}
            className="btn-gold mt-6 flex items-center gap-2 rounded-md px-10 py-3.5 font-display text-lg"
          >
            {claiming && <Loader2 className="h-5 w-5 animate-spin" />}
            {ready ? "Reclamar SHC" : "Recargando…"}
          </button>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h3 className="mb-3 font-display font-bold text-[#fde7b0]">Multiplicadores</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Flame className="h-4 w-4 text-orange-400" /> Racha actual</span>
                <span className="font-bold text-orange-300">x{info?.streak ?? 0} (+{((info?.streak || 0) * 3)}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#e0a84f]" /> Bonus territorial</span>
                <span className="font-bold text-[#e0a84f]">+{info?.territoryBonus ?? 0}%</span>
              </div>
              <p className="text-xs text-muted-foreground">Reclama antes de 3 h tras la recarga para mantener la racha (máx. x10). Cada territorio que controle tu facción suma su bonus.</p>
            </div>
          </div>
          <Link href="/game/ptc" className="panel flex items-center gap-3 p-4 transition-colors hover:border-[#facc15]/60">
            <MonitorPlay className="h-6 w-6 text-[#facc15]" />
            <div>
              <p className="font-display font-bold text-[#fde7b0]">¿Quieres más SHC?</p>
              <p className="text-xs text-muted-foreground">Mira anuncios PTC mientras esperas.</p>
            </div>
          </Link>
          <div className="panel p-5">
            <h3 className="mb-3 font-display font-bold text-[#fde7b0]">Últimos reclamos</h3>
            {!info?.history.length ? (
              <p className="text-sm text-muted-foreground">Todavía no has reclamado.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {info.history.map((h) => (
                  <li key={h._id} className="flex justify-between">
                    <span className="text-muted-foreground">{new Date(h.claimed_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span>
                    <span className="font-bold text-[#c4b5fd]">+{h.amount} SHC <span className="text-xs text-orange-300">x{h.streak}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

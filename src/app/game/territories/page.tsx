"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useHero } from "@/components/game/HeroProvider";
import { PageTitle } from "@/components/game/PageTitle";
import { ENERGY_COST, FACTIONS, formatNumber } from "@/lib/game/constants";
import type { Faction, LogEntry, Territory } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { Loader2, Zap } from "lucide-react";

interface SiegeResult {
  won: boolean;
  captured: boolean;
  influence: number;
  rewards: { xp: number; gold: number; coins: number };
  levelUp: number | null;
  log: LogEntry[];
  guardian: { name: string; hp: number; maxHp: number };
  enemyFaction?: string;
}

export default function TerritoriesPage() {
  const { hero, refresh } = useHero();
  const [data, setData] = useState<{ territories: Territory[]; factions: Faction[] } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sieging, setSieging] = useState(false);
  const [result, setResult] = useState<SiegeResult | null>(null);

  const load = useCallback(async () => {
    const r = await api.get<{ territories: Territory[]; factions: Faction[] }>("/api/territories");
    if (r.ok && r.data) {
      setData(r.data);
      setSelected((s) => s || r.data!.territories[0]?._id || null);
    } else toast.error(String(r.error));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const siege = async (t: Territory) => {
    setSieging(true);
    setResult(null);
    console.log("[SIEGE] attacking", t.name);
    const r = await api.post<SiegeResult>("/api/territories", { territoryId: t._id });
    setSieging(false);
    if (!r.ok || !r.data) {
      toast.error(String(r.error));
      return;
    }
    setResult(r.data);
    if (r.data.captured) toast.success(`¡${t.name} ha sido conquistado para tu facción!`);
    else if (r.data.won) toast.success(`Asedio victorioso: +${r.data.influence} influencia`);
    else toast.error("El guardián ha resistido tu asedio");
    await Promise.all([refresh(), load()]);
  };

  const myFaction = hero?.faction && typeof hero.faction === "object" ? (hero.faction as Faction) : null;
  const sel = data?.territories.find((t) => t._id === selected);
  const ctrlOf = (t: Territory) => (t.controlling_faction && typeof t.controlling_faction === "object" ? (t.controlling_faction as Faction) : null);

  return (
    <div className="space-y-6">
      <PageTitle
        kicker="Guerra de facciones"
        title="Conquista de territorios"
        subtitle="Asedia territorios para aumentar la influencia de tu facción. Controlar territorios aumenta las recompensas del faucet de todos sus miembros."
      />
      {!data ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#e0a84f]" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.factions.map((f) => {
              const meta = FACTIONS[f.slug];
              const owned = data.territories.filter((t) => ctrlOf(t)?._id === f._id).length;
              return (
                <div key={f._id} className="panel flex items-center gap-4 p-4" style={{ borderColor: `${meta.color}66`, boxShadow: `inset 0 0 40px -20px ${meta.color}` }}>
                  <span className="text-4xl">{meta.sigil}</span>
                  <div className="flex-1">
                    <p className="font-display text-lg font-bold" style={{ color: meta.color }}>{f.name}{myFaction?._id === f._id && <span className="ml-2 text-xs text-white/60">(tu facción)</span>}</p>
                    <p className="text-sm text-white/60">{owned} territorios · Puntuación de guerra {formatNumber(f.war_score)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Map */}
            <div className="panel relative aspect-[4/3] overflow-hidden" style={{ perspective: 1000 }}>
              <div
                className="absolute inset-4 rounded-xl"
                style={{
                  transform: "rotateX(28deg)",
                  transformOrigin: "50% 60%",
                  background:
                    "radial-gradient(circle at 30% 40%, #2b2238 0%, transparent 45%), radial-gradient(circle at 70% 60%, #2d1a1a 0%, transparent 45%), linear-gradient(135deg,#17131f,#0d0a12)",
                  boxShadow: "inset 0 0 80px rgba(0,0,0,.8), 0 40px 60px -30px #000",
                  border: "1px solid rgba(224,168,79,.25)",
                }}
              >
                <svg className="absolute inset-0 h-full w-full opacity-20" preserveAspectRatio="none">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0a84f" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
                {data.territories.map((t) => {
                  const c = ctrlOf(t);
                  const color = c ? FACTIONS[c.slug].color : "#a3a3a3";
                  const active = t._id === selected;
                  return (
                    <button
                      key={t._id}
                      onClick={() => setSelected(t._id)}
                      className="group absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${t.map_x}%`, top: `${t.map_y}%` }}
                    >
                      <span
                        className={cn("flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg transition-transform group-hover:scale-125 sm:h-12 sm:w-12", active && "scale-125 glow-pulse")}
                        style={{ borderColor: color, background: `${color}33`, boxShadow: `0 0 24px ${color}aa, 0 8px 12px #000` }}
                      >
                        {c ? FACTIONS[c.slug].sigil : "🏰"}
                      </span>
                      <span className="mt-1 block whitespace-nowrap rounded bg-black/70 px-1.5 text-[10px] font-semibold text-white/90 sm:text-xs">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail */}
            {sel && (
              <div className="panel h-fit p-5">
                {(() => {
                  const c = ctrlOf(sel);
                  const total = Math.max(1, sel.alliance_influence + sel.horde_influence);
                  return (
                    <>
                      <p className="text-xs uppercase tracking-widest text-white/50">Nivel {sel.level} · +{sel.coin_bonus}% faucet</p>
                      <h3 className="font-display text-2xl font-black text-[#fde7b0]">{sel.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{sel.description}</p>
                      <p className="mt-3 text-sm">
                        Controlado por:{" "}
                        <span className="font-bold" style={{ color: c ? FACTIONS[c.slug].color : "#a3a3a3" }}>{c ? c.name : "Nadie (neutral)"}</span>
                      </p>
                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs">
                          <span style={{ color: FACTIONS.alliance.color }}>🦁 {sel.alliance_influence}</span>
                          <span style={{ color: FACTIONS.horde.color }}>{sel.horde_influence} 🐺</span>
                        </div>
                        <div className="flex h-3 overflow-hidden rounded-full bg-black/60">
                          <div style={{ width: `${(sel.alliance_influence / total) * 100}%`, background: FACTIONS.alliance.color }} className="transition-all duration-700" />
                          <div style={{ width: `${(sel.horde_influence / total) * 100}%`, background: FACTIONS.horde.color }} className="transition-all duration-700" />
                        </div>
                      </div>
                      <button onClick={() => siege(sel)} disabled={sieging} className="btn-forge mt-5 flex w-full items-center justify-center gap-2 rounded-md py-3 font-display font-bold">
                        {sieging ? <Loader2 className="h-4 w-4 animate-spin" /> : "🔥"} Asediar
                        <span className="flex items-center text-sm opacity-80"><Zap className="h-4 w-4" />{ENERGY_COST.siege}</span>
                      </button>
                      {result && (
                        <div className="rise-in mt-4 rounded-lg border border-white/10 bg-black/40 p-3 text-sm">
                          <p className={cn("font-display text-lg font-bold", result.won ? "text-green-400" : "text-red-400")}>
                            {result.captured ? "🏴 ¡TERRITORIO CONQUISTADO!" : result.won ? "Asedio victorioso" : "Asedio fallido"}
                          </p>
                          {result.won && <p className="text-white/70">+{result.influence} influencia · +{result.rewards.xp} XP · +{result.rewards.gold} oro · +{result.rewards.coins} SHC</p>}
                          {result.levelUp && <p className="text-[#fde047]">⬆ ¡Nivel {result.levelUp}!</p>}
                          <div className="scrollbar-thin mt-2 max-h-36 space-y-0.5 overflow-y-auto text-xs text-white/60">
                            {result.log.map((l, i) => (
                              <p key={i} className={l.actor === "hero" ? "text-green-300/80" : l.actor === "enemy" ? "text-red-300/80" : ""}>{l.text}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

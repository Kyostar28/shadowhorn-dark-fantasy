"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useHero } from "@/components/game/HeroProvider";
import { PageTitle } from "@/components/game/PageTitle";
import { ArenaStage, useArenaFx } from "@/components/game/Arena";
import { raceImage } from "@/components/game/assets";
import { CLASSES, ENERGY_COST, FACTIONS, RACES, formatNumber, type ClassId, type RaceId } from "@/lib/game/constants";
import type { Faction, Hero, HeroStats, LogEntry } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { Loader2, Swords, Zap } from "lucide-react";

type Opp = Hero & { stats: HeroStats };
interface PvpInfo {
  opponents: Opp[];
  history: { _id: string; status: string; opponent?: Hero; createdAt?: string; xp_earned?: number; gold_earned?: number }[];
  myStats: HeroStats;
}
interface Side { name: string; hp: number; maxHp: number; race: string; cls: string; level: number }
interface FightResult {
  won: boolean;
  ratingDelta: number;
  rewards: { xp: number; gold: number; coins: number };
  levelUp: number | null;
  hero: Side;
  enemy: Side;
  log: LogEntry[];
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function PvpPage() {
  const { hero, refresh } = useHero();
  const [info, setInfo] = useState<PvpInfo | null>(null);
  const [fighting, setFighting] = useState<string | null>(null);
  const [replay, setReplay] = useState<{ hero: Side; enemy: Side; log: LogEntry[]; done: boolean; result: FightResult } | null>(null);
  const fx = useArenaFx();

  const load = useCallback(async () => {
    const r = await api.get<PvpInfo>("/api/pvp");
    if (r.ok && r.data) setInfo(r.data);
    else toast.error(String(r.error));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const fight = async (o: Opp) => {
    if (!hero) return;
    setFighting(o._id);
    console.log("[PVP] challenge", o.name);
    const r = await api.post<FightResult>("/api/pvp", { opponentId: o._id });
    if (!r.ok || !r.data) {
      toast.error(String(r.error));
      setFighting(null);
      return;
    }
    const res = r.data;
    const h = { ...res.hero, hp: res.hero.maxHp };
    const e = { ...res.enemy, hp: res.enemy.maxHp };
    setReplay({ hero: { ...h }, enemy: { ...e }, log: [], done: false, result: res });
    window.scrollTo({ top: 0, behavior: "smooth" });
    await wait(600);
    const log: LogEntry[] = [];
    for (const entry of res.log) {
      log.push(entry);
      if (entry.actor === "hero") {
        if (entry.dmg) e.hp = Math.max(0, e.hp - entry.dmg);
        if (entry.heal) h.hp = Math.min(h.maxHp, h.hp + entry.heal);
        fx.strike("left", entry.dmg, entry.crit, entry.heal);
      } else if (entry.actor === "enemy") {
        if (entry.dmg) h.hp = Math.max(0, h.hp - entry.dmg);
        if (entry.heal) e.hp = Math.min(e.maxHp, e.hp + entry.heal);
        fx.strike("right", entry.dmg, entry.crit, entry.heal);
      }
      setReplay({ hero: { ...h }, enemy: { ...e }, log: [...log], done: false, result: res });
      await wait(520);
    }
    setReplay({ hero: { ...res.hero }, enemy: { ...res.enemy }, log: [...log], done: true, result: res });
    if (res.won) toast.success(`¡Victoria! +${res.ratingDelta} de rating`);
    else toast.error(`Derrota (${res.ratingDelta} de rating)`);
    setFighting(null);
    await Promise.all([refresh(), load()]);
  };

  const myFaction = hero?.faction && typeof hero.faction === "object" ? (hero.faction as Faction) : null;

  return (
    <div className="space-y-6">
      <PageTitle
        kicker="Arena de gladiadores"
        title="Combate PvP"
        subtitle="Desafía a otros héroes en duelos automáticos. Gana rating Elo, oro y SHC. Vencer a la facción rival da más gloria."
        right={
          <div className="flex gap-3">
            <div className="panel px-4 py-2 text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/50">Rating</p>
              <p className="font-display text-xl font-black text-[#fde7b0]">{formatNumber(hero?.pvp_rating)}</p>
            </div>
            <div className="panel px-4 py-2 text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/50">V / D</p>
              <p className="font-display text-xl font-black"><span className="text-green-400">{hero?.wins || 0}</span> / <span className="text-red-400">{hero?.losses || 0}</span></p>
            </div>
          </div>
        }
      />

      {replay && hero && (
        <ArenaStage
          left={{ name: replay.hero.name, hp: replay.hero.hp, maxHp: replay.hero.maxHp, image: raceImage(replay.hero.race), subtitle: `Nv. ${replay.hero.level} ${CLASSES[replay.hero.cls as ClassId]?.icon || ""}` }}
          right={{ name: replay.enemy.name, hp: replay.enemy.hp, maxHp: replay.enemy.maxHp, image: raceImage(replay.enemy.race), subtitle: `Nv. ${replay.enemy.level} ${CLASSES[replay.enemy.cls as ClassId]?.icon || ""}` }}
          leftAnim={fx.leftAnim}
          rightAnim={fx.rightAnim}
          pops={fx.pops}
        >
          <div className="relative border-t border-white/10 bg-black/50 px-4 py-3">
            {replay.done ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={cn("font-display text-3xl font-black", replay.result.won ? "gold-gradient-text" : "text-red-500")}>{replay.result.won ? "¡VICTORIA!" : "DERROTA"}</p>
                  <p className="text-sm text-white/70">
                    Rating {replay.result.ratingDelta >= 0 ? "+" : ""}{replay.result.ratingDelta} · +{replay.result.rewards.xp} XP · +{replay.result.rewards.gold} oro · +{replay.result.rewards.coins} SHC
                    {replay.result.levelUp && <span className="ml-2 text-[#fde047]">⬆ Nivel {replay.result.levelUp}</span>}
                  </p>
                </div>
                <button onClick={() => setReplay(null)} className="btn-gold rounded-md px-4 py-2 font-display text-sm font-bold">Cerrar</button>
              </div>
            ) : (
              <p className="truncate text-sm text-[#fde7b0]">{replay.log[replay.log.length - 1]?.text || "¡Que comience el duelo!"}</p>
            )}
          </div>
        </ArenaStage>
      )}

      {!info ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#e0a84f]" /></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="mb-3 font-display text-lg text-[#e0a84f]">Rivales disponibles</h2>
            {info.opponents.length === 0 && <p className="panel p-6 text-center text-muted-foreground">No hay rivales en tu rango de nivel ahora mismo.</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {info.opponents.map((o) => {
                const fac = typeof o.faction === "object" ? (o.faction as Faction) : null;
                const enemyFaction = myFaction && fac && fac._id !== myFaction._id;
                const fColor = fac ? FACTIONS[fac.slug]?.color : "#888";
                const powerDiff = o.stats.power - info.myStats.power;
                return (
                  <div key={o._id} className="panel flex gap-3 p-3 transition hover:-translate-y-0.5" style={{ borderColor: `${fColor}55` }}>
                    <img src={raceImage(o.race)} alt={o.name} className="h-20 w-20 shrink-0 rounded-lg object-cover" style={{ boxShadow: `0 0 0 2px ${fColor}` }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-display font-bold text-white">{o.name}</p>
                        {enemyFaction && <span className="rounded bg-red-600/20 px-1.5 text-[10px] font-bold uppercase text-red-300">Enemigo</span>}
                      </div>
                      <p className="text-xs text-white/60">
                        Nv. {o.level} · {RACES[o.race as RaceId]?.name} {CLASSES[o.hero_class as ClassId]?.icon} {CLASSES[o.hero_class as ClassId]?.name}
                      </p>
                      <p className="mt-1 text-xs">
                        <span className="text-[#fde7b0]">🏆 {o.pvp_rating}</span>
                        <span className={cn("ml-2", powerDiff > 20 ? "text-red-400" : powerDiff < -20 ? "text-green-400" : "text-yellow-300")}>⚡ Poder {o.stats.power}</span>
                      </p>
                      <button onClick={() => fight(o)} disabled={!!fighting} className="btn-forge mt-2 flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold">
                        {fighting === o._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Swords className="h-3 w-3" />} Desafiar
                        <span className="ml-1 flex items-center opacity-80"><Zap className="h-3 w-3" />{ENERGY_COST.pvp}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="panel h-fit p-4">
            <h2 className="mb-3 font-display text-lg text-[#e0a84f]">Historial de duelos</h2>
            {info.history.length === 0 && <p className="text-sm text-muted-foreground">Aún no has luchado en la arena.</p>}
            <div className="space-y-2">
              {info.history.map((b) => (
                <div key={b._id} className="flex items-center justify-between rounded border border-white/5 bg-black/30 px-3 py-2 text-sm">
                  <span className="truncate">vs {b.opponent?.name || "Desconocido"}</span>
                  <span className={b.status === "won" ? "text-green-400" : "text-red-400"}>{b.status === "won" ? "Victoria" : "Derrota"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

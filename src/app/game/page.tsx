"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useHero } from "@/components/game/HeroProvider";
import { TiltCard } from "@/components/game/TiltCard";
import { StatBar } from "@/components/game/StatBar";
import { raceImage } from "@/components/game/assets";
import { CLASSES, FACTIONS, RACES, formatNumber } from "@/lib/game/constants";
import { Castle, Crosshair, Droplets, Map, MonitorPlay, ScrollText, Shield, Swords, Trophy } from "lucide-react";

type HistoryItem = { _id: string; battle_type: string; status: string; enemyName?: string; xp_earned?: number; gold_earned?: number; coins_earned?: number; createdAt?: string; opponent?: any; territory?: any };

const TYPE_LABEL: Record<string, string> = { pve: "Cacería", dungeon: "Mazmorra", pvp: "Arena", siege: "Asedio" };
const STATUS: Record<string, { label: string; color: string }> = {
  won: { label: "Victoria", color: "#22c55e" },
  lost: { label: "Derrota", color: "#ef4444" },
  fled: { label: "Huida", color: "#9ca3af" },
  active: { label: "En curso", color: "#eab308" },
};

export default function CampPage() {
  const { hero } = useHero();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [active, setActive] = useState<HistoryItem | null>(null);
  const [territories, setTerritories] = useState<any[]>([]);

  useEffect(() => {
    api.get<{ active: HistoryItem | null; history: HistoryItem[] }>("/api/battle").then((r) => {
      if (r.ok && r.data) {
        setHistory(r.data.history);
        setActive(r.data.active);
      } else console.error("[CAMP] battles", r.error);
    });
    api.get<{ territories: any[] }>("/api/territories").then((r) => r.ok && r.data && setTerritories(r.data.territories));
  }, []);

  if (!hero) return null;
  const race = RACES[hero.race];
  const faction = FACTIONS[race.faction];
  const cls = CLASSES[hero.hero_class];
  const faucetReady = !hero.faucetReadyAt || hero.faucetReadyAt <= Date.now();
  const myTerritories = territories.filter((t) => t.controlling_faction?.slug === race.faction).length;

  const actions = [
    { href: "/game/faucet", icon: Droplets, title: "Faucet", desc: faucetReady ? "¡Listo para reclamar!" : "Recargándose…", hot: faucetReady, color: "#22d3ee" },
    { href: "/game/battle", icon: Swords, title: "Cacería PvE", desc: "Combates por turnos", color: "#22c55e" },
    { href: "/game/dungeons", icon: Castle, title: "Mazmorras", desc: "Oleadas y jefes", color: "#a855f7" },
    { href: "/game/pvp", icon: Crosshair, title: "Arena PvP", desc: `Rating ${hero.pvp_rating}`, color: "#ef4444" },
    { href: "/game/territories", icon: Map, title: "Territorios", desc: `${myTerritories} bajo tu facción`, color: "#f97316" },
    { href: "/game/quests", icon: ScrollText, title: "Misiones", desc: "Recompensas diarias", color: "#e0a84f" },
    { href: "/game/ptc", icon: MonitorPlay, title: "Anuncios PTC", desc: "Gana SHC mirando", color: "#facc15" },
    { href: "/game/guilds", icon: Shield, title: "Hermandad", desc: typeof hero.guild === "object" && hero.guild ? hero.guild.name : "Sin hermandad", color: "#3b82f6" },
  ];

  return (
    <div className="space-y-8">
      {active && (
        <Link href={`/game/battle/${active._id}`} className="panel flex items-center justify-between gap-4 border-[#eab308]/50 p-4 glow-pulse">
          <span className="font-display font-bold text-[#fde047]">⚔️ Tienes un combate en curso contra {active.enemyName}</span>
          <span className="btn-gold rounded-md px-4 py-1.5 text-sm">Continuar</span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Hero card */}
        <TiltCard className="panel overflow-hidden rise-in" max={8}>
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[0.7rem]">
            <img src={raceImage(hero.race)} alt={hero.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a12] via-transparent to-transparent" />
            <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: `${faction.color}cc` }}>
              {faction.sigil} {faction.name}
            </span>
            <div className="tilt-pop absolute bottom-3 left-4 right-4">
              <p className="font-display text-3xl font-black text-white drop-shadow-lg">{hero.name}</p>
              <p className="text-sm font-semibold text-[#f6d48e]">
                Nivel {hero.level} · {race.name} <span style={{ color: cls.color }}>{cls.icon} {cls.name}</span>
              </p>
            </div>
          </div>
          <div className="space-y-3 p-4">
            <StatBar value={hero.xp} max={hero.xpNext} color="linear-gradient(90deg,#5b21b6,#8b5cf6,#c4b5fd)" label="XP" />
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ["❤️", hero.stats.maxHp, "Vida"],
                ["⚔️", hero.stats.atk, "Ataque"],
                ["🛡️", hero.stats.def, "Defensa"],
                ["💥", hero.stats.power, "Poder"],
              ].map(([i, v, l]) => (
                <div key={l as string} className="rounded-md border border-white/5 bg-black/30 py-2">
                  <p className="text-lg">{i}</p>
                  <p className="font-display text-lg font-bold text-[#fde7b0]">{v}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>🏆 {hero.wins}V / {hero.losses}D</span>
              <span>💀 {formatNumber(hero.monsters_slain)} monstruos</span>
            </div>
          </div>
        </TiltCard>

        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#e0a84f]/80">Campamento</p>
            <h1 className="font-display text-3xl font-black gold-gradient-text sm:text-4xl">Bienvenido, {hero.name}</h1>
            <p className="mt-1 text-muted-foreground">{faction.motto}. Las sombras avanzan: reclama, lucha y conquista.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {actions.map((a, i) => (
              <Link
                key={a.href}
                href={a.href}
                className="panel group relative overflow-hidden p-4 transition-all hover:-translate-y-1 rise-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-50" style={{ background: a.color }} />
                <a.icon className="h-6 w-6" style={{ color: a.color }} />
                <p className="mt-3 font-display font-bold text-[#fde7b0]">{a.title}</p>
                <p className={`text-xs ${a.hot ? "font-bold text-[#67e8f9]" : "text-muted-foreground"}`}>{a.desc}</p>
                {a.hot && <span className="absolute right-3 top-3 h-2.5 w-2.5 animate-ping rounded-full bg-[#22d3ee]" />}
              </Link>
            ))}
          </div>

          <div className="panel p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#fde7b0]">Crónicas de batalla</h2>
              <Link href="/game/leaderboard" className="flex items-center gap-1 text-sm text-[#e0a84f] hover:underline">
                <Trophy className="h-4 w-4" /> Clasificación
              </Link>
            </div>
            {history.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">Aún no has combatido. ¡Ve de cacería y escribe tu leyenda!</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {history.slice(0, 8).map((b) => {
                  const st = STATUS[b.status] || STATUS.active;
                  const target = b.enemyName || b.opponent?.name || b.territory?.name || "—";
                  return (
                    <li key={b._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="w-20 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">{TYPE_LABEL[b.battle_type]}</span>
                      <span className="min-w-0 flex-1 truncate">{target}</span>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        +{b.xp_earned || 0} XP · +{b.gold_earned || 0} 🪙 · +{b.coins_earned || 0} SHC
                      </span>
                      <span className="w-20 text-right font-bold" style={{ color: st.color }}>{st.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

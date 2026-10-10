"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useHero } from "@/components/game/HeroProvider";
import { PageTitle } from "@/components/game/PageTitle";
import { raceImage } from "@/components/game/assets";
import { CLASSES, FACTIONS, formatNumber, type ClassId } from "@/lib/game/constants";
import type { Faction, Guild, Hero } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Board {
  byLevel: Hero[];
  byPvp: Hero[];
  byCoins: Hero[];
  factions: (Faction & { _count?: { territory?: number } })[];
  guilds: Guild[];
}

const TABS = [
  { key: "byLevel", label: "Nivel", value: (h: Hero) => `Nv. ${h.level}` },
  { key: "byPvp", label: "PvP", value: (h: Hero) => `🏆 ${h.pvp_rating}` },
  { key: "byCoins", label: "Shadowcoins", value: (h: Hero) => `${formatNumber(h.coins)} SHC` },
] as const;

export default function LeaderboardPage() {
  const { hero } = useHero();
  const [data, setData] = useState<Board | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("byLevel");

  useEffect(() => {
    api.get<Board>("/api/leaderboard").then((r) => {
      if (r.ok && r.data) setData(r.data);
      else toast.error(String(r.error));
    });
  }, []);

  const t = TABS.find((x) => x.key === tab)!;
  const list = data ? data[tab] : [];
  const medal = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6">
      <PageTitle kicker="Salón de la fama" title="Clasificación" subtitle="Los héroes, hermandades y facciones más poderosos de Shadowhorn." />
      {!data ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#e0a84f]" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.factions.map((f, i) => {
              const m = FACTIONS[f.slug];
              return (
                <div key={f._id} className="panel flex items-center gap-4 p-5" style={{ borderColor: `${m.color}66`, boxShadow: `inset 0 0 50px -25px ${m.color}` }}>
                  <span className="text-5xl">{m.sigil}</span>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-widest text-white/50">{i === 0 ? "Dominando la guerra" : "Contraatacando"}</p>
                    <p className="font-display text-xl font-black" style={{ color: m.color }}>{f.name}</p>
                    <p className="text-sm text-white/70">{formatNumber(f.war_score)} puntos · {f._count?.territory ?? 0} territorios</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="panel p-4">
              <div className="mb-4 flex gap-2">
                {TABS.map((x) => (
                  <button key={x.key} onClick={() => setTab(x.key)} className={cn("rounded-md px-4 py-2 font-display text-sm", tab === x.key ? "btn-gold" : "border border-white/10 text-white/60")}>{x.label}</button>
                ))}
              </div>
              <div className="space-y-1.5">
                {list.map((h, i) => {
                  const f = typeof h.faction === "object" ? (h.faction as Faction) : null;
                  const me = h._id === hero?._id;
                  return (
                    <div key={h._id} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2", me ? "border-[#e0a84f]/60 bg-[#e0a84f]/10" : "border-white/5 bg-black/30")}>
                      <span className="w-8 text-center font-display font-bold text-white/60">{medal[i] || i + 1}</span>
                      <img src={raceImage(h.race)} alt="" className="h-9 w-9 rounded-full object-cover" style={{ boxShadow: `0 0 0 2px ${f ? FACTIONS[f.slug].color : "#666"}` }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{h.name}{me && <span className="ml-1 text-xs text-[#e0a84f]">(tú)</span>}</p>
                        <p className="text-xs text-white/50">{CLASSES[h.hero_class as ClassId]?.icon} {CLASSES[h.hero_class as ClassId]?.name} · {h.wins || 0}V/{h.losses || 0}D</p>
                      </div>
                      <span className="font-display text-sm font-bold text-[#fde7b0]">{t.value(h)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="panel h-fit p-4">
              <h2 className="mb-3 font-display text-lg text-[#e0a84f]">Top hermandades</h2>
              <div className="space-y-2">
                {data.guilds.map((g, i) => {
                  const f = typeof g.faction === "object" ? (g.faction as Faction) : null;
                  return (
                    <div key={g._id} className="flex items-center gap-3 rounded border border-white/5 bg-black/30 px-3 py-2">
                      <span className="w-5 text-sm text-white/50">{i + 1}</span>
                      <span className="text-2xl">{g.emblem || "⚔️"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">&lt;{g.tag}&gt; {g.name}</p>
                        <p className="text-xs" style={{ color: f ? FACTIONS[f.slug].color : undefined }}>Nv. {g.level || 1} · {g._count?.hero ?? 0} miembros</p>
                      </div>
                      <span className="text-xs text-[#f6d48e]">💰 {formatNumber(g.treasury)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

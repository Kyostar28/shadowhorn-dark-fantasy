"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useHero } from "@/components/game/HeroProvider";
import { PageTitle } from "@/components/game/PageTitle";
import { TiltCard } from "@/components/game/TiltCard";
import type { Monster } from "@/lib/game/types";
import { ENERGY_COST } from "@/lib/game/constants";
import { Loader2, Zap } from "lucide-react";

export default function HuntPage() {
  const { hero, refresh } = useHero();
  const router = useRouter();
  const [monsters, setMonsters] = useState<Monster[] | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    api.get<Monster[]>("/api/monsters").then((r) => {
      if (r.ok) setMonsters(r.data || []);
      else toast.error(String(r.error));
    });
  }, []);

  const fight = async (m: Monster) => {
    setStarting(m._id);
    const r = await api.post<{ battleId: string; resumed: boolean }>("/api/battle", { type: "pve", monsterId: m._id });
    if (!r.ok || !r.data) {
      toast.error(String(r.error));
      setStarting(null);
      return;
    }
    if (r.data.resumed) toast.info("Tienes un combate pendiente. ¡Termínalo primero!");
    await refresh();
    router.push(`/game/battle/${r.data.battleId}`);
  };

  return (
    <div>
      <PageTitle
        kicker="Tierras salvajes"
        title="Cacería PvE"
        subtitle="Combates por turnos contra las criaturas de Shadowhorn. Cada victoria otorga XP, oro, SHC y la posibilidad de botín."
        right={<span className="flex items-center gap-1 rounded-full border border-[#22d3ee]/30 bg-black/40 px-3 py-1 text-sm text-[#67e8f9]"><Zap className="h-4 w-4" /> {ENERGY_COST.pve} energía por combate</span>}
      />
      {!monsters ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#e0a84f]" /></div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {monsters.map((m, i) => {
            const tooStrong = hero ? m.level > hero.level + 5 : false;
            const diff = hero ? m.level - hero.level : 0;
            const diffColor = diff >= 3 ? "#ef4444" : diff >= 1 ? "#f59e0b" : "#22c55e";
            return (
              <div key={m._id} className="rise-in" style={{ animationDelay: `${i * 60}ms` }}>
                <TiltCard className="panel overflow-hidden" max={7}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-t-[0.7rem]">
                    {m.image?.url && <img src={m.image.url} alt={m.name} className="h-full w-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#120e18] via-transparent to-transparent" />
                    <span className="tilt-pop absolute right-3 top-3 rounded-md bg-black/70 px-2 py-1 font-display text-sm font-bold" style={{ color: diffColor }}>
                      Nv. {m.level}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-lg font-bold text-[#fde7b0]">{m.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
                    <div className="mt-3 flex gap-3 text-sm">
                      <span>❤️ {m.hp}</span><span>⚔️ {m.attack}</span><span>🛡️ {m.defense}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-[#8b5cf6]/15 px-2 py-0.5 text-[#c4b5fd]">+{m.xp_reward} XP</span>
                      <span className="rounded bg-[#e0a84f]/15 px-2 py-0.5 text-[#f6d48e]">+{m.gold_reward} oro</span>
                      <span className="rounded bg-[#22d3ee]/15 px-2 py-0.5 text-[#67e8f9]">+{m.coin_reward} SHC</span>
                    </div>
                    <button
                      onClick={() => fight(m)}
                      disabled={!!starting || tooStrong}
                      className="btn-forge mt-4 flex w-full items-center justify-center gap-2 rounded-md py-2.5 font-display font-bold"
                    >
                      {starting === m._id ? <Loader2 className="h-4 w-4 animate-spin" /> : "⚔️"}
                      {tooStrong ? "Demasiado poderoso" : "Luchar"}
                    </button>
                  </div>
                </TiltCard>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

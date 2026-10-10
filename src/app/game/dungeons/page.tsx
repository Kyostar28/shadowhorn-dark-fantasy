"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useHero } from "@/components/game/HeroProvider";
import { PageTitle } from "@/components/game/PageTitle";
import { TiltCard } from "@/components/game/TiltCard";
import type { Dungeon } from "@/lib/game/types";
import { Loader2, Lock, Zap } from "lucide-react";

export default function DungeonsPage() {
  const { hero, refresh } = useHero();
  const router = useRouter();
  const [dungeons, setDungeons] = useState<Dungeon[] | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    api.get<Dungeon[]>("/api/dungeons").then((r) => {
      if (r.ok) setDungeons(r.data || []);
      else toast.error(String(r.error));
    });
  }, []);

  const enter = async (d: Dungeon) => {
    setStarting(d._id);
    console.log("[DUNGEON] entering", d.name);
    const r = await api.post<{ battleId: string; resumed: boolean }>("/api/battle", { type: "dungeon", dungeonId: d._id });
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
        kicker="Profundidades"
        title="Mazmorras"
        subtitle="Supera oleadas de enemigos y derrota al jefe final. Las recompensas se multiplican y los jefes siempre sueltan botín raro o superior."
      />
      {!dungeons ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#e0a84f]" /></div>
      ) : (
        <div className="space-y-6">
          {dungeons.map((d, i) => {
            const locked = (hero?.level || 1) < d.min_level;
            const monsters = d.monster || [];
            return (
              <div key={d._id} className="rise-in" style={{ animationDelay: `${i * 80}ms` }}>
                <TiltCard className="panel overflow-hidden" max={4}>
                  <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <div className="relative min-h-[220px] overflow-hidden">
                      {d.image?.url && <img src={d.image.url} alt={d.name} className={`absolute inset-0 h-full w-full object-cover ${locked ? "grayscale" : ""}`} />}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#120e18] max-md:bg-gradient-to-t" />
                      <div className="tilt-pop absolute left-4 top-4 rounded-md bg-black/70 px-3 py-1 font-display text-sm text-[#fde7b0]">x{d.reward_multiplier} recompensas</div>
                      {locked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                          <Lock className="h-10 w-10 text-white/70" />
                          <p className="mt-2 font-display text-white/80">Requiere nivel {d.min_level}</p>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-2xl font-black text-[#fde7b0]">{d.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {monsters.map((m, idx) => (
                          <div key={m._id} className={`flex items-center gap-2 rounded-lg border bg-black/40 p-1.5 pr-3 ${m.is_boss === "yes" ? "border-[#f97316]/60" : "border-white/10"}`}>
                            {m.image?.url ? <img src={m.image.url} alt={m.name} className="h-10 w-10 rounded object-cover" /> : <span className="text-xl">👹</span>}
                            <div className="leading-tight">
                              <p className="text-[10px] uppercase tracking-wider text-white/50">{m.is_boss === "yes" ? "Jefe" : `Oleada ${idx + 1}`}</p>
                              <p className="text-sm font-semibold">{m.name}</p>
                              <p className="text-[11px] text-white/50">Nv. {m.level} · ❤️ {m.hp}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button onClick={() => enter(d)} disabled={locked || !!starting} className="btn-forge flex items-center gap-2 rounded-md px-6 py-2.5 font-display font-bold">
                          {starting === d._id ? <Loader2 className="h-4 w-4 animate-spin" /> : "🗝️"} Entrar
                        </button>
                        <span className="flex items-center gap-1 text-sm text-[#67e8f9]"><Zap className="h-4 w-4" /> {d.energy_cost} energía</span>
                        <span className="text-sm text-white/50">Nivel mínimo {d.min_level}</span>
                      </div>
                    </div>
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

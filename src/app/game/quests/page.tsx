"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useHero } from "@/components/game/HeroProvider";
import { PageTitle } from "@/components/game/PageTitle";
import { StatBar } from "@/components/game/StatBar";
import { QUEST_OBJECTIVES } from "@/lib/game/constants";
import type { Quest } from "@/lib/game/types";
import { CheckCircle2, Loader2 } from "lucide-react";

type Q = Quest & { heroQuestId: string | null; progress: number; status: "in_progress" | "completed" | "claimed" };

export default function QuestsPage() {
  const { refresh } = useHero();
  const [quests, setQuests] = useState<Q[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api.get<Q[]>("/api/quests");
    if (r.ok) setQuests(r.data || []);
    else toast.error(String(r.error));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const claim = async (q: Q) => {
    if (!q.heroQuestId) return;
    setBusy(q._id);
    console.log("[QUESTS] claim", q.title);
    const r = await api.post<{ rewards: { xp: number; gold: number; coins: number }; levelUp: number | null }>("/api/quests", { heroQuestId: q.heroQuestId });
    setBusy(null);
    if (!r.ok || !r.data) {
      toast.error(String(r.error));
      return;
    }
    toast.success(`Recompensa: +${r.data.rewards.xp} XP, +${r.data.rewards.gold} oro, +${r.data.rewards.coins} SHC${r.data.levelUp ? ` · ¡Nivel ${r.data.levelUp}!` : ""}`);
    await Promise.all([load(), refresh()]);
  };

  const done = (quests || []).filter((q) => q.status === "claimed").length;

  return (
    <div>
      <PageTitle
        kicker="Tablón de encargos"
        title="Misiones diarias"
        subtitle="Las misiones se renuevan cada día (UTC). Complétalas jugando y reclama sus recompensas."
        right={quests && <span className="panel px-4 py-2 font-display text-[#fde7b0]">{done}/{quests.length} completadas</span>}
      />
      {!quests ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#e0a84f]" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {quests.map((q, i) => {
            const obj = QUEST_OBJECTIVES[q.objective];
            const claimed = q.status === "claimed";
            const ready = q.status === "completed";
            return (
              <div key={q._id} className={`panel rise-in p-5 ${ready ? "glow-pulse" : ""} ${claimed ? "opacity-60" : ""}`} style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#e0a84f]/80">{obj?.label}</p>
                    <h3 className="font-display text-lg font-bold text-[#fde7b0]">{q.title}</h3>
                  </div>
                  {claimed && <CheckCircle2 className="h-6 w-6 shrink-0 text-green-400" />}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{q.description}</p>
                <StatBar className="mt-3" value={q.progress} max={q.target_count} color="linear-gradient(90deg,#7c2d12,#e0a84f)" label="Progreso" showText />
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-[#8b5cf6]/15 px-2 py-0.5 text-[#c4b5fd]">+{q.reward_xp} XP</span>
                  <span className="rounded bg-[#e0a84f]/15 px-2 py-0.5 text-[#f6d48e]">+{q.reward_gold} oro</span>
                  <span className="rounded bg-[#22d3ee]/15 px-2 py-0.5 text-[#67e8f9]">+{q.reward_coins} SHC</span>
                  <div className="ml-auto">
                    {ready ? (
                      <button disabled={!!busy} onClick={() => claim(q)} className="btn-gold flex items-center gap-1 rounded px-4 py-1.5 font-bold">
                        {busy === q._id && <Loader2 className="h-3 w-3 animate-spin" />} Reclamar
                      </button>
                    ) : claimed ? (
                      <span className="text-green-400">Reclamada</span>
                    ) : (
                      obj && <Link href={obj.href} className="rounded border border-white/15 px-3 py-1.5 hover:bg-white/5">Ir →</Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

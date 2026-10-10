"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useHero } from "@/components/game/HeroProvider";
import { ArenaStage, useArenaFx } from "@/components/game/Arena";
import { raceImage } from "@/components/game/assets";
import { RarityBadge } from "@/components/game/RarityBadge";
import { CLASSES, type ClassId } from "@/lib/game/constants";
import type { BattleState, LogEntry } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface BattleInfo {
  battle: { _id: string; battle_type: string; status: "active" | "won" | "lost" | "fled"; state: BattleState };
  potions: { _id: string; name: string; icon?: string; quantity: number; heal: number }[];
  heroClass: ClassId;
  race: string;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function BattleArenaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { refresh } = useHero();
  const [info, setInfo] = useState<BattleInfo | null>(null);
  const [view, setView] = useState<BattleState | null>(null);
  const [status, setStatus] = useState<BattleInfo["battle"]["status"]>("active");
  const [busy, setBusy] = useState(false);
  const [showPotions, setShowPotions] = useState(false);
  const fx = useArenaFx();
  const logRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await api.get<BattleInfo>(`/api/battle/${id}`);
    if (!r.ok || !r.data) {
      console.error("[BATTLE] load error", r.error);
      toast.error(String(r.error));
      router.push("/game/battle");
      return;
    }
    setInfo(r.data);
    setView(r.data.battle.state);
    setStatus(r.data.battle.status);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [view?.log.length]);

  const act = async (action: string, inventoryItemId?: string) => {
    if (!view || busy) return;
    setBusy(true);
    setShowPotions(false);
    console.log("[BATTLE] action", action);
    const r = await api.post<{ status: BattleInfo["battle"]["status"]; state: BattleState }>("/api/battle/action", {
      battleId: id,
      action,
      inventoryItemId,
    });
    if (!r.ok || !r.data) {
      toast.error(String(r.error));
      setBusy(false);
      return;
    }
    const next = r.data.state;
    const newEntries: LogEntry[] = next.log.slice(view.log.length);
    // Animate each new entry over a working copy of the previous state
    let temp: BattleState = JSON.parse(JSON.stringify(view));
    for (const e of newEntries) {
      temp = { ...temp, log: [...temp.log, e], hero: { ...temp.hero }, enemy: { ...temp.enemy } };
      if (e.actor === "hero" && e.dmg) {
        temp.enemy.hp = Math.max(0, temp.enemy.hp - e.dmg);
        fx.strike("left", e.dmg, e.crit, e.heal);
        if (e.heal) temp.hero.hp = Math.min(temp.hero.maxHp, temp.hero.hp + e.heal);
      } else if (e.actor === "hero" && e.heal) {
        temp.hero.hp = Math.min(temp.hero.maxHp, temp.hero.hp + e.heal);
        fx.pop("left", `+${e.heal}`, "#4ade80");
      } else if (e.actor === "enemy" && e.dmg) {
        temp.hero.hp = Math.max(0, temp.hero.hp - e.dmg);
        fx.strike("right", e.dmg, e.crit);
      }
      setView(temp);
      await wait(e.actor === "system" ? 250 : 650);
    }
    setView(next);
    setStatus(r.data.status);
    if (r.data.status !== "active") {
      if (r.data.status === "won") toast.success("¡Victoria!");
      if (r.data.status === "lost") toast.error("Has caído en combate");
      if (r.data.status === "fled") toast.info("Has escapado");
    }
    if (action === "potion") await load();
    await refresh();
    setBusy(false);
  };

  if (!info || !view) {
    return <div className="flex justify-center py-32"><Loader2 className="h-10 w-10 animate-spin text-[#e0a84f]" /></div>;
  }

  const cls = CLASSES[info.heroClass];
  const ended = status !== "active";
  const isDungeon = info.battle.battle_type === "dungeon";
  const potionsLeft = info.potions.reduce((s, p) => s + p.quantity, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rise-in">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#e0a84f]/80">{isDungeon ? "Mazmorra" : "Cacería"} · Turno {view.turn}</p>
          <h1 className="font-display text-2xl font-black gold-gradient-text sm:text-3xl">{view.hero.name} contra {view.enemy.name}</h1>
        </div>
        {view.stages.length > 1 && (
          <div className="flex items-center gap-2">
            {view.stages.map((s, i) => (
              <div
                key={s.id + i}
                title={s.name}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold",
                  i < view.stageIndex || (ended && status === "won") ? "border-green-500/60 bg-green-500/20 text-green-300" : i === view.stageIndex ? "border-[#e0a84f] bg-[#e0a84f]/20 text-[#fde7b0] glow-pulse" : "border-white/15 bg-black/40 text-white/40"
                )}
              >
                {s.isBoss ? "☠" : i + 1}
              </div>
            ))}
          </div>
        )}
      </div>

      <ArenaStage
        left={{ name: view.hero.name, hp: view.hero.hp, maxHp: view.hero.maxHp, image: raceImage(info.race), subtitle: `Nv. ${view.hero.level} ${cls.icon}`, accent: cls.color }}
        right={{ name: view.enemy.name, hp: view.enemy.hp, maxHp: view.enemy.maxHp, image: view.enemy.image, subtitle: `Nv. ${view.enemy.level}`, isBoss: view.enemy.isBoss }}
        leftAnim={fx.leftAnim}
        rightAnim={fx.rightAnim}
        pops={fx.pops}
        background={view.enemy.image}
      >
        {ended && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="rise-in w-full max-w-md text-center">
              <p className={cn("font-display text-5xl font-black", status === "won" ? "gold-gradient-text" : "text-[#ef4444]")}>
                {status === "won" ? "¡VICTORIA!" : status === "lost" ? "DERROTA" : "HUIDA"}
              </p>
              {status === "won" && (
                <div className="mt-4 flex justify-center gap-3 text-sm">
                  <span className="rounded bg-[#8b5cf6]/20 px-3 py-1 text-[#c4b5fd]">+{view.rewards.xp} XP</span>
                  <span className="rounded bg-[#e0a84f]/20 px-3 py-1 text-[#f6d48e]">+{view.rewards.gold} oro</span>
                  <span className="rounded bg-[#22d3ee]/20 px-3 py-1 text-[#67e8f9]">+{view.rewards.coins} SHC</span>
                </div>
              )}
              {view.levelUp && <p className="mt-3 font-display text-xl text-[#fde047] glow-pulse">⬆ ¡Has subido a nivel {view.levelUp}!</p>}
              {status === "won" && view.loot.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs uppercase tracking-widest text-white/60">Botín</p>
                  {view.loot.map((l, i) => (
                    <div key={i} className="flex items-center justify-center gap-2">
                      <span className="text-2xl">{l.icon || "🎁"}</span>
                      <span className="font-semibold">{l.name}</span>
                      <RarityBadge rarity={l.rarity} />
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 flex justify-center gap-3">
                <Link href={isDungeon ? "/game/dungeons" : "/game/battle"} className="btn-forge rounded-md px-5 py-2.5 font-display font-bold">
                  {isDungeon ? "Otra mazmorra" : "Seguir cazando"}
                </Link>
                <Link href="/game" className="btn-gold rounded-md px-5 py-2.5 font-display font-bold">Campamento</Link>
              </div>
            </div>
          </div>
        )}
      </ArenaStage>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="panel p-4">
          <p className="mb-3 font-display text-sm uppercase tracking-widest text-[#e0a84f]">Acciones</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ActionBtn label="Atacar" icon="⚔️" hint="Golpe básico" disabled={busy || ended} onClick={() => act("attack")} className="btn-forge" />
            <ActionBtn
              label={cls.skill.name}
              icon={cls.icon}
              hint={view.skillCooldown > 0 ? `Enfriamiento: ${view.skillCooldown}` : cls.skill.description}
              disabled={busy || ended || view.skillCooldown > 0}
              onClick={() => act("skill")}
              className="border border-[#8b5cf6]/60 bg-gradient-to-b from-[#6d28d9] to-[#3b0764] text-white"
            />
            <ActionBtn label="Defender" icon="🛡️" hint="Reduce el daño 65%" disabled={busy || ended} onClick={() => act("defend")} className="border border-[#3b82f6]/50 bg-gradient-to-b from-[#1e3a8a] to-[#0f172a] text-white" />
            <div className="relative">
              <ActionBtn
                label="Poción"
                icon="🧪"
                hint={potionsLeft ? `${potionsLeft} disponibles` : "Sin pociones"}
                disabled={busy || ended || !potionsLeft}
                onClick={() => setShowPotions((v) => !v)}
                className="border border-green-500/50 bg-gradient-to-b from-[#166534] to-[#052e16] text-white"
              />
              {showPotions && (
                <div className="absolute bottom-full left-0 z-30 mb-2 w-60 rounded-lg border border-white/10 bg-[#120e18] p-2 shadow-2xl">
                  {info.potions.map((p) => (
                    <button key={p._id} onClick={() => act("potion", p._id)} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-white/5">
                      <span className="text-xl">{p.icon || "🧪"}</span>
                      <span className="flex-1">{p.name}</span>
                      <span className="text-xs text-green-400">+{p.heal}</span>
                      <span className="text-xs text-white/50">x{p.quantity}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ActionBtn label="Huir" icon="🏃" hint="60% de éxito" disabled={busy || ended} onClick={() => act("flee")} className="border border-white/15 bg-black/40 text-white/80" />
            <div className="flex items-center justify-center rounded-lg border border-dashed border-white/10 p-2 text-center text-xs text-muted-foreground">
              {busy ? <Loader2 className="h-5 w-5 animate-spin text-[#e0a84f]" /> : <>⚔️ {view.hero.atk} · 🛡️ {view.hero.def}<br />Multiplicador x{view.multiplier}</>}
            </div>
          </div>
        </div>

        <div className="panel flex max-h-[340px] flex-col p-4">
          <p className="mb-2 font-display text-sm uppercase tracking-widest text-[#e0a84f]">Crónica del combate</p>
          <div ref={logRef} className="scrollbar-thin flex-1 space-y-1.5 overflow-y-auto pr-1 text-sm">
            {view.log.map((e, i) => (
              <p
                key={i}
                className={cn(
                  "rounded px-2 py-1",
                  e.actor === "hero" && "bg-green-500/5 text-green-200",
                  e.actor === "enemy" && "bg-red-500/5 text-red-200",
                  e.actor === "system" && "text-[#fde7b0] italic"
                )}
              >
                {e.crit && "💥 "}
                {e.text}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ label, icon, hint, disabled, onClick, className }: { label: string; icon: string; hint: string; disabled?: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn("flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-3 transition hover:-translate-y-0.5 hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0", className)}
    >
      <span className="text-2xl">{icon}</span>
      <span className="font-display text-sm font-bold leading-tight">{label}</span>
      <span className="line-clamp-1 text-[10px] opacity-70">{hint}</span>
    </button>
  );
}

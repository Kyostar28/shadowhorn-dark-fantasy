"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useHero } from "@/components/game/HeroProvider";
import { PageTitle } from "@/components/game/PageTitle";
import { CLASSES, FACTIONS, GUILD_CREATE_COST, formatNumber, type ClassId } from "@/lib/game/constants";
import type { Faction, Guild, Hero } from "@/lib/game/types";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

const EMBLEMS = ["⚔️", "🐉", "💀", "🔥", "🌙", "🦅", "🛡️", "👑", "🐺", "🦁"];

export default function GuildsPage() {
  const { hero, refresh } = useHero();
  const [guilds, setGuilds] = useState<Guild[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", tag: "", description: "", emblem: "⚔️" });
  const [donation, setDonation] = useState("100");

  const load = useCallback(async () => {
    const r = await api.get<Guild[]>("/api/guilds");
    if (r.ok) setGuilds(r.data || []);
    else toast.error(String(r.error));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const post = async (body: Record<string, unknown>, success: string) => {
    setBusy(true);
    console.log("[GUILD]", body.action);
    const r = await api.post("/api/guilds", body);
    setBusy(false);
    if (!r.ok) {
      toast.error(String(r.error));
      return false;
    }
    toast.success(success);
    await Promise.all([refresh(), load()]);
    return true;
  };

  const myGuildId = hero?.guild ? (typeof hero.guild === "object" ? (hero.guild as Guild)._id : hero.guild) : null;
  const myFactionId = hero?.faction ? (typeof hero.faction === "object" ? (hero.faction as Faction)._id : hero.faction) : null;
  const myGuild = guilds?.find((g) => g._id === myGuildId);
  const others = (guilds || []).filter((g) => g._id !== myGuildId);
  const facOf = (g: Guild) => (typeof g.faction === "object" ? (g.faction as Faction) : null);

  return (
    <div className="space-y-6">
      <PageTitle kicker="Hermandades" title="Gremios" subtitle="Únete a una hermandad de tu facción, aporta oro a su tesoro y súbela de nivel junto a tus aliados." />
      {!guilds ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#e0a84f]" /></div>
      ) : (
        <>
          {myGuild ? (
            <div className="panel overflow-hidden p-6" style={{ boxShadow: `inset 0 0 80px -30px ${FACTIONS[facOf(myGuild)?.slug || "alliance"].color}` }}>
              <div className="flex flex-wrap items-start gap-5">
                <div className="float-idle flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-[#e0a84f]/60 bg-black/50 text-5xl shadow-2xl">{myGuild.emblem || "⚔️"}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-widest text-[#e0a84f]">Tu hermandad</p>
                  <h2 className="font-display text-3xl font-black text-[#fde7b0]">&lt;{myGuild.tag}&gt; {myGuild.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{myGuild.description}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <span>⭐ Nivel {myGuild.level || 1}</span>
                    <span>💰 Tesoro {formatNumber(myGuild.treasury)}</span>
                    <span>👥 {myGuild.hero?.length || 0} miembros</span>
                    <span>👑 {typeof myGuild.leader === "object" ? (myGuild.leader as Hero).name : "—"}</span>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-56">
                  <div className="flex gap-2">
                    <Input type="number" min={1} value={donation} onChange={(e) => setDonation(e.target.value)} className="bg-black/40" />
                    <button disabled={busy} onClick={() => post({ action: "donate", amount: Number(donation) }, `Has donado ${donation} de oro`)} className="btn-gold shrink-0 rounded-md px-3 text-sm font-bold">Donar</button>
                  </div>
                  <button disabled={busy} onClick={() => confirm("¿Seguro que quieres abandonar la hermandad?") && post({ action: "leave" }, "Has abandonado la hermandad")} className="rounded-md border border-red-500/40 py-2 text-sm text-red-300 hover:bg-red-500/10">Abandonar</button>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(myGuild.hero || []).map((m) => (
                  <div key={m._id} className="flex items-center gap-2 rounded border border-white/5 bg-black/30 px-3 py-2 text-sm">
                    <span>{CLASSES[m.hero_class as ClassId]?.icon}</span>
                    <span className="flex-1 truncate">{m.name}</span>
                    <span className="text-white/50">Nv. {m.level}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="panel p-6">
              <h2 className="font-display text-xl text-[#e0a84f]">Fundar una hermandad</h2>
              <p className="text-sm text-muted-foreground">Coste: {GUILD_CREATE_COST} de oro. Tú serás el líder.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px]">
                <Input placeholder="Nombre de la hermandad" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-black/40" />
                <Input placeholder="TAG" maxLength={4} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value.toUpperCase() })} className="bg-black/40 uppercase" />
                <Input placeholder="Descripción (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-black/40 sm:col-span-2" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {EMBLEMS.map((e) => (
                  <button key={e} onClick={() => setForm({ ...form, emblem: e })} className={`h-10 w-10 rounded-lg border text-xl ${form.emblem === e ? "border-[#e0a84f] bg-[#e0a84f]/20" : "border-white/10 bg-black/30"}`}>{e}</button>
                ))}
              </div>
              <button disabled={busy} onClick={async () => { if (await post({ action: "create", ...form }, "¡Hermandad fundada!")) setForm({ name: "", tag: "", description: "", emblem: "⚔️" }); }} className="btn-forge mt-4 rounded-md px-6 py-2.5 font-display font-bold">
                Fundar ({GUILD_CREATE_COST} oro)
              </button>
            </div>
          )}

          <div>
            <h2 className="mb-3 font-display text-lg text-[#e0a84f]">Hermandades del reino</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {others.map((g) => {
                const f = facOf(g);
                const color = f ? FACTIONS[f.slug].color : "#888";
                const canJoin = !myGuildId && f?._id === myFactionId;
                return (
                  <div key={g._id} className="panel flex gap-4 p-4 transition hover:-translate-y-0.5" style={{ borderColor: `${color}55` }}>
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border bg-black/50 text-3xl" style={{ borderColor: color }}>{g.emblem || "⚔️"}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-white">&lt;{g.tag}&gt; {g.name}</p>
                      <p className="text-xs" style={{ color }}>{f?.name}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/70">
                        <span>⭐ Nv. {g.level || 1}</span>
                        <span>👥 {g.hero?.length || 0}</span>
                        <span>💰 {formatNumber(g.treasury)}</span>
                        {canJoin && (
                          <button disabled={busy} onClick={() => post({ action: "join", guildId: g._id }, `Te has unido a ${g.name}`)} className="btn-gold ml-auto rounded px-3 py-1 text-xs font-bold">Unirse</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

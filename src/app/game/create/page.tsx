"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { CLASSES, FACTIONS, RACES, initialStats, type ClassId, type RaceId } from "@/lib/game/constants";
import { raceImage } from "@/components/game/assets";
import { TiltCard } from "@/components/game/TiltCard";
import { Embers } from "@/components/game/Embers";
import { useHero } from "@/components/game/HeroProvider";
import { cn } from "@/lib/utils";
import { Heart, Shield, Sword, Loader2 } from "lucide-react";

export default function CreateHeroPage() {
  const { refresh } = useHero();
  const [race, setRace] = useState<RaceId>("human");
  const [cls, setCls] = useState<ClassId>("warrior");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const stats = initialStats(race, cls);
  const faction = FACTIONS[RACES[race].faction];

  const create = async () => {
    setSaving(true);
    console.log("[CREATE] Creando héroe", { name, race, cls });
    const res = await api.post("/api/hero", { name, race, hero_class: cls });
    if (!res.ok) {
      toast.error(String(res.error || "No se pudo crear el héroe"));
      setSaving(false);
      return;
    }
    toast.success(`¡${name} ha despertado en Shadowhorn!`);
    await refresh();
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-28 pt-10 sm:px-8">
      <Embers count={30} />
      <div
        className="pointer-events-none absolute inset-0 opacity-40 transition-colors duration-700"
        style={{ background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${faction.color}55, transparent 70%)` }}
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-10 text-center rise-in">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#e0a84f]/80">Forja tu leyenda</p>
          <h1 className="mt-2 font-display text-4xl font-black gold-gradient-text sm:text-5xl">Crea a tu héroe</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Tu raza decide tu facción. Tu clase decide cómo luchas. Elige con sabiduría: el Señor Demonio no perdona.
          </p>
        </div>

        {/* Races */}
        <h2 className="mb-4 font-display text-xl font-bold text-[#fde7b0]">1 · Elige tu raza</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(Object.keys(RACES) as RaceId[]).map((r, i) => {
            const info = RACES[r];
            const f = FACTIONS[info.faction];
            const active = race === r;
            return (
              <button key={r} onClick={() => setRace(r)} className="rise-in text-left" style={{ animationDelay: `${i * 70}ms` }}>
                <TiltCard
                  className={cn(
                    "panel overflow-hidden transition-all",
                    active ? "ring-2 ring-[#e0a84f] glow-pulse" : "opacity-75 hover:opacity-100"
                  )}
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-t-[0.7rem]">
                    <img src={raceImage(r)} alt={info.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                    <span
                      className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{ background: `${f.color}cc` }}
                    >
                      {f.sigil} {info.faction === "alliance" ? "Alianza" : "Horda"}
                    </span>
                    <div className="tilt-pop absolute bottom-2 left-3 right-3">
                      <p className="font-display text-lg font-black text-white drop-shadow">{info.name}</p>
                      <p className="text-[11px] font-semibold text-[#f6d48e]">{info.bonusText}</p>
                    </div>
                  </div>
                </TiltCard>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm italic text-muted-foreground">{RACES[race].description}</p>

        {/* Classes */}
        <h2 className="mb-4 mt-10 font-display text-xl font-bold text-[#fde7b0]">2 · Elige tu clase</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(CLASSES) as ClassId[]).map((c) => {
            const info = CLASSES[c];
            const active = cls === c;
            return (
              <button
                key={c}
                onClick={() => setCls(c)}
                className={cn("panel p-4 text-left transition-all hover:-translate-y-0.5", active && "ring-2")}
                style={active ? { boxShadow: `0 0 0 2px ${info.color}, 0 0 30px -6px ${info.color}` } : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl" style={{ background: `${info.color}22`, border: `1px solid ${info.color}66` }}>
                    {info.icon}
                  </span>
                  <div>
                    <p className="font-display font-bold" style={{ color: info.color }}>{info.name}</p>
                    <p className="text-xs text-muted-foreground">{info.role}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-foreground/80">
                  <span className="font-bold text-[#f6d48e]">{info.skill.name}:</span> {info.skill.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Name + summary */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="panel p-6">
            <h2 className="mb-4 font-display text-xl font-bold text-[#fde7b0]">3 · Nombra a tu héroe</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="Ej: Kael'thas, Grommash, Brann…"
              className="w-full rounded-md border border-[#e0a84f]/30 bg-black/50 px-4 py-3 font-display text-xl text-[#fde7b0] outline-none placeholder:text-muted-foreground/50 focus:border-[#e0a84f] focus:ring-2 focus:ring-[#e0a84f]/30"
            />
            <p className="mt-2 text-xs text-muted-foreground">Entre 3 y 20 caracteres. Será visible en la arena y en la clasificación.</p>
            <button
              onClick={create}
              disabled={saving || name.trim().length < 3}
              className="btn-forge mt-6 flex w-full items-center justify-center gap-2 rounded-md py-3.5 font-display text-lg font-bold"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "⚔️"} Entrar en Shadowhorn
            </button>
          </div>
          <div className="panel p-6">
            <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: faction.color }}>
              {faction.sigil} {faction.name}
            </p>
            <p className="mt-1 font-display text-2xl font-black text-[#fde7b0]">{name || "Sin nombre"}</p>
            <p className="text-sm text-muted-foreground">
              {RACES[race].name} · {CLASSES[cls].name}
            </p>
            <div className="mt-5 space-y-3">
              {[
                { icon: Heart, label: "Vida", value: stats.max_hp, max: 160, color: "#ef4444" },
                { icon: Sword, label: "Ataque", value: stats.attack, max: 24, color: "#f59e0b" },
                { icon: Shield, label: "Defensa", value: stats.defense, max: 16, color: "#3b82f6" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                  <span className="w-16 text-sm">{s.label}</span>
                  <div className="h-2.5 flex-1 bar-track">
                    <div className="bar-fill" style={{ width: `${(s.value / s.max) * 100}%`, background: s.color }} />
                  </div>
                  <span className="w-10 text-right font-bold">{s.value}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs italic text-muted-foreground">“{faction.motto}”</p>
          </div>
        </div>
      </div>
    </div>
  );
}

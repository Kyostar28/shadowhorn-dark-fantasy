"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { files } from "../../assets/files";
import { Embers } from "@/components/game/Embers";
import { TiltCard } from "@/components/game/TiltCard";
import { CLASSES, FACTIONS, RACES, formatNumber, type RaceId } from "@/lib/game/constants";
import type { Faction, Territory } from "@/lib/game/types";

interface Stats {
  heroes: { _aggregate?: { _count?: number; _sum?: { monsters_slain?: number; coins?: number } } }[];
  factions: Faction[];
  territories: Territory[];
  battles: { _aggregate?: { _count?: number } }[];
  claims: { _aggregate?: { _sum?: { amount?: number } } }[];
}

const FEATURES = [
  { icon: "⚔️", title: "Combate por turnos", text: "Ataca, defiende, usa habilidades de clase y pociones contra monstruos del mundo abierto." },
  { icon: "🗝️", title: "Mazmorras", text: "Oleadas de enemigos y jefes finales con recompensas multiplicadas y botín garantizado." },
  { icon: "🏟️", title: "Arena PvP", text: "Duelos contra otros héroes con rating Elo. Sube en la clasificación y gana oro." },
  { icon: "🏰", title: "Conquista territorial", text: "Asedia territorios para tu facción. Controlarlos aumenta las recompensas del faucet." },
  { icon: "🛡️", title: "Gremios", text: "Funda o únete a hermandades, dona al tesoro y crece junto a tus aliados." },
  { icon: "⚖️", title: "Casa de subastas", text: "Compra y vende equipo épico y legendario con otros jugadores." },
  { icon: "💧", title: "Faucet horario", text: "Reclama Shadowcoins cada hora con bonus de racha y de territorios." },
  { icon: "👁", title: "Anuncios PTC", text: "Gana SHC extra viendo anuncios de patrocinadores durante unos segundos." },
];

export default function Home() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>("/api/stats").then((r) => {
      if (r.ok && r.data) setStats(r.data);
      else console.error("[LANDING] stats error", r.error);
    });
  }, []);

  const heroAgg = stats?.heroes?.[0]?._aggregate;
  const counters = [
    { label: "Héroes", value: heroAgg?._count },
    { label: "Monstruos abatidos", value: heroAgg?._sum?.monsters_slain },
    { label: "Batallas", value: stats?.battles?.[0]?._aggregate?._count },
    { label: "SHC del faucet", value: stats?.claims?.[0]?._aggregate?._sum?.amount },
  ];
  const ctrl = (t: Territory) => (t.controlling_faction && typeof t.controlling_faction === "object" ? (t.controlling_faction as Faction) : null);
  const cta = session?.user ? { href: "/game", label: "Entrar al juego" } : { href: "/register", label: "Comenzar gratis" };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#0b0810]/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="leading-none">
            <span className="font-display text-xl font-black gold-gradient-text">SHADOWHORN</span>
            <span className="block text-[9px] uppercase tracking-[0.4em] text-white/50">Dark Fantasy</span>
          </Link>
          <nav className="flex items-center gap-2">
            {session?.user ? (
              <Link href="/game" className="btn-forge rounded-md px-4 py-2 font-display text-sm font-bold">Entrar al juego</Link>
            ) : (
              <>
                <Link href="/login" className="rounded-md px-4 py-2 text-sm text-white/80 hover:text-white">Iniciar sesión</Link>
                <Link href="/register" className="btn-forge rounded-md px-4 py-2 font-display text-sm font-bold">Registrarse</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[92vh] items-center justify-center pt-16">
        <img src={files.heroBanner} alt="Shadowhorn" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0810]/40 via-[#0b0810]/60 to-[#0b0810]" />
        <Embers />
        <div className="rise-in relative mx-auto max-w-4xl px-4 text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.5em] text-[#e0a84f]">RPG · Faucet · Play to Earn</p>
          <h1 className="font-display text-5xl font-black leading-tight sm:text-7xl">
            <span className="gold-gradient-text">Shadowhorn</span>
            <span className="block text-3xl text-white/90 sm:text-4xl">Dark Fantasy</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Lucha contra monstruos, conquista territorios para tu facción, completa misiones y gana <b className="text-[#67e8f9]">Shadowcoins</b> con el faucet y los anuncios PTC.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={cta.href} className="btn-forge glow-pulse rounded-md px-8 py-3.5 font-display text-lg font-bold">{cta.label}</Link>
            <a href="#features" className="btn-gold rounded-md px-8 py-3.5 font-display text-lg font-bold">Descubrir</a>
          </div>
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {counters.map((c) => (
              <div key={c.label} className="panel px-3 py-3">
                <p className="font-display text-2xl font-black text-[#fde7b0]">{stats ? formatNumber(c.value) : "—"}</p>
                <p className="text-[11px] uppercase tracking-wider text-white/50">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center font-display text-4xl font-black gold-gradient-text">Un reino entero por conquistar</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <TiltCard key={f.title} className="panel h-full p-5" max={10}>
              <div className="rise-in" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="tilt-pop inline-block text-4xl">{f.icon}</span>
                <h3 className="mt-3 font-display text-lg font-bold text-[#fde7b0]">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* Races */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-center font-display text-4xl font-black gold-gradient-text">Cinco razas, dos facciones</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">Elige tu linaje y combina con 8 clases: {Object.values(CLASSES).map((c) => c.name).join(", ")}.</p>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-5">
          {(Object.keys(RACES) as RaceId[]).map((r) => {
            const race = RACES[r];
            const fac = FACTIONS[race.faction];
            return (
              <TiltCard key={r} className="panel overflow-hidden" max={12}>
                <div className="relative aspect-[3/4]">
                  <img src={files.races[r]} alt={race.name} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0810] via-transparent" />
                  <div className="tilt-pop absolute inset-x-0 bottom-0 p-3">
                    <p className="font-display text-lg font-black text-white">{race.name}</p>
                    <p className="text-xs font-semibold" style={{ color: fac.color }}>{fac.sigil} {fac.name}</p>
                  </div>
                </div>
              </TiltCard>
            );
          })}
        </div>
      </section>

      {/* War status */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center font-display text-4xl font-black gold-gradient-text">Estado de la guerra</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {(stats?.factions || []).map((f) => {
            const m = FACTIONS[f.slug];
            const owned = (stats?.territories || []).filter((t) => ctrl(t)?._id === f._id);
            return (
              <div key={f._id} className="panel p-6" style={{ borderColor: `${m.color}66`, boxShadow: `inset 0 0 60px -30px ${m.color}` }}>
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{m.sigil}</span>
                  <div>
                    <p className="font-display text-2xl font-black" style={{ color: m.color }}>{f.name}</p>
                    <p className="text-sm italic text-white/60">«{m.motto}»</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="font-display text-3xl font-black text-[#fde7b0]">{formatNumber(f.war_score)}</p>
                    <p className="text-xs uppercase text-white/50">puntos de guerra</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {owned.map((t) => (
                    <span key={t._id} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: `${m.color}55` }}>{t.name}</span>
                  ))}
                  {!owned.length && <span className="text-sm text-white/40">Sin territorios</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-12 text-center">
          <Link href={cta.href} className="btn-forge rounded-md px-10 py-4 font-display text-xl font-bold">{cta.label}</Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 pl-4 pr-4 text-center text-sm text-white/40 sm:pl-60">
        © {new Date().getFullYear()} Shadowhorn Dark Fantasy ·{" "}
        <Link href="/privacy-policy" className="hover:text-white">Privacidad</Link> ·{" "}
        <Link href="/terms-of-service" className="hover:text-white">Términos</Link>
      </footer>
    </div>
  );
}

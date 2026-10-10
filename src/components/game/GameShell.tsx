"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Backpack, Castle, Coins, Crosshair, Droplets, Gavel, Home, LogOut, Map, Menu, MonitorPlay, ScrollText, Shield, Store, Swords, Trophy, Zap, X,
} from "lucide-react";
import { useHero } from "./HeroProvider";
import { signOut } from "@/lib/auth-client";
import { CLASSES, FACTIONS, MAX_ENERGY, RACES, formatNumber } from "@/lib/game/constants";
import { raceImage } from "./assets";
import { StatBar } from "./StatBar";
import { cn } from "@/lib/utils";
import { Embers } from "./Embers";

export const NAV = [
  { href: "/game", label: "Campamento", icon: Home },
  { href: "/game/faucet", label: "Faucet", icon: Droplets },
  { href: "/game/battle", label: "Cacería PvE", icon: Swords },
  { href: "/game/dungeons", label: "Mazmorras", icon: Castle },
  { href: "/game/pvp", label: "Arena PvP", icon: Crosshair },
  { href: "/game/territories", label: "Territorios", icon: Map },
  { href: "/game/guilds", label: "Hermandades", icon: Shield },
  { href: "/game/inventory", label: "Equipo", icon: Backpack },
  { href: "/game/shop", label: "Tienda", icon: Store },
  { href: "/game/auction", label: "Subasta", icon: Gavel },
  { href: "/game/quests", label: "Misiones", icon: ScrollText },
  { href: "/game/ptc", label: "Anuncios PTC", icon: MonitorPlay },
  { href: "/game/leaderboard", label: "Clasificación", icon: Trophy },
];

function useCountdown(ms: number, fetchedAt: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, ms - (now - fetchedAt));
}

function fmt(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = n.href === "/game" ? pathname === "/game" : pathname.startsWith(n.href);
        const Icon = n.icon;
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-[15px] font-medium transition-all",
              active
                ? "bg-gradient-to-r from-[#c1272d]/40 to-transparent text-[#fde7b0] shadow-[inset_2px_0_0_#e0a84f]"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <Icon className={cn("h-4 w-4 transition-colors", active ? "text-[#e0a84f]" : "group-hover:text-[#e0a84f]")} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function GameShell({ children }: { children: ReactNode }) {
  const { hero, loading, refresh, fetchedAt } = useHero();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const energyIn = useCountdown(hero?.nextEnergyIn || 0, fetchedAt);

  useEffect(() => {
    if (hero && hero.nextEnergyIn > 0 && energyIn === 0 && hero.energy < MAX_ENERGY) refresh();
  }, [energyIn, hero, refresh]);

  const logout = async () => {
    await signOut();
    router.push("/");
  };

  if (pathname === "/game/create") return <>{children}</>;

  if (loading || !hero) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-2 border-[#e0a84f]/20 border-t-[#e0a84f]" />
          <p className="font-display text-lg text-[#e0a84f]">Invocando a tu héroe…</p>
        </div>
      </div>
    );
  }

  const faction = FACTIONS[RACES[hero.race].faction];
  const cls = CLASSES[hero.hero_class];

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        <span className="text-2xl">😈</span>
        <span className="font-display text-lg font-black leading-none gold-gradient-text">
          Shadowhorn
          <span className="block text-[10px] font-bold tracking-[0.35em] text-[#c1272d]">DARK FANTASY</span>
        </span>
      </Link>
      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <button
        onClick={logout}
        className="mb-16 mt-4 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-[#f87171]"
      >
        <LogOut className="h-4 w-4" /> Cerrar sesión
      </button>
    </div>
  );

  return (
    <div className="relative flex min-h-screen">
      <Embers count={14} />
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-[#e0a84f]/15 bg-[#0d0a12]/90 p-4 backdrop-blur lg:block">
        {sidebar()}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-[#e0a84f]/20 bg-[#0d0a12] p-4">
            <button className="absolute right-3 top-3 text-muted-foreground" onClick={() => setOpen(false)} aria-label="Cerrar menú">
              <X className="h-5 w-5" />
            </button>
            {sidebar(() => setOpen(false))}
          </aside>
        </div>
      )}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-[#e0a84f]/15 bg-[#0d0a12]/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
            <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menú">
              <Menu className="h-6 w-6 text-[#e0a84f]" />
            </button>
            <Link href="/game" className="flex min-w-0 items-center gap-3">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2" style={{ borderColor: faction.color }}>
                <img src={raceImage(hero.race)} alt={hero.name} className="h-full w-full object-cover" />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-black text-[#e0a84f] ring-1 ring-[#e0a84f]">
                  {hero.level}
                </span>
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate font-display text-sm font-bold text-[#fde7b0]">{hero.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {RACES[hero.race].name} · <span style={{ color: cls.color }}>{cls.name}</span>
                </p>
              </div>
            </Link>
            <div className="hidden w-40 md:block">
              <StatBar value={hero.xp} max={hero.xpNext} color="linear-gradient(90deg,#5b21b6,#8b5cf6,#c4b5fd)" className="h-3" label="XP" />
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1.5 rounded-full border border-[#e0a84f]/30 bg-black/40 px-2.5 py-1 text-sm font-bold text-[#f6d48e]" title="Oro">
                <span>🪙</span>
                {formatNumber(hero.gold)}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-[#8b5cf6]/40 bg-black/40 px-2.5 py-1 text-sm font-bold text-[#c4b5fd]" title="Shadowhorn Coins (SHC)">
                <Coins className="h-3.5 w-3.5" />
                {Number(hero.coins || 0).toFixed(2)}
                <span className="hidden text-[10px] text-[#c4b5fd]/70 sm:inline">SHC</span>
              </span>
              <span
                className="flex items-center gap-1.5 rounded-full border border-[#22d3ee]/30 bg-black/40 px-2.5 py-1 text-sm font-bold text-[#67e8f9]"
                title={hero.energy < MAX_ENERGY ? `+1 en ${fmt(energyIn)}` : "Energía completa"}
              >
                <Zap className="h-3.5 w-3.5" />
                {hero.energy}/{MAX_ENERGY}
                {hero.energy < MAX_ENERGY && <span className="hidden text-[10px] font-medium text-[#67e8f9]/70 sm:inline">{fmt(energyIn)}</span>}
              </span>
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

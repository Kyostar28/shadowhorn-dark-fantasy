"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Hero, HeroStats } from "@/lib/game/types";

export type HeroView = Hero & { stats: HeroStats; xpNext: number; nextEnergyIn: number; faucetReadyAt: number };

interface Ctx {
  hero: HeroView | null;
  loading: boolean;
  refresh: () => Promise<void>;
  fetchedAt: number;
}

const HeroContext = createContext<Ctx>({ hero: null, loading: true, refresh: async () => {}, fetchedAt: 0 });

export function HeroProvider({ children }: { children: ReactNode }) {
  const [hero, setHero] = useState<HeroView | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    const res = await api.get<HeroView | null>("/api/hero");
    if (!res.ok) {
      console.error("[HERO] Error cargando héroe", res.error);
      if (String(res.error).includes("iniciar sesión")) router.replace("/login?redirect=/game");
      setLoading(false);
      return;
    }
    setHero(res.data ?? null);
    setFetchedAt(Date.now());
    setLoading(false);
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    if (!hero && pathname !== "/game/create") router.replace("/game/create");
    if (hero && pathname === "/game/create") router.replace("/game");
  }, [hero, loading, pathname, router]);

  return <HeroContext.Provider value={{ hero, loading, refresh, fetchedAt }}>{children}</HeroContext.Provider>;
}

export function useHero() {
  return useContext(HeroContext);
}

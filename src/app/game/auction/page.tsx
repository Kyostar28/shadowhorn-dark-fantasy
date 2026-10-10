"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useHero } from "@/components/game/HeroProvider";
import { PageTitle } from "@/components/game/PageTitle";
import { ItemCard } from "@/components/game/ItemCard";
import { AUCTION_FEE, RARITY, formatNumber } from "@/lib/game/constants";
import type { Auction, Hero, Item } from "@/lib/game/types";
import { Loader2 } from "lucide-react";

type A = Auction & { item: Item; seller: Hero; buyer?: Hero | null };

export default function AuctionPage() {
  const { hero, refresh } = useHero();
  const [data, setData] = useState<{ active: A[]; mine: A[]; heroId: string } | null>(null);
  const [tab, setTab] = useState<"market" | "mine">("market");
  const [rarity, setRarity] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api.get<{ active: A[]; mine: A[]; heroId: string }>("/api/auctions");
    if (r.ok && r.data) setData(r.data);
    else toast.error(String(r.error));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const post = async (action: "buy" | "cancel", a: A) => {
    setBusy(a._id);
    console.log("[AUCTION]", action, a._id);
    const r = await api.post("/api/auctions", { action, auctionId: a._id });
    setBusy(null);
    if (!r.ok) {
      toast.error(String(r.error));
      return;
    }
    toast.success(action === "buy" ? `¡Has comprado ${a.item.name}!` : "Subasta cancelada, el objeto vuelve a tu bolsa");
    await Promise.all([load(), refresh()]);
  };

  const market = (data?.active || []).filter((a) => typeof a.item === "object" && (rarity === "all" || a.item.rarity === rarity));
  const mine = (data?.mine || []).filter((a) => typeof a.item === "object");

  return (
    <div>
      <PageTitle
        kicker="Casa de subastas"
        title="Subasta de objetos"
        subtitle={`Compra y vende equipo con otros héroes. La casa cobra una comisión del ${AUCTION_FEE * 100}% al vendedor.`}
        right={<span className="panel px-4 py-2 font-display text-lg text-[#f6d48e]">💰 {formatNumber(hero?.gold)}</span>}
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button onClick={() => setTab("market")} className={`rounded-md px-4 py-2 font-display text-sm ${tab === "market" ? "btn-gold" : "border border-white/10 text-white/70"}`}>Mercado</button>
        <button onClick={() => setTab("mine")} className={`rounded-md px-4 py-2 font-display text-sm ${tab === "mine" ? "btn-gold" : "border border-white/10 text-white/70"}`}>Mis subastas</button>
        {tab === "market" && (
          <div className="ml-auto flex flex-wrap gap-1.5">
            {[["all", "Todas"], ...Object.entries(RARITY).map(([k, v]) => [k, v.label])].map(([k, v]) => (
              <button key={k} onClick={() => setRarity(k)} className={`rounded-full border px-3 py-1 text-xs ${rarity === k ? "border-[#e0a84f] bg-[#e0a84f]/15" : "border-white/10 text-white/60"}`} style={k !== "all" ? { color: RARITY[k].color } : undefined}>{v}</button>
            ))}
          </div>
        )}
      </div>
      {!data ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#e0a84f]" /></div>
      ) : tab === "market" ? (
        market.length === 0 ? (
          <p className="panel p-8 text-center text-muted-foreground">No hay subastas activas con ese filtro.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {market.map((a) => {
              const own = (typeof a.seller === "object" ? a.seller._id : a.seller) === data.heroId;
              return (
                <ItemCard key={a._id} item={a.item}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-display font-bold text-[#f6d48e]">💰 {formatNumber(a.price)}</p>
                      <p className="text-[11px] text-white/50">Vendedor: {typeof a.seller === "object" ? a.seller.name : "—"}</p>
                    </div>
                    {own ? (
                      <span className="text-xs text-white/50">Tu subasta</span>
                    ) : (
                      <button disabled={!!busy || (hero?.gold || 0) < a.price} onClick={() => post("buy", a)} className="btn-gold flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold">
                        {busy === a._id && <Loader2 className="h-3 w-3 animate-spin" />} Comprar
                      </button>
                    )}
                  </div>
                </ItemCard>
              );
            })}
          </div>
        )
      ) : mine.length === 0 ? (
        <p className="panel p-8 text-center text-muted-foreground">
          No tienes subastas. Pon objetos a la venta desde tu <Link href="/game/inventory" className="text-[#e0a84f] underline">inventario</Link>.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((a) => (
            <ItemCard key={a._id} item={a.item}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-display font-bold text-[#f6d48e]">💰 {formatNumber(a.price)}</p>
                  <p className="text-[11px]">
                    {a.status === "active" && <span className="text-yellow-300">En venta</span>}
                    {a.status === "sold" && <span className="text-green-400">Vendido{a.buyer && typeof a.buyer === "object" ? ` a ${a.buyer.name}` : ""}</span>}
                    {a.status === "cancelled" && <span className="text-white/40">Cancelada</span>}
                  </p>
                </div>
                {a.status === "active" && (
                  <button disabled={!!busy} onClick={() => post("cancel", a)} className="rounded border border-red-500/40 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10">Cancelar</button>
                )}
              </div>
            </ItemCard>
          ))}
        </div>
      )}
    </div>
  );
}

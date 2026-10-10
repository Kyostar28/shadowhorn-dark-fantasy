"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useHero } from "@/components/game/HeroProvider";
import { PageTitle } from "@/components/game/PageTitle";
import { ItemCard } from "@/components/game/ItemCard";
import { SLOTS, formatNumber } from "@/lib/game/constants";
import type { Item } from "@/lib/game/types";
import { Loader2 } from "lucide-react";

export default function ShopPage() {
  const { hero, refresh } = useHero();
  const [items, setItems] = useState<Item[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    api.get<Item[]>("/api/shop").then((r) => {
      if (r.ok) setItems(r.data || []);
      else toast.error(String(r.error));
    });
  }, []);

  const buy = async (item: Item, quantity = 1) => {
    setBuying(item._id);
    console.log("[SHOP] buy", item.name, quantity);
    const r = await api.post("/api/shop", { itemId: item._id, quantity });
    setBuying(null);
    if (!r.ok) {
      toast.error(String(r.error));
      return;
    }
    toast.success(`Has comprado ${quantity}x ${item.name}`);
    await refresh();
  };

  const shown = (items || []).filter((i) => filter === "all" || i.slot === filter);

  return (
    <div>
      <PageTitle
        kicker="Mercader errante"
        title="Tienda"
        subtitle="Equipamiento y consumibles a cambio de oro. Lo mejor del reino, sin embargo, solo se obtiene como botín."
        right={<span className="panel px-4 py-2 font-display text-lg text-[#f6d48e]">💰 {formatNumber(hero?.gold)}</span>}
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {[["all", "Todo"], ...Object.entries(SLOTS)].map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-4 py-1.5 text-sm transition ${filter === k ? "border-[#e0a84f] bg-[#e0a84f]/20 text-[#fde7b0]" : "border-white/10 text-white/60 hover:text-white"}`}>{v}</button>
        ))}
      </div>
      {!items ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#e0a84f]" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((it) => {
            const afford = (hero?.gold || 0) >= (it.shop_price || 0);
            return (
              <ItemCard key={it._id} item={it}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-display font-bold ${afford ? "text-[#f6d48e]" : "text-red-400"}`}>💰 {formatNumber(it.shop_price)}</span>
                  <div className="flex gap-2">
                    {it.slot === "consumable" && (
                      <button disabled={!!buying || (hero?.gold || 0) < (it.shop_price || 0) * 5} onClick={() => buy(it, 5)} className="rounded border border-white/15 px-2 py-1 text-xs hover:bg-white/5 disabled:opacity-40">x5</button>
                    )}
                    <button disabled={!!buying || !afford} onClick={() => buy(it)} className="btn-gold flex items-center gap-1 rounded px-3 py-1 text-xs font-bold">
                      {buying === it._id && <Loader2 className="h-3 w-3 animate-spin" />} Comprar
                    </button>
                  </div>
                </div>
              </ItemCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

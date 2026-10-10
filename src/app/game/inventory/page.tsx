"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useHero } from "@/components/game/HeroProvider";
import { PageTitle } from "@/components/game/PageTitle";
import { ItemCard, ItemStats } from "@/components/game/ItemCard";
import { RarityBadge, rarityGlow } from "@/components/game/RarityBadge";
import { raceImage } from "@/components/game/assets";
import { TiltCard } from "@/components/game/TiltCard";
import { SLOTS } from "@/lib/game/constants";
import type { HeroStats, InventoryItem, Item } from "@/lib/game/types";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type Row = InventoryItem & { item: Item };
const GEAR_SLOTS = ["helmet", "weapon", "armor", "trinket"] as const;

export default function InventoryPage() {
  const { hero, refresh } = useHero();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [stats, setStats] = useState<HeroStats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selling, setSelling] = useState<string | null>(null);
  const [price, setPrice] = useState("100");

  const load = useCallback(async () => {
    const r = await api.get<{ items: Row[]; stats: HeroStats }>("/api/inventory");
    if (!r.ok || !r.data) {
      toast.error(String(r.error));
      return;
    }
    setRows(r.data.items.filter((x) => typeof x.item === "object"));
    setStats(r.data.stats);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: "equip" | "unequip" | "use", ii: Row) => {
    setBusy(ii._id);
    console.log("[INVENTORY]", action, ii.item.name);
    const r = await api.post("/api/inventory", { action, inventoryItemId: ii._id });
    setBusy(null);
    if (!r.ok) {
      toast.error(String(r.error));
      return;
    }
    toast.success(action === "equip" ? `${ii.item.name} equipado` : action === "unequip" ? `${ii.item.name} desequipado` : `Has usado ${ii.item.name}`);
    await Promise.all([load(), refresh()]);
  };

  const list = async (ii: Row) => {
    setBusy(ii._id);
    const r = await api.post("/api/auctions", { action: "list", inventoryItemId: ii._id, price: Number(price) });
    setBusy(null);
    if (!r.ok) {
      toast.error(String(r.error));
      return;
    }
    toast.success(`${ii.item.name} puesto en subasta por ${price} oro`);
    setSelling(null);
    await Promise.all([load(), refresh()]);
  };

  const equipped = (rows || []).filter((r) => r.equipped === "yes");
  const bag = (rows || []).filter((r) => r.equipped !== "yes");

  return (
    <div className="space-y-6">
      <PageTitle kicker="Arsenal" title="Inventario y equipo" subtitle="Equipa armas y armaduras para aumentar tu poder. Vende lo que no necesites en la casa de subastas." />
      {!rows || !hero ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#e0a84f]" /></div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <TiltCard className="panel overflow-hidden" max={8}>
              <div className="relative aspect-[3/4]">
                <img src={raceImage(hero.race)} alt={hero.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#120e18] via-transparent" />
                <div className="tilt-pop absolute inset-x-0 bottom-0 p-4">
                  <p className="font-display text-2xl font-black text-[#fde7b0]">{hero.name}</p>
                  {stats && (
                    <div className="mt-2 grid grid-cols-4 gap-1 text-center text-xs">
                      <div className="rounded bg-black/60 p-1">❤️<br />{stats.maxHp}</div>
                      <div className="rounded bg-black/60 p-1">⚔️<br />{stats.atk}</div>
                      <div className="rounded bg-black/60 p-1">🛡️<br />{stats.def}</div>
                      <div className="rounded bg-black/60 p-1">⚡<br />{stats.power}</div>
                    </div>
                  )}
                </div>
              </div>
            </TiltCard>
            <div className="grid content-start gap-3 sm:grid-cols-2">
              {GEAR_SLOTS.map((slot) => {
                const ii = equipped.find((r) => r.item.slot === slot);
                return (
                  <div key={slot} className="panel flex min-h-[110px] items-center gap-3 p-3" style={ii ? rarityGlow(ii.item.rarity) : undefined}>
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/50 text-3xl">
                      {ii ? ii.item.icon : <span className="text-xs text-white/30">{SLOTS[slot]}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-widest text-[#e0a84f]/80">{SLOTS[slot]}</p>
                      {ii ? (
                        <>
                          <p className="truncate font-display text-sm font-bold">{ii.item.name}</p>
                          <RarityBadge rarity={ii.item.rarity} />
                          <ItemStats item={ii.item} />
                          <button disabled={!!busy} onClick={() => act("unequip", ii)} className="mt-1 text-xs text-red-300 hover:underline">Desequipar</button>
                        </>
                      ) : (
                        <p className="text-sm text-white/40">Vacío</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-lg text-[#e0a84f]">Bolsa ({bag.length})</h2>
            {bag.length === 0 && <p className="panel p-6 text-center text-muted-foreground">Tu bolsa está vacía. Lucha contra monstruos o visita la tienda.</p>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bag.map((ii) => (
                <ItemCard
                  key={ii._id}
                  item={ii.item}
                  badge={ii.quantity > 1 ? <span className="absolute right-2 top-2 rounded bg-black/70 px-2 text-xs font-bold">x{ii.quantity}</span> : undefined}
                >
                  {selling === ii._id ? (
                    <div className="flex gap-2">
                      <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} className="h-8 bg-black/40" />
                      <button disabled={!!busy} onClick={() => list(ii)} className="btn-gold shrink-0 rounded px-3 text-xs font-bold">Subastar</button>
                      <button onClick={() => setSelling(null)} className="text-xs text-white/50">✕</button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {ii.item.slot !== "consumable" && (
                        <button disabled={!!busy} onClick={() => act("equip", ii)} className="btn-forge rounded px-3 py-1 text-xs font-bold">
                          {busy === ii._id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Equipar"}
                        </button>
                      )}
                      {ii.item.slot === "consumable" && (ii.item.energy_amount || 0) > 0 && (
                        <button disabled={!!busy} onClick={() => act("use", ii)} className="btn-forge rounded px-3 py-1 text-xs font-bold">Usar</button>
                      )}
                      {ii.item.slot === "consumable" && (ii.item.heal_amount || 0) > 0 && <span className="self-center text-[11px] text-white/50">Úsala en combate</span>}
                      <button onClick={() => { setSelling(ii._id); setPrice(String(Math.max(10, ii.item.shop_price || 100))); }} className="ml-auto rounded border border-white/15 px-3 py-1 text-xs hover:bg-white/5">⚖️ Subastar</button>
                    </div>
                  )}
                </ItemCard>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

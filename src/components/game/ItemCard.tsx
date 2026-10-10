import type { ReactNode } from "react";
import type { Item } from "@/lib/game/types";
import { SLOTS } from "@/lib/game/constants";
import { RarityBadge, rarityGlow } from "./RarityBadge";

export function ItemStats({ item }: { item: Item }) {
  const parts: string[] = [];
  if (item.attack_bonus) parts.push(`⚔️ +${item.attack_bonus}`);
  if (item.defense_bonus) parts.push(`🛡️ +${item.defense_bonus}`);
  if (item.hp_bonus) parts.push(`❤️ +${item.hp_bonus}`);
  if (item.heal_amount) parts.push(`💚 Cura ${item.heal_amount}`);
  if (item.energy_amount) parts.push(`⚡ +${item.energy_amount} energía`);
  return <p className="text-xs text-white/80">{parts.join(" · ") || "—"}</p>;
}

export function ItemCard({ item, children, badge }: { item: Item; children?: ReactNode; badge?: ReactNode }) {
  return (
    <div className="panel relative flex flex-col p-3 transition hover:-translate-y-1" style={rarityGlow(item.rarity)}>
      {badge}
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-black/50 text-3xl">{item.icon || "🎁"}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold text-white">{item.name}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <RarityBadge rarity={item.rarity} />
            <span className="text-[10px] uppercase tracking-wider text-white/50">{SLOTS[item.slot]}</span>
          </div>
          <div className="mt-1"><ItemStats item={item} /></div>
        </div>
      </div>
      {item.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>}
      {children && <div className="mt-auto pt-3">{children}</div>}
    </div>
  );
}

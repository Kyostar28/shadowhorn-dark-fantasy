import { RARITY } from "@/lib/game/constants";

export function RarityBadge({ rarity }: { rarity: string }) {
  const r = RARITY[rarity] || RARITY.common;
  return (
    <span
      className="inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
      style={{ color: r.color, borderColor: `${r.color}66`, background: `${r.color}14` }}
    >
      {r.label}
    </span>
  );
}

export function rarityGlow(rarity: string) {
  const r = RARITY[rarity] || RARITY.common;
  return { boxShadow: `0 0 0 1px ${r.color}55, 0 0 22px -6px ${r.color}aa`, borderColor: `${r.color}77` };
}

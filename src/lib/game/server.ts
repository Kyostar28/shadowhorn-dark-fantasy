import "server-only";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { totalumSdk } from "@/lib/totalum";
import { ENERGY_REGEN_MS, FAUCET_COOLDOWN_MS, LEVEL_UP_GAINS, MAX_ENERGY, xpForLevel } from "./constants";
import type { Hero, HeroStats, InventoryItem, Item, LootDrop } from "./types";

/** Error with a user-facing message and HTTP status. */
export class GameError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function handleApiError(route: string, err: unknown) {
  if (err instanceof GameError) {
    console.warn(`[GAME] ${route}: ${err.message}`);
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
  }
  console.error(`[API ERROR] ${route}`, err);
  const message = err instanceof Error ? err.message : "Error inesperado";
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}

export function ok<T>(data: T) {
  return NextResponse.json({ ok: true, data });
}

/** Throws if the SDK returned errors. */
export function check<T>(res: { data: T; errors?: any }, ctx: string): T {
  if (res?.errors) {
    console.error(`[TOTALUM] ${ctx}`, res.errors);
    throw new Error(`${ctx}: ${res.errors.errorMessage || "error de base de datos"}`);
  }
  return res.data;
}

export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new GameError("Debes iniciar sesión", 401);
  return user;
}

/** Load the hero of a user with faction, guild and inventory (items expanded). */
export async function findHeroByUser(userId: string): Promise<Hero | null> {
  const res = await totalumSdk.crud.query("hero", {
    _filter: { user: userId },
    _limit: 1,
    faction: true,
    guild: true,
    inventory_item: { item: true, _limit: 300 },
  } as any);
  const list = check(res as any, "query hero") as Hero[];
  return list?.[0] ?? null;
}

export async function requireHero() {
  const user = await requireUser();
  const hero = await findHeroByUser(user.id);
  if (!hero) throw new GameError("Primero crea tu héroe", 404);
  return { user, hero };
}

export function equippedItems(hero: Hero): Item[] {
  return (hero.inventory_item || [])
    .filter((ii) => ii.equipped === "yes" && ii.quantity > 0 && typeof ii.item === "object")
    .map((ii) => ii.item as Item);
}

export function computeStats(hero: Hero): HeroStats {
  const eq = equippedItems(hero);
  const maxHp = hero.max_hp + eq.reduce((s, i) => s + (i.hp_bonus || 0), 0);
  const atk = hero.attack + eq.reduce((s, i) => s + (i.attack_bonus || 0), 0);
  const def = hero.defense + eq.reduce((s, i) => s + (i.defense_bonus || 0), 0);
  return { maxHp, atk, def, power: Math.round(maxHp * 0.5 + atk * 4 + def * 3) };
}

export function currentEnergy(hero: Hero, now = Date.now()) {
  const base = Number(hero.energy ?? MAX_ENERGY);
  if (base >= MAX_ENERGY) return { energy: base, updatedAt: now };
  const last = hero.energy_updated_at ? new Date(hero.energy_updated_at).getTime() : now;
  const gained = Math.floor((now - last) / ENERGY_REGEN_MS);
  const energy = Math.min(MAX_ENERGY, base + gained);
  const updatedAt = energy >= MAX_ENERGY ? now : last + gained * ENERGY_REGEN_MS;
  return { energy, updatedAt };
}

/** Returns the hero patch to spend energy, or throws when there is not enough. */
export function spendEnergyPatch(hero: Hero, cost: number) {
  const { energy, updatedAt } = currentEnergy(hero);
  if (energy < cost) throw new GameError(`Energía insuficiente (necesitas ${cost}, tienes ${energy})`);
  // If we were at max, regen starts counting from now
  const start = energy >= MAX_ENERGY ? Date.now() : updatedAt;
  return { energy: energy - cost, energy_updated_at: new Date(start).toISOString() };
}

/** Builds the hero patch after gaining xp/gold/coins, handling level ups. */
export function rewardPatch(hero: Hero, r: { xp?: number; gold?: number; coins?: number }) {
  let level = hero.level || 1;
  let xp = (hero.xp || 0) + Math.round(r.xp || 0);
  let max_hp = hero.max_hp;
  let attack = hero.attack;
  let defense = hero.defense;
  let levelsGained = 0;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    levelsGained += 1;
    max_hp += LEVEL_UP_GAINS.hp;
    attack += LEVEL_UP_GAINS.atk;
    defense += LEVEL_UP_GAINS.def;
  }
  const patch: Record<string, any> = {
    xp,
    level,
    gold: (hero.gold || 0) + Math.round(r.gold || 0),
    coins: Math.round(((hero.coins || 0) + (r.coins || 0)) * 100) / 100,
  };
  if (levelsGained) Object.assign(patch, { max_hp, attack, defense });
  if (levelsGained) console.log(`[GAME] ${hero.name} sube a nivel ${level}`);
  return { patch, levelsGained };
}

export async function updateHero(heroId: string, patch: Record<string, any>) {
  const res = await totalumSdk.crud.editRecordById("hero", heroId, patch);
  return check(res as any, "update hero") as Hero;
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Increments today's progress for all quests with the given objective. Non-critical. */
export async function progressQuest(heroId: string, objective: string, amount = 1) {
  try {
    const day = todayKey();
    const qRes = await totalumSdk.crud.query("quest", { _filter: { objective }, _limit: 50 } as any);
    const quests = check(qRes as any, "query quests") as any[];
    if (!quests.length) return;
    const hqRes = await totalumSdk.crud.query("hero_quest", {
      _filter: { hero: heroId, day_key: day, quest: { in: quests.map((q) => q._id) } },
      _limit: 50,
    } as any);
    const existing = check(hqRes as any, "query hero_quest") as any[];
    for (const q of quests) {
      const hq = existing.find((e) => (typeof e.quest === "object" ? e.quest._id : e.quest) === q._id);
      if (hq) {
        if (hq.status !== "in_progress") continue;
        const progress = Math.min(q.target_count, (hq.progress || 0) + amount);
        await totalumSdk.crud.editRecordById("hero_quest", hq._id, {
          progress,
          status: progress >= q.target_count ? "completed" : "in_progress",
        });
      } else {
        const progress = Math.min(q.target_count, amount);
        await totalumSdk.crud.createRecord("hero_quest", {
          hero: heroId,
          quest: q._id,
          day_key: day,
          progress,
          status: progress >= q.target_count ? "completed" : "in_progress",
        });
      }
    }
    console.log(`[GAME] quest progress ${objective} +${amount} for hero ${heroId}`);
  } catch (err) {
    // Quest progress is secondary to the main action — log but don't break the action
    console.error("[GAME] progressQuest failed", err);
  }
}

export async function addItemToInventory(hero: Hero, itemId: string, qty = 1) {
  const res = await totalumSdk.crud.query("inventory_item", {
    _filter: { hero: hero._id, item: itemId },
    _limit: 1,
  } as any);
  const existing = (check(res as any, "query inventory") as InventoryItem[])[0];
  if (existing) {
    await totalumSdk.crud.editRecordById("inventory_item", existing._id, { quantity: (existing.quantity || 0) + qty });
    return existing._id;
  }
  const created = await totalumSdk.crud.createRecord("inventory_item", {
    hero: hero._id,
    item: itemId,
    quantity: qty,
    equipped: "no",
  });
  return (check(created as any, "create inventory") as any)._id as string;
}

/** Removes `qty` from a stack; deletes the row when empty. */
export async function removeFromInventory(ii: InventoryItem, qty = 1) {
  const remaining = (ii.quantity || 0) - qty;
  if (remaining <= 0) {
    await totalumSdk.crud.deleteRecordById("inventory_item", ii._id);
  } else {
    await totalumSdk.crud.editRecordById("inventory_item", ii._id, { quantity: remaining });
  }
}

const RARITY_WEIGHTS: Record<string, number> = { common: 60, rare: 28, epic: 10, legendary: 2 };

/** Random loot drop. Bosses always drop and favour higher rarity. */
export async function rollLoot(isBoss: boolean, multiplier = 1): Promise<LootDrop | null> {
  const chance = isBoss ? 1 : Math.min(0.6, 0.3 * multiplier);
  if (Math.random() > chance) return null;
  const res = await totalumSdk.crud.query("item", { _limit: 200 } as any);
  const items = check(res as any, "query items") as Item[];
  if (!items.length) return null;
  const pool = isBoss ? items.filter((i) => i.rarity !== "common") : items;
  const weighted = pool.flatMap((i) => Array(RARITY_WEIGHTS[i.rarity] ?? 10).fill(i)) as Item[];
  const it = weighted[Math.floor(Math.random() * weighted.length)];
  return { itemId: it._id, name: it.name, icon: it.icon, rarity: it.rarity };
}

export function idOf(ref: any): string | null {
  if (!ref) return null;
  return typeof ref === "object" ? ref._id : ref;
}

/** Public view of a hero with derived values (stats, energy, timers). */
export function heroView(hero: Hero) {
  const stats = computeStats(hero);
  const { energy, updatedAt } = currentEnergy(hero);
  const nextEnergyIn = energy >= MAX_ENERGY ? 0 : Math.max(0, updatedAt + ENERGY_REGEN_MS - Date.now());
  const lastClaim = hero.last_faucet_claim ? new Date(hero.last_faucet_claim).getTime() : 0;
  const faucetReadyAt = lastClaim ? lastClaim + FAUCET_COOLDOWN_MS : 0;
  return {
    ...hero,
    energy,
    stats,
    xpNext: xpForLevel(hero.level || 1),
    nextEnergyIn,
    faucetReadyAt,
  };
}


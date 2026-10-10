import { totalumSdk } from "@/lib/totalum";
import { check, GameError, handleApiError, idOf, ok, progressQuest, requireHero, updateHero } from "@/lib/game/server";
import { FAUCET_COOLDOWN_MS } from "@/lib/game/constants";

const STREAK_WINDOW_MS = 3 * 60 * 60 * 1000;

async function territoryBonus(factionId: string | null) {
  if (!factionId) return 0;
  const res = await totalumSdk.crud.query("territory", { _filter: { controlling_faction: factionId }, _limit: 100 } as any);
  const list = check(res as any, "territories") as any[];
  return Math.min(50, list.reduce((s, t) => s + (t.coin_bonus || 0), 0));
}

export async function GET() {
  try {
    const { hero } = await requireHero();
    const [hRes, bonus] = await Promise.all([
      totalumSdk.crud.query("faucet_claim", { _filter: { hero: hero._id }, _sort: { claimed_at: "desc" }, _limit: 10 } as any),
      territoryBonus(idOf(hero.faction)),
    ]);
    const history = check(hRes as any, "faucet history") as any[];
    const last = history[0];
    const streak = last && Date.now() - new Date(last.claimed_at).getTime() < FAUCET_COOLDOWN_MS + STREAK_WINDOW_MS ? last.streak || 0 : 0;
    return ok({
      history,
      territoryBonus: bonus,
      streak,
      baseMin: 8 + hero.level,
      baseMax: 12 + hero.level,
      readyAt: hero.last_faucet_claim ? new Date(hero.last_faucet_claim).getTime() + FAUCET_COOLDOWN_MS : 0,
    });
  } catch (err) {
    return handleApiError("GET /api/faucet", err);
  }
}

export async function POST() {
  try {
    const { hero } = await requireHero();
    const now = Date.now();
    const last = hero.last_faucet_claim ? new Date(hero.last_faucet_claim).getTime() : 0;
    if (last && now - last < FAUCET_COOLDOWN_MS) {
      const mins = Math.ceil((FAUCET_COOLDOWN_MS - (now - last)) / 60000);
      throw new GameError(`El faucet se recarga en ${mins} min`);
    }
    const prevRes = await totalumSdk.crud.query("faucet_claim", { _filter: { hero: hero._id }, _sort: { claimed_at: "desc" }, _limit: 1 } as any);
    const prev = (check(prevRes as any, "faucet prev") as any[])[0];
    const keepStreak = prev && now - new Date(prev.claimed_at).getTime() < FAUCET_COOLDOWN_MS + STREAK_WINDOW_MS;
    const streak = Math.min(10, keepStreak ? (prev.streak || 0) + 1 : 1);
    const bonus = await territoryBonus(idOf(hero.faction));

    const base = 8 + hero.level + Math.random() * 4;
    const amount = Math.round(base * (1 + bonus / 100) * (1 + (streak - 1) * 0.03) * 100) / 100;

    await totalumSdk.crud.createRecord("faucet_claim", {
      hero: hero._id,
      amount,
      streak,
      claimed_at: new Date(now).toISOString(),
    });
    await updateHero(hero._id, {
      coins: Math.round(((hero.coins || 0) + amount) * 100) / 100,
      last_faucet_claim: new Date(now).toISOString(),
    });
    await progressQuest(hero._id, "faucet_claim");
    console.log(`[GAME] Faucet: ${hero.name} reclama ${amount} SHC (racha ${streak}, bonus ${bonus}%)`);
    return ok({ amount, streak, territoryBonus: bonus });
  } catch (err) {
    return handleApiError("POST /api/faucet", err);
  }
}

import { totalumSdk } from "@/lib/totalum";
import { check, computeStats, GameError, handleApiError, idOf, ok, progressQuest, requireHero, rewardPatch, spendEnergyPatch, updateHero } from "@/lib/game/server";
import { simulateAuto } from "@/lib/game/combat";
import { ENERGY_COST } from "@/lib/game/constants";
import type { Hero } from "@/lib/game/types";

export async function GET() {
  try {
    const { hero } = await requireHero();
    const [oppRes, histRes] = await Promise.all([
      totalumSdk.crud.query("hero", {
        _filter: { _id: { ne: hero._id }, level: { gte: Math.max(1, hero.level - 6), lte: hero.level + 6 } },
        _sort: { pvp_rating: "desc" },
        _limit: 12,
        faction: true,
        guild: true,
        inventory_item: { item: true, _filter: { equipped: "yes" } },
      } as any),
      totalumSdk.crud.query("battle", {
        _filter: { hero: hero._id, battle_type: "pvp" },
        _sort: { createdAt: "desc" },
        _limit: 8,
        opponent: true,
      } as any),
    ]);
    const opponents = (check(oppRes as any, "opponents") as Hero[]).map((o) => ({
      ...o,
      inventory_item: undefined,
      stats: computeStats(o),
    }));
    const history = (check(histRes as any, "pvp history") as any[]).map((b) => ({ ...b, state: undefined }));
    return ok({ opponents, history, myStats: computeStats(hero) });
  } catch (err) {
    return handleApiError("GET /api/pvp", err);
  }
}

export async function POST(req: Request) {
  try {
    const { hero } = await requireHero();
    const body = (await req.json().catch(() => ({}))) as { opponentId?: string };
    if (!body.opponentId || body.opponentId === hero._id) throw new GameError("Oponente inválido");
    const oRes = await totalumSdk.crud.query("hero", {
      _filter: { _id: body.opponentId },
      _limit: 1,
      inventory_item: { item: true, _filter: { equipped: "yes" } },
    } as any);
    const opp = (check(oRes as any, "opponent") as Hero[])[0];
    if (!opp) throw new GameError("Oponente no encontrado", 404);

    const energyPatch = spendEnergyPatch(hero, ENERGY_COST.pvp);
    const a = computeStats(hero);
    const b = computeStats(opp);
    const result = simulateAuto(
      { name: hero.name, hp: a.maxHp, maxHp: a.maxHp, atk: a.atk, def: a.def, level: hero.level, cls: hero.hero_class, race: hero.race },
      { name: opp.name, hp: b.maxHp, maxHp: b.maxHp, atk: b.atk, def: b.def, level: opp.level, cls: opp.hero_class, race: opp.race }
    );
    const won = result.winner === "a";
    // Elo-like rating change
    const expected = 1 / (1 + Math.pow(10, ((opp.pvp_rating || 1000) - (hero.pvp_rating || 1000)) / 400));
    const delta = Math.round(32 * ((won ? 1 : 0) - expected));
    const rewards = won
      ? { xp: 30 + opp.level * 8, gold: 25 + opp.level * 6, coins: Math.round((1 + opp.level * 0.25) * 100) / 100 }
      : { xp: 10 + opp.level * 2, gold: 0, coins: 0 };
    const { patch, levelsGained } = rewardPatch(hero, rewards);
    await updateHero(hero._id, {
      ...patch,
      ...energyPatch,
      pvp_rating: Math.max(0, (hero.pvp_rating || 1000) + delta),
      wins: (hero.wins || 0) + (won ? 1 : 0),
      losses: (hero.losses || 0) + (won ? 0 : 1),
    });
    await updateHero(opp._id, {
      pvp_rating: Math.max(0, (opp.pvp_rating || 1000) - delta),
      wins: (opp.wins || 0) + (won ? 0 : 1),
      losses: (opp.losses || 0) + (won ? 1 : 0),
    });
    const state = {
      hero: { name: hero.name, hp: result.aHp, maxHp: a.maxHp, atk: a.atk, def: a.def, level: hero.level, race: hero.race, cls: hero.hero_class },
      enemy: { name: opp.name, hp: result.bHp, maxHp: b.maxHp, atk: b.atk, def: b.def, level: opp.level, race: opp.race, cls: opp.hero_class },
      log: result.log,
    };
    await totalumSdk.crud.createRecord("battle", {
      hero: hero._id,
      opponent: opp._id,
      battle_type: "pvp",
      status: won ? "won" : "lost",
      state: JSON.stringify(state),
      gold_earned: rewards.gold,
      xp_earned: rewards.xp,
      coins_earned: rewards.coins,
    });
    await progressQuest(hero._id, "pvp_fight");
    console.log(`[GAME] PvP ${hero.name} vs ${opp.name}: ${won ? "victoria" : "derrota"} (${delta >= 0 ? "+" : ""}${delta})`);
    return ok({ won, ratingDelta: delta, rewards, levelUp: levelsGained ? patch.level : null, ...state, opponentFaction: idOf(opp.faction) });
  } catch (err) {
    return handleApiError("POST /api/pvp", err);
  }
}

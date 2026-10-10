import { totalumSdk } from "@/lib/totalum";
import { check, handleApiError, ok } from "@/lib/game/server";

export async function GET() {
  try {
    const sel = { name: true, level: true, race: true, hero_class: true, pvp_rating: true, wins: true, losses: true, monsters_slain: true, coins: true, faction: true };
    const [lvl, pvp, coins, fac, guilds] = await Promise.all([
      totalumSdk.crud.query("hero", { _sort: { level: "desc", xp: "desc" }, _limit: 20, _select: sel, faction: true, guild: true } as any),
      totalumSdk.crud.query("hero", { _sort: { pvp_rating: "desc" }, _limit: 20, _select: sel, faction: true } as any),
      totalumSdk.crud.query("hero", { _sort: { coins: "desc" }, _limit: 20, _select: sel, faction: true } as any),
      totalumSdk.crud.query("faction", { _sort: { war_score: "desc" }, territory: { _count: true, _include: false } } as any),
      totalumSdk.crud.query("guild", { _sort: { treasury: "desc" }, _limit: 10, faction: true, hero: { _count: true, _include: false } } as any),
    ]);
    return ok({
      byLevel: check(lvl as any, "lb level"),
      byPvp: check(pvp as any, "lb pvp"),
      byCoins: check(coins as any, "lb coins"),
      factions: check(fac as any, "lb factions"),
      guilds: check(guilds as any, "lb guilds"),
    });
  } catch (err) {
    return handleApiError("GET /api/leaderboard", err);
  }
}

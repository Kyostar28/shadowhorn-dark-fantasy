import { totalumSdk } from "@/lib/totalum";
import { check, handleApiError, ok } from "@/lib/game/server";

// Public stats for the landing page
export async function GET() {
  try {
    const [heroes, factions, territories, battles, claims] = await Promise.all([
      totalumSdk.crud.query("hero", { _aggregate: { _count: true, _sum: { monsters_slain: true, coins: true } } } as any),
      totalumSdk.crud.query("faction", { _sort: { war_score: "desc" } } as any),
      totalumSdk.crud.query("territory", { _sort: { level: "asc" }, controlling_faction: true } as any),
      totalumSdk.crud.query("battle", { _aggregate: { _count: true } } as any),
      totalumSdk.crud.query("faucet_claim", { _aggregate: { _sum: { amount: true } } } as any),
    ]);
    return ok({
      heroes: check(heroes as any, "hero agg"),
      factions: check(factions as any, "factions"),
      territories: check(territories as any, "territories"),
      battles: check(battles as any, "battle agg"),
      claims: check(claims as any, "claims agg"),
    });
  } catch (err) {
    return handleApiError("GET /api/stats", err);
  }
}

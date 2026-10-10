import { totalumSdk } from "@/lib/totalum";
import { check, computeStats, GameError, handleApiError, idOf, ok, progressQuest, requireHero, rewardPatch, spendEnergyPatch, updateHero } from "@/lib/game/server";
import { simulateAuto } from "@/lib/game/combat";
import { ENERGY_COST } from "@/lib/game/constants";

export async function GET() {
  try {
    const [tRes, fRes] = await Promise.all([
      totalumSdk.crud.query("territory", { _sort: { level: "asc" }, controlling_faction: true } as any),
      totalumSdk.crud.query("faction", {} as any),
    ]);
    return ok({ territories: check(tRes as any, "territories"), factions: check(fRes as any, "factions") });
  } catch (err) {
    return handleApiError("GET /api/territories", err);
  }
}

// POST: siege a territory for your faction
export async function POST(req: Request) {
  try {
    const { hero } = await requireHero();
    const body = (await req.json().catch(() => ({}))) as { territoryId?: string };
    if (!body.territoryId) throw new GameError("Territorio no indicado");
    const tRes = await totalumSdk.crud.getRecordById("territory", body.territoryId);
    const t = check(tRes as any, "territory") as any;
    if (!t) throw new GameError("Territorio no encontrado", 404);
    const fRes = await totalumSdk.crud.query("faction", {} as any);
    const factions = check(fRes as any, "factions") as any[];
    const myFaction = factions.find((f) => f._id === idOf(hero.faction));
    if (!myFaction) throw new GameError("Tu héroe no pertenece a ninguna facción");
    const enemyFaction = factions.find((f) => f._id !== myFaction._id);

    const energyPatch = spendEnergyPatch(hero, ENERGY_COST.siege);
    const s = computeStats(hero);
    const lvl = t.level || 1;
    const guardian = {
      name: `Guardia de ${t.name}`,
      hp: Math.round(60 + lvl * 32),
      maxHp: Math.round(60 + lvl * 32),
      atk: Math.round(8 + lvl * 2.4),
      def: Math.round(4 + lvl * 1.4),
      level: lvl,
    };
    const result = simulateAuto(
      { name: hero.name, hp: s.maxHp, maxHp: s.maxHp, atk: s.atk, def: s.def, level: hero.level, cls: hero.hero_class },
      guardian
    );
    const won = result.winner === "a";
    const influence = won ? 6 + Math.round(hero.level * 1.5) : 0;
    let captured = false;
    const key = myFaction.slug === "alliance" ? "alliance_influence" : "horde_influence";
    const otherKey = key === "alliance_influence" ? "horde_influence" : "alliance_influence";
    const tPatch: Record<string, any> = {};
    if (won) {
      const mine = (t[key] || 0) + influence;
      const theirs = Math.max(0, (t[otherKey] || 0) - Math.round(influence / 2));
      tPatch[key] = mine;
      tPatch[otherKey] = theirs;
      if (mine > theirs && idOf(t.controlling_faction) !== myFaction._id) {
        tPatch.controlling_faction = myFaction._id;
        captured = true;
      }
      await totalumSdk.crud.editRecordById("territory", t._id, tPatch);
      await totalumSdk.crud.editRecordById("faction", myFaction._id, { war_score: (myFaction.war_score || 0) + influence + (captured ? 100 : 0) });
    }
    const rewards = won
      ? { xp: 40 + lvl * 10, gold: 20 + lvl * 6, coins: Math.round((1 + lvl * 0.3) * 100) / 100 }
      : { xp: 8 + lvl * 2, gold: 0, coins: 0 };
    const { patch, levelsGained } = rewardPatch(hero, rewards);
    await updateHero(hero._id, { ...patch, ...energyPatch });
    await totalumSdk.crud.createRecord("battle", {
      hero: hero._id,
      territory: t._id,
      battle_type: "siege",
      status: won ? "won" : "lost",
      state: JSON.stringify({ log: result.log }),
      gold_earned: rewards.gold,
      xp_earned: rewards.xp,
      coins_earned: rewards.coins,
    });
    if (won) await progressQuest(hero._id, "siege");
    console.log(`[GAME] Asedio ${hero.name} -> ${t.name}: ${won ? "victoria" : "derrota"}${captured ? " ¡CONQUISTADO!" : ""}`);
    return ok({
      won,
      captured,
      influence,
      rewards,
      levelUp: levelsGained ? patch.level : null,
      log: result.log,
      hero: { name: hero.name, maxHp: s.maxHp, hp: result.aHp },
      guardian: { ...guardian, hp: result.bHp },
      enemyFaction: enemyFaction?.name,
    });
  } catch (err) {
    return handleApiError("POST /api/territories", err);
  }
}

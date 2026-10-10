import { totalumSdk } from "@/lib/totalum";
import { check, GameError, handleApiError, ok, requireHero, spendEnergyPatch, updateHero } from "@/lib/game/server";
import { initialState, loadMonster, monsterToStage, parseState } from "@/lib/game/battle-service";
import { ENERGY_COST } from "@/lib/game/constants";

// GET: active battle (if any) + recent history
export async function GET() {
  try {
    const { hero } = await requireHero();
    const res = await totalumSdk.crud.query("battle", {
      _filter: { hero: hero._id },
      _sort: { createdAt: "desc" },
      _limit: 15,
      monster: true,
      dungeon: true,
      opponent: true,
      territory: true,
    } as any);
    const list = (check(res as any, "battles") as any[]).map((b) => {
      const st = b.state ? parseState(b.state) : null;
      return { ...b, state: undefined, enemyName: st?.enemy?.name };
    });
    const active = list.find((b) => b.status === "active" && (b.battle_type === "pve" || b.battle_type === "dungeon")) || null;
    return ok({ active, history: list });
  } catch (err) {
    return handleApiError("GET /api/battle", err);
  }
}

// POST: start a PvE or dungeon battle
export async function POST(req: Request) {
  try {
    const { hero } = await requireHero();
    const body = (await req.json().catch(() => ({}))) as { type?: "pve" | "dungeon"; monsterId?: string; dungeonId?: string };

    // Resume any active battle instead of starting a new one
    const activeRes = await totalumSdk.crud.query("battle", {
      _filter: { hero: hero._id, status: "active", battle_type: { in: ["pve", "dungeon"] } },
      _limit: 1,
    } as any);
    const active = (check(activeRes as any, "active battle") as any[])[0];
    if (active) {
      console.log(`[GAME] ${hero.name} retoma batalla activa ${active._id}`);
      return ok({ battleId: active._id, resumed: true });
    }

    let state;
    let cost: number = ENERGY_COST.pve;
    const record: Record<string, any> = { hero: hero._id, status: "active" };

    if (body.type === "dungeon") {
      if (!body.dungeonId) throw new GameError("Mazmorra no indicada");
      const dRes = await totalumSdk.crud.query("dungeon", {
        _filter: { _id: body.dungeonId },
        _limit: 1,
        monster: { _sort: { stage: "asc" } },
      } as any);
      const dungeon = (check(dRes as any, "dungeon") as any[])[0];
      if (!dungeon) throw new GameError("Mazmorra no encontrada", 404);
      if (hero.level < dungeon.min_level) throw new GameError(`Necesitas nivel ${dungeon.min_level} para entrar`);
      const monsters = (dungeon.monster || []) as any[];
      if (!monsters.length) throw new GameError("Esta mazmorra está vacía");
      cost = dungeon.energy_cost || 5;
      state = initialState(hero, monsters.map(monsterToStage), dungeon.reward_multiplier || 1.5);
      Object.assign(record, { battle_type: "dungeon", dungeon: dungeon._id, monster: monsters[0]._id });
    } else {
      if (!body.monsterId) throw new GameError("Monstruo no indicado");
      const m = await loadMonster(body.monsterId);
      if (m.level > hero.level + 5) throw new GameError("Este monstruo es demasiado poderoso para ti (nivel +5)");
      state = initialState(hero, [monsterToStage(m)], 1);
      Object.assign(record, { battle_type: "pve", monster: m._id });
    }

    await updateHero(hero._id, spendEnergyPatch(hero, cost));
    const created = await totalumSdk.crud.createRecord("battle", { ...record, state: JSON.stringify(state) });
    const battle = check(created as any, "create battle") as any;
    console.log(`[GAME] ${hero.name} inicia batalla ${record.battle_type} (${battle._id}) contra ${state.enemy.name}`);
    return ok({ battleId: battle._id, resumed: false });
  } catch (err) {
    return handleApiError("POST /api/battle", err);
  }
}

import "server-only";
import { totalumSdk } from "@/lib/totalum";
import { check, computeStats, GameError } from "./server";
import type { BattleState, Hero, Monster, StageEnemy } from "./types";

export function parseState(raw: any): BattleState {
  if (!raw) throw new Error("Batalla sin estado");
  return typeof raw === "string" ? (JSON.parse(raw) as BattleState) : (raw as BattleState);
}

export function monsterToStage(m: Monster): StageEnemy {
  return {
    id: m._id,
    name: m.name,
    hp: m.hp,
    maxHp: m.hp,
    atk: m.attack,
    def: m.defense,
    level: m.level,
    image: m.image?.url,
    isBoss: m.is_boss === "yes",
    xp: m.xp_reward || 0,
    gold: m.gold_reward || 0,
    coins: m.coin_reward || 0,
  };
}

export function initialState(hero: Hero, stages: StageEnemy[], multiplier = 1): BattleState {
  const s = computeStats(hero);
  const first = stages[0];
  return {
    hero: { name: hero.name, hp: s.maxHp, maxHp: s.maxHp, atk: s.atk, def: s.def, level: hero.level, race: hero.race, cls: hero.hero_class },
    enemy: { ...first },
    turn: 1,
    skillCooldown: 0,
    log: [{ turn: 0, actor: "system", text: `¡${first.name} aparece${first.isBoss ? " — ¡un JEFE!" : ""}! Prepárate para luchar.` }],
    stageIndex: 0,
    stages,
    multiplier,
    rewards: { xp: 0, gold: 0, coins: 0 },
    loot: [],
  };
}

export async function getOwnedBattle(battleId: string, heroId: string) {
  const res = await totalumSdk.crud.getRecordById("battle", battleId);
  const battle = check(res as any, "get battle") as any;
  if (!battle) throw new GameError("Batalla no encontrada", 404);
  const owner = typeof battle.hero === "object" ? battle.hero?._id : battle.hero;
  if (owner !== heroId) throw new GameError("Esta batalla no te pertenece", 403);
  return { ...battle, state: parseState(battle.state) };
}

export async function loadMonster(id: string) {
  const res = await totalumSdk.crud.getRecordById("monster", id);
  const m = check(res as any, "get monster") as Monster;
  if (!m) throw new GameError("Monstruo no encontrado", 404);
  return m;
}

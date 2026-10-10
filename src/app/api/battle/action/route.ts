import { totalumSdk } from "@/lib/totalum";
import {
  addItemToInventory,
  check,
  GameError,
  handleApiError,
  ok,
  progressQuest,
  removeFromInventory,
  requireHero,
  rewardPatch,
  rollLoot,
  updateHero,
} from "@/lib/game/server";
import { getOwnedBattle } from "@/lib/game/battle-service";
import { enemyTurn, heroTurn, type PlayerAction } from "@/lib/game/combat";
import type { BattleState } from "@/lib/game/types";

export async function POST(req: Request) {
  try {
    const { hero } = await requireHero();
    const body = (await req.json().catch(() => ({}))) as { battleId?: string; action?: PlayerAction; inventoryItemId?: string };
    if (!body.battleId || !body.action) throw new GameError("Acción inválida");
    const battle = await getOwnedBattle(body.battleId, hero._id);
    if (battle.status !== "active") throw new GameError("La batalla ya terminó");
    const state: BattleState = battle.state;
    const action = body.action;
    let defending = false;

    // ---- Hero phase ----
    if (action === "flee") {
      if (Math.random() < 0.6) {
        state.log.push({ turn: state.turn, actor: "system", text: `${hero.name} huye del combate.` });
        await totalumSdk.crud.editRecordById("battle", battle._id, { status: "fled", state: JSON.stringify(state) });
        console.log(`[GAME] ${hero.name} huye de la batalla ${battle._id}`);
        return ok({ status: "fled", state });
      }
      state.log.push({ turn: state.turn, actor: "system", text: `¡${hero.name} intenta huir pero no lo consigue!` });
    } else if (action === "defend") {
      defending = true;
      state.log.push({ turn: state.turn, actor: "hero", text: `${hero.name} adopta una postura defensiva.` });
    } else if (action === "potion") {
      const ii = (hero.inventory_item || []).find((x: any) => x._id === body.inventoryItemId) as any;
      if (!ii || typeof ii.item !== "object" || !(ii.item.heal_amount > 0) || ii.quantity < 1) throw new GameError("No tienes esa poción");
      const heal = Math.min(ii.item.heal_amount, state.hero.maxHp - state.hero.hp);
      state.hero.hp += heal;
      await removeFromInventory(ii, 1);
      state.log.push({ turn: state.turn, actor: "hero", text: `${hero.name} bebe ${ii.item.name} y recupera ${heal} de vida.`, heal });
    } else if (action === "skill") {
      if (state.skillCooldown > 0) throw new GameError(`Habilidad en enfriamiento (${state.skillCooldown} turnos)`);
      heroTurn(state, "skill", hero.hero_class);
    } else {
      heroTurn(state, "attack", hero.hero_class);
    }

    let status: "active" | "won" | "lost" = "active";

    // ---- Enemy defeated? ----
    if (state.enemy.hp <= 0) {
      const stage = state.stages[state.stageIndex];
      state.rewards.xp += Math.round(stage.xp * state.multiplier);
      state.rewards.gold += Math.round(stage.gold * state.multiplier);
      state.rewards.coins = Math.round((state.rewards.coins + stage.coins * state.multiplier) * 100) / 100;
      state.log.push({ turn: state.turn, actor: "system", text: `¡${stage.name} ha sido derrotado!` });
      const drop = await rollLoot(!!stage.isBoss, state.multiplier);
      if (drop) {
        state.loot.push(drop);
        state.log.push({ turn: state.turn, actor: "system", text: `Botín obtenido: ${drop.icon || "🎁"} ${drop.name}` });
      }
      if (state.stageIndex < state.stages.length - 1) {
        state.stageIndex += 1;
        const next = state.stages[state.stageIndex];
        state.enemy = { ...next };
        state.log.push({ turn: state.turn, actor: "system", text: `Oleada ${state.stageIndex + 1}/${state.stages.length}: ¡${next.name} emerge de las sombras${next.isBoss ? " — JEFE FINAL" : ""}!` });
      } else {
        status = "won";
      }
    } else {
      // ---- Enemy phase ----
      enemyTurn(state, defending);
      if (state.hero.hp <= 0) status = "lost";
    }

    if (status === "active") {
      state.turn += 1;
      // Skill cooldown ticks down on every turn except the one where it was used
      if (state.skillCooldown > 0 && action !== "skill") state.skillCooldown -= 1;
    }

    const patch: Record<string, any> = { status, state: "" };
    if (status === "won") {
      for (const l of state.loot) await addItemToInventory(hero, l.itemId, 1);
      const kills = state.stages.length;
      const { patch: hp, levelsGained } = rewardPatch(hero, state.rewards);
      hp.monsters_slain = (hero.monsters_slain || 0) + kills;
      await updateHero(hero._id, hp);
      if (levelsGained) state.levelUp = hp.level;
      state.log.push({ turn: state.turn, actor: "system", text: `¡VICTORIA! +${state.rewards.xp} XP, +${state.rewards.gold} oro, +${state.rewards.coins} SHC.` });
      Object.assign(patch, { gold_earned: state.rewards.gold, xp_earned: state.rewards.xp, coins_earned: state.rewards.coins });
      if (battle.battle_type === "dungeon") await progressQuest(hero._id, "dungeon_clear");
      await progressQuest(hero._id, "pve_win", battle.battle_type === "dungeon" ? kills : 1);
      console.log(`[GAME] ${hero.name} gana batalla ${battle._id}`, state.rewards);
    } else if (status === "lost") {
      const consolation = Math.round(state.rewards.xp * 0.5 + 5);
      const { patch: hp } = rewardPatch(hero, { xp: consolation, gold: Math.round(state.rewards.gold * 0.5) });
      await updateHero(hero._id, hp);
      state.log.push({ turn: state.turn, actor: "system", text: `Has caído en combate... Recibes ${consolation} XP de consolación.` });
      Object.assign(patch, { xp_earned: consolation, gold_earned: Math.round(state.rewards.gold * 0.5), coins_earned: 0 });
      console.log(`[GAME] ${hero.name} pierde batalla ${battle._id}`);
    }
    // Keep log bounded
    if (state.log.length > 80) state.log = state.log.slice(-80);
    patch.state = JSON.stringify(state);
    const res = await totalumSdk.crud.editRecordById("battle", battle._id, patch);
    check(res as any, "update battle");
    return ok({ status, state });
  } catch (err) {
    return handleApiError("POST /api/battle/action", err);
  }
}

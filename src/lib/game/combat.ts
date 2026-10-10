// Pure combat engine shared by PvE, dungeons, PvP and sieges
import { CLASSES, SKILL_COOLDOWN, type ClassId } from "./constants";
import type { BattleState, Combatant, LogEntry } from "./types";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function calcDamage(atk: number, def: number, mult: number, critChance: number) {
  const crit = Math.random() < critChance;
  let dmg = atk * mult * rand(0.85, 1.15) - def * 0.5;
  if (crit) dmg *= 1.6;
  return { dmg: Math.max(1, Math.round(dmg)), crit };
}

export type PlayerAction = "attack" | "skill" | "defend" | "potion" | "flee";

/** Hero acts with a chosen action. Returns entries appended to the log. */
export function heroTurn(state: BattleState, action: "attack" | "skill", cls: ClassId): void {
  const { hero, enemy } = state;
  const c = CLASSES[cls];
  if (action === "skill") {
    const s = c.skill;
    const { dmg, crit } = calcDamage(hero.atk, enemy.def, s.mult, 0.1 + s.critBonus);
    enemy.hp = Math.max(0, enemy.hp - dmg);
    let heal = Math.round(hero.maxHp * s.healPct + dmg * s.drainPct);
    if (heal > 0) {
      heal = Math.min(heal, hero.maxHp - hero.hp);
      hero.hp += heal;
    }
    state.skillCooldown = SKILL_COOLDOWN;
    state.log.push({
      turn: state.turn,
      actor: "hero",
      text: `${hero.name} usa ${s.name}${crit ? " ¡CRÍTICO!" : ""} e inflige ${dmg} de daño${heal > 0 ? ` y recupera ${heal} de vida` : ""}.`,
      dmg,
      heal: heal > 0 ? heal : undefined,
      crit,
    });
  } else {
    const critChance = cls === "rogue" ? 0.25 : 0.1;
    const { dmg, crit } = calcDamage(hero.atk, enemy.def, 1, critChance);
    enemy.hp = Math.max(0, enemy.hp - dmg);
    state.log.push({
      turn: state.turn,
      actor: "hero",
      text: `${hero.name} ataca${crit ? " con un golpe CRÍTICO" : ""} e inflige ${dmg} de daño.`,
      dmg,
      crit,
    });
  }
}

/** Enemy attacks the hero. `defending` reduces the damage. */
export function enemyTurn(state: BattleState, defending: boolean): void {
  const { hero, enemy } = state;
  const heavy = Math.random() < (enemy.isBoss ? 0.3 : 0.18);
  const { dmg: raw, crit } = calcDamage(enemy.atk, hero.def, heavy ? 1.5 : 1, 0.08);
  const dmg = defending ? Math.max(1, Math.round(raw * 0.35)) : raw;
  hero.hp = Math.max(0, hero.hp - dmg);
  const verb = heavy ? "desata un ataque devastador" : "ataca";
  state.log.push({
    turn: state.turn,
    actor: "enemy",
    text: `${enemy.name} ${verb}${crit ? " CRÍTICO" : ""} y causa ${dmg} de daño${defending ? " (bloqueado parcialmente)" : ""}.`,
    dmg,
    crit,
  });
}

/** Fully automatic fight (PvP / sieges). Both sides use their skill when ready. */
export function simulateAuto(
  a: Combatant & { cls: ClassId },
  b: Combatant & { cls?: ClassId },
  maxTurns = 30
): { winner: "a" | "b"; log: LogEntry[]; aHp: number; bHp: number } {
  const log: LogEntry[] = [];
  let aCd = 1;
  let bCd = 2;
  const A = { ...a };
  const B = { ...b };
  // Faster combatant (higher atk) goes first, ties random
  let aTurn = A.atk === B.atk ? Math.random() < 0.5 : A.atk > B.atk;

  for (let turn = 1; turn <= maxTurns * 2; turn++) {
    const attacker = aTurn ? A : B;
    const defender = aTurn ? B : A;
    const cls = (aTurn ? A.cls : B.cls) as ClassId | undefined;
    let cd = aTurn ? aCd : bCd;
    const t = Math.ceil(turn / 2);

    if (cls && cd <= 0) {
      const s = CLASSES[cls].skill;
      const { dmg, crit } = calcDamage(attacker.atk, defender.def, s.mult, 0.1 + s.critBonus);
      defender.hp = Math.max(0, defender.hp - dmg);
      let heal = Math.round(attacker.maxHp * s.healPct + dmg * s.drainPct);
      heal = Math.max(0, Math.min(heal, attacker.maxHp - attacker.hp));
      attacker.hp += heal;
      cd = SKILL_COOLDOWN;
      log.push({
        turn: t,
        actor: aTurn ? "hero" : "enemy",
        text: `${attacker.name} usa ${s.name}${crit ? " ¡CRÍTICO!" : ""}: ${dmg} de daño${heal ? `, +${heal} vida` : ""}.`,
        dmg,
        heal: heal || undefined,
        crit,
      });
    } else {
      const { dmg, crit } = calcDamage(attacker.atk, defender.def, 1, cls === "rogue" ? 0.25 : 0.1);
      defender.hp = Math.max(0, defender.hp - dmg);
      cd -= 1;
      log.push({
        turn: t,
        actor: aTurn ? "hero" : "enemy",
        text: `${attacker.name} golpea${crit ? " CRÍTICO" : ""}: ${dmg} de daño.`,
        dmg,
        crit,
      });
    }
    if (aTurn) aCd = cd;
    else bCd = cd;

    if (defender.hp <= 0) {
      return { winner: aTurn ? "a" : "b", log, aHp: A.hp, bHp: B.hp };
    }
    aTurn = !aTurn;
  }
  // Timeout: higher remaining hp % wins
  const winner = A.hp / A.maxHp >= B.hp / B.maxHp ? "a" : "b";
  log.push({ turn: maxTurns, actor: "system", text: "¡Tiempo agotado! El combate se decide por la vida restante." });
  return { winner, log, aHp: A.hp, bHp: B.hp };
}

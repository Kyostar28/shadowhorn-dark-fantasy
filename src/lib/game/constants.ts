// Shared game constants & formulas (safe for client and server)

export type RaceId = "human" | "orc" | "blood_elf" | "dwarf" | "tauren";
export type ClassId = "warrior" | "paladin" | "mage" | "rogue" | "hunter" | "warlock" | "shaman" | "druid";
export type FactionSlug = "alliance" | "horde";

export const MAX_ENERGY = 30;
export const ENERGY_REGEN_MS = 3 * 60 * 1000; // 1 energy every 3 minutes
export const FAUCET_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
export const GUILD_CREATE_COST = 500;
export const AUCTION_FEE = 0.05;

export const ENERGY_COST = { pve: 1, pvp: 2, siege: 2 } as const;

export const FACTIONS: Record<FactionSlug, { name: string; color: string; motto: string; sigil: string }> = {
  alliance: {
    name: "Alianza del Alba",
    color: "#3b82f6",
    motto: "Por la Luz y el acero",
    sigil: "🦁",
  },
  horde: {
    name: "Horda de Sangre",
    color: "#dc2626",
    motto: "Fuerza y honor",
    sigil: "🐺",
  },
};

export const RACES: Record<
  RaceId,
  { name: string; faction: FactionSlug; description: string; bonus: { hp: number; atk: number; def: number }; bonusText: string }
> = {
  human: {
    name: "Humano",
    faction: "alliance",
    description: "Versátiles y ambiciosos, los humanos forjan reinos sobre las cenizas de la guerra.",
    bonus: { hp: 10, atk: 1, def: 1 },
    bonusText: "+10 Vida, +1 Ataque, +1 Defensa",
  },
  dwarf: {
    name: "Enano",
    faction: "alliance",
    description: "Herreros de runas y guardianes de la montaña. Duros como la piedra que trabajan.",
    bonus: { hp: 5, atk: 0, def: 3 },
    bonusText: "+5 Vida, +3 Defensa",
  },
  orc: {
    name: "Orco",
    faction: "horde",
    description: "Guerreros nacidos del fuego y la sangre. Su furia es legendaria en el campo de batalla.",
    bonus: { hp: 5, atk: 3, def: 0 },
    bonusText: "+5 Vida, +3 Ataque",
  },
  blood_elf: {
    name: "Elfo de Sangre",
    faction: "horde",
    description: "Nobles hechiceros adictos a la magia arcana. Elegantes, orgullosos y letales.",
    bonus: { hp: 0, atk: 4, def: -1 },
    bonusText: "+4 Ataque, −1 Defensa",
  },
  tauren: {
    name: "Tauren",
    faction: "horde",
    description: "Gigantes serenos de las llanuras, en comunión con la tierra y los espíritus.",
    bonus: { hp: 25, atk: 0, def: 1 },
    bonusText: "+25 Vida, +1 Defensa",
  },
};

export const CLASSES: Record<
  ClassId,
  {
    name: string;
    icon: string;
    color: string;
    role: string;
    base: { hp: number; atk: number; def: number };
    skill: { name: string; description: string; mult: number; healPct: number; drainPct: number; critBonus: number };
  }
> = {
  warrior: {
    name: "Guerrero",
    icon: "⚔️",
    color: "#c2410c",
    role: "Tanque / Daño",
    base: { hp: 120, atk: 14, def: 10 },
    skill: { name: "Golpe Mortal", description: "Ataque brutal que inflige 190% de daño.", mult: 1.9, healPct: 0, drainPct: 0, critBonus: 0 },
  },
  paladin: {
    name: "Paladín",
    icon: "🛡️",
    color: "#f472b6",
    role: "Tanque / Sanador",
    base: { hp: 130, atk: 12, def: 12 },
    skill: { name: "Martillo Sagrado", description: "Golpe del 120% y cura el 25% de tu vida.", mult: 1.2, healPct: 0.25, drainPct: 0, critBonus: 0 },
  },
  mage: {
    name: "Mago",
    icon: "🔥",
    color: "#38bdf8",
    role: "Daño mágico",
    base: { hp: 90, atk: 18, def: 6 },
    skill: { name: "Bola de Fuego", description: "Explosión arcana del 230% de daño.", mult: 2.3, healPct: 0, drainPct: 0, critBonus: 0 },
  },
  rogue: {
    name: "Pícaro",
    icon: "🗡️",
    color: "#facc15",
    role: "Daño crítico",
    base: { hp: 95, atk: 17, def: 7 },
    skill: { name: "Puñalada Sombría", description: "Daño del 200% con +40% de probabilidad de crítico.", mult: 2.0, healPct: 0, drainPct: 0, critBonus: 0.4 },
  },
  hunter: {
    name: "Cazador",
    icon: "🏹",
    color: "#84cc16",
    role: "Daño a distancia",
    base: { hp: 100, atk: 16, def: 8 },
    skill: { name: "Disparo Arcano", description: "Flecha encantada del 200% de daño.", mult: 2.0, healPct: 0, drainPct: 0, critBonus: 0.15 },
  },
  warlock: {
    name: "Brujo",
    icon: "💀",
    color: "#8b5cf6",
    role: "Daño / Drenaje",
    base: { hp: 95, atk: 17, def: 7 },
    skill: { name: "Drenar Alma", description: "170% de daño y te curas el 50% del daño infligido.", mult: 1.7, healPct: 0, drainPct: 0.5, critBonus: 0 },
  },
  shaman: {
    name: "Chamán",
    icon: "⚡",
    color: "#2563eb",
    role: "Híbrido elemental",
    base: { hp: 110, atk: 15, def: 9 },
    skill: { name: "Cadena de Relámpagos", description: "180% de daño y cura un 10% de tu vida.", mult: 1.8, healPct: 0.1, drainPct: 0, critBonus: 0 },
  },
  druid: {
    name: "Druida",
    icon: "🌿",
    color: "#f97316",
    role: "Sanador / Feral",
    base: { hp: 110, atk: 14, def: 10 },
    skill: { name: "Furia de la Naturaleza", description: "Zarpazo del 140% y cura el 30% de tu vida.", mult: 1.4, healPct: 0.3, drainPct: 0, critBonus: 0 },
  },
};

export const SKILL_COOLDOWN = 3;

export const RARITY: Record<string, { label: string; color: string }> = {
  common: { label: "Común", color: "#9ca3af" },
  rare: { label: "Raro", color: "#3b82f6" },
  epic: { label: "Épico", color: "#a855f7" },
  legendary: { label: "Legendario", color: "#f97316" },
};

export const SLOTS: Record<string, string> = {
  weapon: "Arma",
  armor: "Armadura",
  helmet: "Casco",
  trinket: "Abalorio",
  consumable: "Consumible",
};

export const QUEST_OBJECTIVES: Record<string, { label: string; href: string }> = {
  pve_win: { label: "Victorias PvE", href: "/game/battle" },
  pvp_fight: { label: "Combates PvP", href: "/game/pvp" },
  dungeon_clear: { label: "Mazmorras completadas", href: "/game/dungeons" },
  ptc_view: { label: "Anuncios vistos", href: "/game/ptc" },
  faucet_claim: { label: "Reclamos del faucet", href: "/game/faucet" },
  siege: { label: "Asedios", href: "/game/territories" },
};

export function xpForLevel(level: number) {
  return Math.round(100 * Math.pow(level, 1.5));
}

export function initialStats(race: RaceId, cls: ClassId) {
  const r = RACES[race].bonus;
  const c = CLASSES[cls].base;
  return { max_hp: c.hp + r.hp, attack: c.atk + r.atk, defense: c.def + r.def };
}

export const LEVEL_UP_GAINS = { hp: 12, atk: 2, def: 1 };

export function formatNumber(n: number | null | undefined) {
  return new Intl.NumberFormat("es-ES").format(Math.round(Number(n || 0)));
}

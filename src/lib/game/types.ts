// Database record interfaces (mirror Totalum tables)

export interface FileField {
  name: string;
  url: string;
}

export interface Faction {
  _id: string;
  name: string;
  slug: "alliance" | "horde";
  description?: string;
  color?: string;
  war_score?: number;
}

export interface Guild {
  _id: string;
  name: string;
  tag?: string;
  description?: string;
  faction?: string | Faction;
  leader?: string | Hero;
  level?: number;
  treasury?: number;
  emblem?: string;
  hero?: Hero[];
  _count?: { _total?: number; hero?: number };
}

export interface Item {
  _id: string;
  name: string;
  description?: string;
  slot: "weapon" | "armor" | "helmet" | "trinket" | "consumable";
  rarity: "common" | "rare" | "epic" | "legendary";
  attack_bonus?: number;
  defense_bonus?: number;
  hp_bonus?: number;
  heal_amount?: number;
  energy_amount?: number;
  shop_price?: number;
  icon?: string;
  in_shop?: "yes" | "no";
}

export interface InventoryItem {
  _id: string;
  hero: string | Hero;
  item: string | Item;
  quantity: number;
  equipped?: "yes" | "no";
}

export interface Hero {
  _id: string;
  name: string;
  user?: string;
  race: import("./constants").RaceId;
  hero_class: import("./constants").ClassId;
  faction?: string | Faction;
  guild?: string | Guild | null;
  level: number;
  xp: number;
  max_hp: number;
  attack: number;
  defense: number;
  gold: number;
  coins: number;
  energy: number;
  energy_updated_at?: string;
  last_faucet_claim?: string | null;
  pvp_rating: number;
  wins: number;
  losses: number;
  monsters_slain: number;
  createdAt?: string;
  inventory_item?: InventoryItem[];
}

export interface Monster {
  _id: string;
  name: string;
  description?: string;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  xp_reward: number;
  gold_reward: number;
  coin_reward: number;
  is_boss?: "yes" | "no";
  stage?: number;
  image?: FileField | null;
  dungeon?: string | Dungeon | null;
}

export interface Dungeon {
  _id: string;
  name: string;
  description?: string;
  min_level: number;
  energy_cost: number;
  reward_multiplier: number;
  image?: FileField | null;
  monster?: Monster[];
}

export interface Territory {
  _id: string;
  name: string;
  description?: string;
  controlling_faction?: string | Faction | null;
  alliance_influence: number;
  horde_influence: number;
  coin_bonus: number;
  map_x: number;
  map_y: number;
  level: number;
}

export interface Quest {
  _id: string;
  title: string;
  description?: string;
  objective: string;
  target_count: number;
  reward_gold: number;
  reward_xp: number;
  reward_coins: number;
}

export interface HeroQuest {
  _id: string;
  hero: string;
  quest: string | Quest;
  day_key: string;
  progress: number;
  status: "in_progress" | "completed" | "claimed";
}

export interface PtcAd {
  _id: string;
  title: string;
  description?: string;
  url: string;
  duration_seconds: number;
  reward_coins: number;
  is_active?: "yes" | "no";
}

export interface Auction {
  _id: string;
  seller: string | Hero;
  buyer?: string | Hero | null;
  item: string | Item;
  price: number;
  quantity: number;
  status: "active" | "sold" | "cancelled";
  sold_at?: string;
  createdAt?: string;
}

// ---- Combat ----
export interface Combatant {
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  level: number;
  image?: string;
  race?: string;
  cls?: string;
  isBoss?: boolean;
}

export interface LogEntry {
  turn: number;
  actor: "hero" | "enemy" | "system";
  text: string;
  dmg?: number;
  heal?: number;
  crit?: boolean;
}

export interface LootDrop {
  itemId: string;
  name: string;
  icon?: string;
  rarity: string;
}

export interface StageEnemy extends Combatant {
  id: string;
  xp: number;
  gold: number;
  coins: number;
}

export interface BattleState {
  hero: Combatant;
  enemy: Combatant;
  turn: number;
  skillCooldown: number;
  log: LogEntry[];
  stageIndex: number;
  stages: StageEnemy[];
  multiplier: number;
  rewards: { xp: number; gold: number; coins: number };
  loot: LootDrop[];
  levelUp?: number;
}

export interface BattleRecord {
  _id: string;
  battle_type: "pve" | "dungeon" | "pvp" | "siege";
  status: "active" | "won" | "lost" | "fled";
  state: BattleState;
  gold_earned?: number;
  xp_earned?: number;
  coins_earned?: number;
  createdAt?: string;
}

export interface HeroStats {
  maxHp: number;
  atk: number;
  def: number;
  power: number;
}

import { totalumSdk } from "@/lib/totalum";
import {
  check,
  findHeroByUser,
  heroView,
  GameError,
  handleApiError,
  ok,
  requireUser,
} from "@/lib/game/server";
import { MAX_ENERGY, RACES, initialStats, type ClassId, type RaceId, CLASSES } from "@/lib/game/constants";
import type { Hero } from "@/lib/game/types";

export async function GET() {
  try {
    const user = await requireUser();
    const hero = await findHeroByUser(user.id);
    return ok(hero ? heroView(hero) : null);
  } catch (err) {
    return handleApiError("GET /api/hero", err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { name?: string; race?: RaceId; hero_class?: ClassId };
    const name = (body.name || "").trim();
    if (name.length < 3 || name.length > 20) throw new GameError("El nombre debe tener entre 3 y 20 caracteres");
    if (!body.race || !RACES[body.race]) throw new GameError("Raza inválida");
    if (!body.hero_class || !CLASSES[body.hero_class]) throw new GameError("Clase inválida");

    const existing = await findHeroByUser(user.id);
    if (existing) throw new GameError("Ya tienes un héroe");

    const dupRes = await totalumSdk.crud.query("hero", { _filter: { name: { regex: `^${name.replace(/[^\w\sáéíóúñ-]/gi, "")}$`, options: "i" } }, _limit: 1 } as any);
    if ((check(dupRes as any, "dup name") as any[]).length) throw new GameError("Ese nombre ya está en uso");

    const factionSlug = RACES[body.race].faction;
    const fRes = await totalumSdk.crud.query("faction", { _filter: { slug: factionSlug }, _limit: 1 } as any);
    const faction = (check(fRes as any, "faction") as any[])[0];

    const stats = initialStats(body.race, body.hero_class);
    const created = await totalumSdk.crud.createRecord("hero", {
      name,
      user: user.id,
      race: body.race,
      hero_class: body.hero_class,
      faction: faction?._id,
      level: 1,
      xp: 0,
      ...stats,
      gold: 150,
      coins: 0,
      energy: MAX_ENERGY,
      energy_updated_at: new Date().toISOString(),
      pvp_rating: 1000,
      wins: 0,
      losses: 0,
      monsters_slain: 0,
    });
    const hero = check(created as any, "create hero") as Hero;
    console.log(`[GAME] Héroe creado: ${name} (${body.race}/${body.hero_class}) para usuario ${user.id}`);

    // Starter kit: 3 minor healing potions if the item exists
    const potRes = await totalumSdk.crud.query("item", { _filter: { slot: "consumable" }, _sort: { shop_price: "asc" }, _limit: 1 } as any);
    const potion = (check(potRes as any, "starter potion") as any[])[0];
    if (potion) {
      await totalumSdk.crud.createRecord("inventory_item", { hero: hero._id, item: potion._id, quantity: 3, equipped: "no" });
    }
    return ok(hero);
  } catch (err) {
    return handleApiError("POST /api/hero", err);
  }
}

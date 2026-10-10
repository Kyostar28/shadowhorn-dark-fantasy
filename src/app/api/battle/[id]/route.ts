import { handleApiError, ok, requireHero } from "@/lib/game/server";
import { getOwnedBattle } from "@/lib/game/battle-service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { hero } = await requireHero();
    const battle = await getOwnedBattle(id, hero._id);
    const potions = (hero.inventory_item || [])
      .filter((ii: any) => typeof ii.item === "object" && ii.item.slot === "consumable" && (ii.item.heal_amount || 0) > 0 && ii.quantity > 0)
      .map((ii: any) => ({ _id: ii._id, name: ii.item.name, icon: ii.item.icon, quantity: ii.quantity, heal: ii.item.heal_amount }));
    return ok({ battle, potions, heroClass: hero.hero_class, race: hero.race });
  } catch (err) {
    return handleApiError("GET /api/battle/[id]", err);
  }
}

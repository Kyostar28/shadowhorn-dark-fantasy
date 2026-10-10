import { totalumSdk } from "@/lib/totalum";
import { computeStats, GameError, handleApiError, ok, removeFromInventory, requireHero, updateHero, currentEnergy } from "@/lib/game/server";
import { MAX_ENERGY } from "@/lib/game/constants";

export async function GET() {
  try {
    const { hero } = await requireHero();
    return ok({ items: hero.inventory_item || [], stats: computeStats(hero) });
  } catch (err) {
    return handleApiError("GET /api/inventory", err);
  }
}

export async function POST(req: Request) {
  try {
    const { hero } = await requireHero();
    const body = (await req.json().catch(() => ({}))) as { action?: "equip" | "unequip" | "use"; inventoryItemId?: string };
    const inv = hero.inventory_item || [];
    const ii = inv.find((x) => x._id === body.inventoryItemId) as any;
    if (!ii || typeof ii.item !== "object") throw new GameError("Objeto no encontrado en tu inventario", 404);
    const item = ii.item;

    if (body.action === "equip") {
      if (item.slot === "consumable") throw new GameError("Los consumibles no se equipan");
      // Unequip whatever is in the same slot
      const same = inv.filter((x: any) => x.equipped === "yes" && typeof x.item === "object" && x.item.slot === item.slot && x._id !== ii._id);
      for (const s of same) await totalumSdk.crud.editRecordById("inventory_item", s._id, { equipped: "no" });
      await totalumSdk.crud.editRecordById("inventory_item", ii._id, { equipped: "yes" });
      console.log(`[GAME] ${hero.name} equipa ${item.name}`);
      return ok({ equipped: ii._id });
    }
    if (body.action === "unequip") {
      await totalumSdk.crud.editRecordById("inventory_item", ii._id, { equipped: "no" });
      return ok({ unequipped: ii._id });
    }
    if (body.action === "use") {
      if (item.slot !== "consumable") throw new GameError("Este objeto no se puede usar");
      if (!(item.energy_amount > 0)) throw new GameError("Las pociones de vida se usan durante el combate");
      const { energy } = currentEnergy(hero);
      if (energy >= MAX_ENERGY) throw new GameError("Tu energía ya está al máximo");
      const newEnergy = Math.min(MAX_ENERGY, energy + item.energy_amount);
      await updateHero(hero._id, { energy: newEnergy, energy_updated_at: new Date().toISOString() });
      await removeFromInventory(ii, 1);
      console.log(`[GAME] ${hero.name} usa ${item.name}: energía ${energy} -> ${newEnergy}`);
      return ok({ energy: newEnergy });
    }
    throw new GameError("Acción desconocida");
  } catch (err) {
    return handleApiError("POST /api/inventory", err);
  }
}

import { totalumSdk } from "@/lib/totalum";
import { addItemToInventory, check, GameError, handleApiError, ok, requireHero, updateHero } from "@/lib/game/server";

export async function GET() {
  try {
    const res = await totalumSdk.crud.query("item", { _filter: { in_shop: "yes" }, _sort: { shop_price: "asc" }, _limit: 100 } as any);
    return ok(check(res as any, "shop items"));
  } catch (err) {
    return handleApiError("GET /api/shop", err);
  }
}

export async function POST(req: Request) {
  try {
    const { hero } = await requireHero();
    const body = (await req.json().catch(() => ({}))) as { itemId?: string; quantity?: number };
    const qty = Math.max(1, Math.min(20, Math.floor(Number(body.quantity || 1))));
    const iRes = await totalumSdk.crud.getRecordById("item", body.itemId || "");
    const item = check(iRes as any, "item") as any;
    if (!item || item.in_shop !== "yes") throw new GameError("Objeto no disponible en la tienda", 404);
    const cost = (item.shop_price || 0) * qty;
    if ((hero.gold || 0) < cost) throw new GameError(`Oro insuficiente (necesitas ${cost})`);
    await updateHero(hero._id, { gold: hero.gold - cost });
    await addItemToInventory(hero, item._id, qty);
    console.log(`[GAME] ${hero.name} compra ${qty}x ${item.name} por ${cost} oro`);
    return ok({ item, quantity: qty, cost });
  } catch (err) {
    return handleApiError("POST /api/shop", err);
  }
}

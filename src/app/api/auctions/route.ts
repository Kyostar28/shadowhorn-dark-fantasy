import { totalumSdk } from "@/lib/totalum";
import { addItemToInventory, check, GameError, handleApiError, idOf, ok, removeFromInventory, requireHero, updateHero } from "@/lib/game/server";
import { AUCTION_FEE } from "@/lib/game/constants";

export async function GET() {
  try {
    const { hero } = await requireHero();
    const [aRes, mRes] = await Promise.all([
      totalumSdk.crud.query("auction", { _filter: { status: "active" }, _sort: { createdAt: "desc" }, _limit: 100, item: true, seller: true } as any),
      totalumSdk.crud.query("auction", { _filter: { seller: hero._id }, _sort: { createdAt: "desc" }, _limit: 30, item: true, buyer: true } as any),
    ]);
    return ok({ active: check(aRes as any, "auctions"), mine: check(mRes as any, "my auctions"), heroId: hero._id });
  } catch (err) {
    return handleApiError("GET /api/auctions", err);
  }
}

export async function POST(req: Request) {
  try {
    const { hero } = await requireHero();
    const body = (await req.json().catch(() => ({}))) as { action?: "list" | "buy" | "cancel"; inventoryItemId?: string; auctionId?: string; price?: number };

    if (body.action === "list") {
      const price = Math.floor(Number(body.price || 0));
      if (price < 1 || price > 1_000_000) throw new GameError("Precio inválido");
      const ii = (hero.inventory_item || []).find((x) => x._id === body.inventoryItemId) as any;
      if (!ii || typeof ii.item !== "object") throw new GameError("Objeto no encontrado", 404);
      if (ii.equipped === "yes" && ii.quantity <= 1) throw new GameError("Desequipa el objeto antes de subastarlo");
      await removeFromInventory(ii, 1);
      const created = await totalumSdk.crud.createRecord("auction", { seller: hero._id, item: ii.item._id, price, quantity: 1, status: "active" });
      console.log(`[GAME] ${hero.name} subasta ${ii.item.name} por ${price}`);
      return ok(check(created as any, "create auction"));
    }

    const aRes = await totalumSdk.crud.query("auction", { _filter: { _id: body.auctionId || "" }, _limit: 1, seller: true, item: true } as any);
    const auction = (check(aRes as any, "auction") as any[])[0];
    if (!auction) throw new GameError("Subasta no encontrada", 404);
    if (auction.status !== "active") throw new GameError("Esta subasta ya no está activa");

    if (body.action === "buy") {
      if (idOf(auction.seller) === hero._id) throw new GameError("No puedes comprar tu propia subasta");
      if ((hero.gold || 0) < auction.price) throw new GameError("Oro insuficiente");
      await totalumSdk.crud.editRecordById("auction", auction._id, { status: "sold", buyer: hero._id, sold_at: new Date().toISOString() });
      await updateHero(hero._id, { gold: hero.gold - auction.price });
      const seller = auction.seller;
      if (seller && typeof seller === "object") {
        await updateHero(seller._id, { gold: (seller.gold || 0) + Math.floor(auction.price * (1 - AUCTION_FEE)) });
      }
      await addItemToInventory(hero, idOf(auction.item)!, auction.quantity || 1);
      console.log(`[GAME] ${hero.name} compra subasta ${auction._id} por ${auction.price}`);
      return ok({ bought: auction._id });
    }

    if (body.action === "cancel") {
      if (idOf(auction.seller) !== hero._id) throw new GameError("No es tu subasta", 403);
      await totalumSdk.crud.editRecordById("auction", auction._id, { status: "cancelled" });
      await addItemToInventory(hero, idOf(auction.item)!, auction.quantity || 1);
      return ok({ cancelled: auction._id });
    }
    throw new GameError("Acción desconocida");
  } catch (err) {
    return handleApiError("POST /api/auctions", err);
  }
}

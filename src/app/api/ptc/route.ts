import { totalumSdk } from "@/lib/totalum";
import { check, GameError, handleApiError, ok, progressQuest, requireHero, updateHero } from "@/lib/game/server";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    const { hero } = await requireHero();
    const since = new Date(Date.now() - DAY_MS).toISOString();
    const [aRes, vRes] = await Promise.all([
      totalumSdk.crud.query("ptc_ad", { _filter: { is_active: "yes" }, _sort: { reward_coins: "desc" }, _limit: 50 } as any),
      totalumSdk.crud.query("ptc_view", { _filter: { hero: hero._id, status: "completed", completed_at: { gte: since } }, _limit: 100 } as any),
    ]);
    const ads = check(aRes as any, "ads") as any[];
    const views = check(vRes as any, "views") as any[];
    const data = ads.map((ad) => {
      const v = views.find((x) => (typeof x.ptc_ad === "object" ? x.ptc_ad._id : x.ptc_ad) === ad._id);
      return { ...ad, viewedAt: v?.completed_at ?? null, availableAt: v ? new Date(v.completed_at).getTime() + DAY_MS : 0 };
    });
    const earnedToday = views.reduce((s, v) => s + (v.reward_coins || 0), 0);
    return ok({ ads: data, earnedToday });
  } catch (err) {
    return handleApiError("GET /api/ptc", err);
  }
}

export async function POST(req: Request) {
  try {
    const { hero } = await requireHero();
    const body = (await req.json().catch(() => ({}))) as { action?: "start" | "complete"; adId?: string; viewId?: string };

    if (body.action === "start") {
      const aRes = await totalumSdk.crud.getRecordById("ptc_ad", body.adId || "");
      const ad = check(aRes as any, "ad") as any;
      if (!ad || ad.is_active !== "yes") throw new GameError("Anuncio no disponible", 404);
      const since = new Date(Date.now() - DAY_MS).toISOString();
      const vRes = await totalumSdk.crud.query("ptc_view", { _filter: { hero: hero._id, ptc_ad: ad._id, status: "completed", completed_at: { gte: since } }, _limit: 1 } as any);
      if ((check(vRes as any, "views") as any[]).length) throw new GameError("Ya viste este anuncio hoy");
      const created = await totalumSdk.crud.createRecord("ptc_view", {
        hero: hero._id,
        ptc_ad: ad._id,
        status: "started",
        started_at: new Date().toISOString(),
        reward_coins: 0,
      });
      const view = check(created as any, "create view") as any;
      console.log(`[GAME] ${hero.name} empieza a ver anuncio ${ad.title}`);
      return ok({ viewId: view._id, duration: ad.duration_seconds, url: ad.url, title: ad.title, reward: ad.reward_coins });
    }

    if (body.action === "complete") {
      const vRes = await totalumSdk.crud.query("ptc_view", { _filter: { _id: body.viewId || "" }, _limit: 1, ptc_ad: true } as any);
      const view = (check(vRes as any, "view") as any[])[0];
      if (!view) throw new GameError("Visualización no encontrada", 404);
      const owner = typeof view.hero === "object" ? view.hero._id : view.hero;
      if (owner !== hero._id) throw new GameError("No es tu visualización", 403);
      if (view.status !== "started") throw new GameError("Recompensa ya reclamada");
      const ad = view.ptc_ad;
      const elapsed = (Date.now() - new Date(view.started_at).getTime()) / 1000;
      if (elapsed + 1 < (ad.duration_seconds || 0)) throw new GameError(`Debes ver el anuncio ${ad.duration_seconds} segundos`);
      await totalumSdk.crud.editRecordById("ptc_view", view._id, {
        status: "completed",
        completed_at: new Date().toISOString(),
        reward_coins: ad.reward_coins,
      });
      await updateHero(hero._id, { coins: Math.round(((hero.coins || 0) + ad.reward_coins) * 100) / 100 });
      await progressQuest(hero._id, "ptc_view");
      console.log(`[GAME] ${hero.name} completa anuncio ${ad.title} (+${ad.reward_coins} SHC)`);
      return ok({ reward: ad.reward_coins });
    }
    throw new GameError("Acción desconocida");
  } catch (err) {
    return handleApiError("POST /api/ptc", err);
  }
}

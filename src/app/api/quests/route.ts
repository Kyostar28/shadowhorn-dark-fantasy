import { totalumSdk } from "@/lib/totalum";
import { check, GameError, handleApiError, ok, requireHero, rewardPatch, todayKey, updateHero } from "@/lib/game/server";

export async function GET() {
  try {
    const { hero } = await requireHero();
    const [qRes, hqRes] = await Promise.all([
      totalumSdk.crud.query("quest", { _limit: 50 } as any),
      totalumSdk.crud.query("hero_quest", { _filter: { hero: hero._id, day_key: todayKey() }, _limit: 50 } as any),
    ]);
    const quests = check(qRes as any, "quests") as any[];
    const progress = check(hqRes as any, "hero quests") as any[];
    const data = quests.map((q) => {
      const hq = progress.find((p) => (typeof p.quest === "object" ? p.quest._id : p.quest) === q._id);
      return { ...q, heroQuestId: hq?._id ?? null, progress: hq?.progress ?? 0, status: hq?.status ?? "in_progress" };
    });
    return ok(data);
  } catch (err) {
    return handleApiError("GET /api/quests", err);
  }
}

export async function POST(req: Request) {
  try {
    const { hero } = await requireHero();
    const body = (await req.json().catch(() => ({}))) as { heroQuestId?: string };
    const res = await totalumSdk.crud.query("hero_quest", { _filter: { _id: body.heroQuestId || "" }, _limit: 1, quest: true } as any);
    const hq = (check(res as any, "hero quest") as any[])[0];
    if (!hq) throw new GameError("Misión no encontrada", 404);
    const owner = typeof hq.hero === "object" ? hq.hero._id : hq.hero;
    if (owner !== hero._id) throw new GameError("No es tu misión", 403);
    if (hq.status !== "completed") throw new GameError(hq.status === "claimed" ? "Ya reclamaste esta recompensa" : "La misión aún no está completa");
    const q = hq.quest;
    await totalumSdk.crud.editRecordById("hero_quest", hq._id, { status: "claimed" });
    const { patch, levelsGained } = rewardPatch(hero, { xp: q.reward_xp, gold: q.reward_gold, coins: q.reward_coins });
    await updateHero(hero._id, patch);
    console.log(`[GAME] ${hero.name} reclama misión ${q.title}`);
    return ok({ rewards: { xp: q.reward_xp, gold: q.reward_gold, coins: q.reward_coins }, levelUp: levelsGained ? patch.level : null });
  } catch (err) {
    return handleApiError("POST /api/quests", err);
  }
}

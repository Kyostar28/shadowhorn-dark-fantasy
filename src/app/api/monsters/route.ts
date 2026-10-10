import { totalumSdk } from "@/lib/totalum";
import { check, handleApiError, ok } from "@/lib/game/server";

export async function GET() {
  try {
    const res = await totalumSdk.crud.query("monster", { _sort: { level: "asc" }, _limit: 200 } as any);
    const all = check(res as any, "monsters") as any[];
    // Open-world monsters are the ones not bound to a dungeon
    const data = all.filter((m) => !m.dungeon);
    return ok(data);
  } catch (err) {
    return handleApiError("GET /api/monsters", err);
  }
}

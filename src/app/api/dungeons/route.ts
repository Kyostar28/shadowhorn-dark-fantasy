import { totalumSdk } from "@/lib/totalum";
import { check, handleApiError, ok } from "@/lib/game/server";

export async function GET() {
  try {
    const res = await totalumSdk.crud.query("dungeon", {
      _sort: { min_level: "asc" },
      monster: { _sort: { stage: "asc" } },
    } as any);
    return ok(check(res as any, "dungeons"));
  } catch (err) {
    return handleApiError("GET /api/dungeons", err);
  }
}

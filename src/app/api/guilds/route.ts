import { totalumSdk } from "@/lib/totalum";
import { check, GameError, handleApiError, idOf, ok, requireHero, updateHero } from "@/lib/game/server";
import { GUILD_CREATE_COST } from "@/lib/game/constants";

export async function GET() {
  try {
    const res = await totalumSdk.crud.query("guild", {
      _sort: { level: "desc" },
      faction: true,
      leader: true,
      hero: { _sort: { level: "desc" }, _select: { name: true, level: true, race: true, hero_class: true, pvp_rating: true } },
    } as any);
    return ok(check(res as any, "guilds"));
  } catch (err) {
    return handleApiError("GET /api/guilds", err);
  }
}

export async function POST(req: Request) {
  try {
    const { hero } = await requireHero();
    const body = (await req.json().catch(() => ({}))) as {
      action?: "create" | "join" | "leave" | "donate";
      guildId?: string;
      name?: string;
      tag?: string;
      description?: string;
      emblem?: string;
      amount?: number;
    };
    const myGuildId = idOf(hero.guild);

    if (body.action === "create") {
      if (myGuildId) throw new GameError("Ya perteneces a una hermandad");
      const name = (body.name || "").trim();
      const tag = (body.tag || "").trim().toUpperCase();
      if (name.length < 3 || name.length > 30) throw new GameError("El nombre debe tener entre 3 y 30 caracteres");
      if (tag.length < 2 || tag.length > 4) throw new GameError("El tag debe tener entre 2 y 4 caracteres");
      if ((hero.gold || 0) < GUILD_CREATE_COST) throw new GameError(`Necesitas ${GUILD_CREATE_COST} de oro`);
      const created = await totalumSdk.crud.createRecord("guild", {
        name,
        tag,
        description: (body.description || "").slice(0, 300),
        emblem: body.emblem || "⚔️",
        faction: idOf(hero.faction),
        leader: hero._id,
        level: 1,
        treasury: 0,
      });
      const guild = check(created as any, "create guild") as any;
      await updateHero(hero._id, { guild: guild._id, gold: hero.gold - GUILD_CREATE_COST });
      console.log(`[GAME] ${hero.name} funda la hermandad ${name}`);
      return ok(guild);
    }

    if (body.action === "join") {
      if (myGuildId) throw new GameError("Ya perteneces a una hermandad");
      const gRes = await totalumSdk.crud.getRecordById("guild", body.guildId || "");
      const guild = check(gRes as any, "guild") as any;
      if (!guild) throw new GameError("Hermandad no encontrada", 404);
      if (idOf(guild.faction) !== idOf(hero.faction)) throw new GameError("Solo puedes unirte a hermandades de tu facción");
      await updateHero(hero._id, { guild: guild._id });
      console.log(`[GAME] ${hero.name} se une a ${guild.name}`);
      return ok({ joined: guild._id });
    }

    if (body.action === "leave") {
      if (!myGuildId) throw new GameError("No perteneces a ninguna hermandad");
      const gRes = await totalumSdk.crud.query("guild", {
        _filter: { _id: myGuildId },
        _limit: 1,
        hero: { _sort: { level: "desc" }, _select: { name: true, level: true } },
      } as any);
      const guild = (check(gRes as any, "guild") as any[])[0];
      await updateHero(hero._id, { guild: null });
      if (guild && idOf(guild.leader) === hero._id) {
        const others = (guild.hero || []).filter((m: any) => m._id !== hero._id);
        if (others.length) {
          await totalumSdk.crud.editRecordById("guild", guild._id, { leader: others[0]._id });
        } else {
          await totalumSdk.crud.deleteRecordById("guild", guild._id);
          console.log(`[GAME] Hermandad ${guild.name} disuelta`);
        }
      }
      return ok({ left: true });
    }

    if (body.action === "donate") {
      if (!myGuildId) throw new GameError("No perteneces a ninguna hermandad");
      const amount = Math.floor(Number(body.amount || 0));
      if (amount <= 0) throw new GameError("Cantidad inválida");
      if (amount > (hero.gold || 0)) throw new GameError("No tienes suficiente oro");
      const gRes = await totalumSdk.crud.getRecordById("guild", myGuildId);
      const guild = check(gRes as any, "guild") as any;
      const treasury = (guild.treasury || 0) + amount;
      await totalumSdk.crud.editRecordById("guild", myGuildId, { treasury, level: 1 + Math.floor(treasury / 2000) });
      await updateHero(hero._id, { gold: hero.gold - amount });
      return ok({ treasury });
    }

    throw new GameError("Acción desconocida");
  } catch (err) {
    return handleApiError("POST /api/guilds", err);
  }
}

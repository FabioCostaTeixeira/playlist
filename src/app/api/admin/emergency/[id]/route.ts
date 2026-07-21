import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { emergencyOverrides } from "@/db/schema";
import { requireActor } from "@/server/access";
import { audit } from "@/server/audit";
import { api } from "@/server/http";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    const actor = await requireActor("emergency:write");
    const id = z.uuid().parse((await context.params).id);
    const [row] = await getDb()
      .delete(emergencyOverrides)
      .where(
        and(
          eq(emergencyOverrides.id, id),
          eq(emergencyOverrides.organizationId, actor.organizationId),
        ),
      )
      .returning({ id: emergencyOverrides.id });
    if (!row) throw new Response("Não encontrado", { status: 404 });
    await audit(actor, "emergency_cancelled", "emergency_override", id);
    return { ok: true };
  });
}

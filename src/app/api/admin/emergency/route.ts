import { getDb } from "@/db";
import { emergencyOverrides } from "@/db/schema";
import { requireActor } from "@/server/access";
import { audit } from "@/server/audit";
import { api } from "@/server/http";
import { emergencyInput } from "@/shared/schemas";

export async function POST(request: Request) {
  return api(async () => {
    const actor = await requireActor("emergency:write"); const value = emergencyInput.parse(await request.json());
    const [row] = await getDb().insert(emergencyOverrides).values({ organizationId: actor.organizationId, createdBy: actor.userId, ...value }).returning();
    await audit(actor, "emergency_created", "emergency_override", row.id, undefined, { targetType: row.targetType, targetId: row.targetId, endsAt: row.endsAt.toISOString() });
    return row;
  });
}

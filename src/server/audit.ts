import "server-only";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import type { Actor } from "@/server/access";
import { redact } from "@/server/security";

export async function audit(actor: Actor, action: string, entityType: string, entityId: string, before?: Record<string, unknown>, after?: Record<string, unknown>) {
  await getDb().insert(auditLogs).values({ organizationId: actor.organizationId, actorUserId: actor.userId, action, entityType, entityId, beforeSafe: redact(before), afterSafe: redact(after) });
}

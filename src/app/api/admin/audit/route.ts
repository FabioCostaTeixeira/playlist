import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { requireActor } from "@/server/access";
import { api } from "@/server/http";

export async function GET(request: Request) {
  return api(async () => {
    const actor = await requireActor("audit:read"); const url = new URL(request.url); const query = z.string().trim().max(100).catch("").parse(url.searchParams.get("q") ?? "");
    const filter = query ? and(eq(auditLogs.organizationId, actor.organizationId), or(ilike(auditLogs.action, `%${query}%`), ilike(auditLogs.entityType, `%${query}%`), ilike(auditLogs.entityId, `%${query}%`))) : eq(auditLogs.organizationId, actor.organizationId);
    return getDb().select().from(auditLogs).where(filter).orderBy(desc(auditLogs.createdAt)).limit(100);
  });
}

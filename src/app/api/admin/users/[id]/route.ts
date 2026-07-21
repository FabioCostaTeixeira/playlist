import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { organizationMembers } from "@/db/schema";
import { requireActor } from "@/server/access";
import { audit } from "@/server/audit";
import { api } from "@/server/http";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => { const actor = await requireActor("user:manage"); const { id } = await context.params; const value = z.object({ role: z.enum(["admin", "editor", "operator", "viewer"]).optional(), status: z.enum(["active", "blocked"]).optional() }).refine((v) => Object.keys(v).length > 0).parse(await request.json()); if (id === actor.userId && value.status === "blocked") throw new Response("Não bloqueie a própria conta", { status: 409 }); const [row] = await getDb().update(organizationMembers).set(value).where(and(eq(organizationMembers.organizationId, actor.organizationId), eq(organizationMembers.userId, id))).returning(); if (!row) throw new Response("Não encontrado", { status: 404 }); await audit(actor, "member_updated", "user", id, undefined, value); return row; });
}

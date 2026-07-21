import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { organizationMembers, user } from "@/db/schema";
import { requireActor } from "@/server/access";
import { audit } from "@/server/audit";
import { api } from "@/server/http";

export async function GET() {
  return api(async () => { const actor = await requireActor("user:manage"); return getDb().select({ id: user.id, name: user.name, email: user.email, role: organizationMembers.role, status: organizationMembers.status, createdAt: organizationMembers.createdAt }).from(organizationMembers).innerJoin(user, eq(organizationMembers.userId, user.id)).where(eq(organizationMembers.organizationId, actor.organizationId)); });
}

export async function POST(request: Request) {
  return api(async () => {
    const actor = await requireActor("user:manage"); const value = z.object({ email: z.email(), role: z.enum(["admin", "editor", "operator", "viewer"]) }).parse(await request.json());
    const [existing] = await getDb().select({ id: user.id }).from(user).where(eq(user.email, value.email.toLowerCase())).limit(1);
    if (!existing) throw new Response("Usuário precisa criar conta antes de entrar na organização", { status: 409 });
    await getDb().insert(organizationMembers).values({ organizationId: actor.organizationId, userId: existing.id, role: value.role }).onConflictDoUpdate({ target: [organizationMembers.organizationId, organizationMembers.userId], set: { role: value.role, status: "active" } });
    await audit(actor, "member_added", "user", existing.id, undefined, { email: value.email, role: value.role }); return { ok: true };
  });
}

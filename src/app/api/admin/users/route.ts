import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { organizationMembers, user } from "@/db/schema";
import { requireActor } from "@/server/access";
import { audit } from "@/server/audit";
import { api } from "@/server/http";
import { getAuth } from "@/server/auth";

export async function GET() {
  return api(async () => {
    const actor = await requireActor("user:manage");
    return getDb()
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: organizationMembers.role,
        status: organizationMembers.status,
        createdAt: organizationMembers.createdAt,
      })
      .from(organizationMembers)
      .innerJoin(user, eq(organizationMembers.userId, user.id))
      .where(eq(organizationMembers.organizationId, actor.organizationId));
  });
}

export async function POST(request: Request) {
  return api(async () => {
    const actor = await requireActor("user:manage");
    const value = z
      .object({
        name: z.string().trim().min(2).max(120),
        email: z.email(),
        password: z.string().min(12).max(128).optional(),
        role: z.enum(["admin", "editor", "operator", "viewer"]),
      })
      .parse(await request.json());
    const email = value.email.toLowerCase();
    let [memberUser] = await getDb()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (!memberUser) {
      if (!value.password)
        throw new Response(
          "Informe uma senha inicial de pelo menos 12 caracteres",
          { status: 422 },
        );
      const created = await getAuth().api.signUpEmail({
        body: { name: value.name, email, password: value.password },
      });
      memberUser = { id: created.user.id };
    }
    await getDb()
      .insert(organizationMembers)
      .values({
        organizationId: actor.organizationId,
        userId: memberUser.id,
        role: value.role,
      })
      .onConflictDoUpdate({
        target: [
          organizationMembers.organizationId,
          organizationMembers.userId,
        ],
        set: { role: value.role, status: "active" },
      });
    await audit(actor, "member_added", "user", memberUser.id, undefined, {
      email,
      role: value.role,
    });
    return { id: memberUser.id };
  });
}

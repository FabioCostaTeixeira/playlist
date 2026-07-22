import "server-only";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizationMembers, organizations } from "@/db/schema";
import { getAuth } from "@/server/auth";

export type Permission =
  | "content:write"
  | "playlist:write"
  | "channel:write"
  | "device:write"
  | "schedule:write"
  | "emergency:write"
  | "audit:read"
  | "user:manage";
export type Actor = {
  userId: string;
  organizationId: string;
  organizationName: string;
  role: "admin" | "editor" | "operator" | "viewer";
};

const matrix: Record<Actor["role"], ReadonlySet<Permission>> = {
  admin: new Set([
    "content:write",
    "playlist:write",
    "channel:write",
    "device:write",
    "schedule:write",
    "emergency:write",
    "audit:read",
    "user:manage",
  ]),
  editor: new Set(["content:write", "playlist:write"]),
  operator: new Set(["channel:write", "device:write", "schedule:write"]),
  viewer: new Set(),
};

export async function getActor(): Promise<Actor | null> {
  if (!process.env.DATABASE_URL) return null;
  const authSession = await getAuth().api.getSession({
    headers: await headers(),
  });
  if (!authSession) return null;
  const [member] = await getDb()
    .select({
      organizationId: organizationMembers.organizationId,
      organizationName: organizations.name,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(
      and(
        eq(organizationMembers.userId, authSession.user.id),
        eq(organizationMembers.status, "active"),
      ),
    )
    .limit(1);
  return member ? { userId: authSession.user.id, ...member } : null;
}

export async function requireActor(permission?: Permission) {
  const actor = await getActor();
  if (!actor) throw new Response("Não autenticado", { status: 401 });
  if (permission && !matrix[actor.role]!.has(permission))
    throw new Response("Sem permissão", { status: 403 });
  return actor;
}

export function permissionFor(resource: string): Permission {
  // Map, not an object literal: a literal lookup for keys like `__proto__`
  // walks the prototype chain and yields a truthy non-permission.
  const map = new Map<string, Permission>([
    ["contents", "content:write"],
    ["playlists", "playlist:write"],
    ["channels", "channel:write"],
    ["devices", "device:write"],
    ["schedules", "schedule:write"],
  ]);
  const permission = map.get(resource);
  if (!permission) throw new Response("Recurso inválido", { status: 404 });
  return permission;
}

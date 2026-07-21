import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { contents, playlistItems, playlists } from "@/db/schema";
import { requireActor } from "@/server/access";
import { audit } from "@/server/audit";
import { api } from "@/server/http";

const input = z.object({ items: z.array(z.object({ contentId: z.uuid(), durationSeconds: z.number().int().min(3).max(86400).nullable().optional(), transitionType: z.enum(["none", "fade"]).default("fade"), enabled: z.boolean().default(true) })).max(500) });

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const actor = await requireActor(); const { id } = await context.params;
    const [playlist] = await getDb().select({ id: playlists.id }).from(playlists).where(and(eq(playlists.id, id), eq(playlists.organizationId, actor.organizationId))).limit(1);
    if (!playlist) throw new Response("Não encontrado", { status: 404 });
    return getDb().select().from(playlistItems).where(eq(playlistItems.playlistId, id)).orderBy(asc(playlistItems.position));
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const actor = await requireActor("playlist:write"); const { id } = await context.params; const value = input.parse(await request.json());
    const [playlist] = await getDb().select({ id: playlists.id }).from(playlists).where(and(eq(playlists.id, id), eq(playlists.organizationId, actor.organizationId))).limit(1);
    if (!playlist) throw new Response("Não encontrado", { status: 404 });
    const contentIds = value.items.map((item) => item.contentId);
    if (contentIds.length) { const owned = await getDb().select({ id: contents.id }).from(contents).where(and(eq(contents.organizationId, actor.organizationId), inArray(contents.id, contentIds))); if (new Set(owned.map((row) => row.id)).size !== new Set(contentIds).size) throw new Response("Conteúdo de outro tenant ou inexistente", { status: 422 }); }
    await getDb().transaction(async (tx) => { await tx.delete(playlistItems).where(eq(playlistItems.playlistId, id)); if (value.items.length) await tx.insert(playlistItems).values(value.items.map((item, position) => ({ playlistId: id, position, ...item }))); await tx.update(playlists).set({ status: "draft", updatedAt: new Date() }).where(eq(playlists.id, id)); });
    await audit(actor, "reorder_items", "playlist", id, undefined, { itemCount: value.items.length });
    return { ok: true, itemCount: value.items.length };
  });
}

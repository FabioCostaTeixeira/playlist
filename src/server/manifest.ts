import "server-only";
import { put } from "@vercel/blob";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { channels, contents, playlistItems, playlists } from "@/db/schema";

export type PlayerManifest = {
  schemaVersion: 1;
  playlistId: string;
  version: number;
  generatedAt: string;
  items: Array<{ id: string; type: "url" | "image" | "video" | "html"; src?: string; html?: string; durationSeconds: number; transition: string }>;
};

export async function publishPlaylist(playlistId: string, organizationId: string) {
  const [playlist] = await getDb().select().from(playlists).where(and(eq(playlists.id, playlistId), eq(playlists.organizationId, organizationId))).limit(1);
  if (!playlist) throw new Response("Playlist não encontrada", { status: 404 });
  const rows = await getDb()
    .select({ id: contents.id, type: contents.type, sourceUrl: contents.sourceUrl, blobPath: contents.blobPath, htmlSafe: contents.htmlSafe, durationSeconds: playlistItems.durationSeconds, defaultDurationSeconds: contents.defaultDurationSeconds, transition: playlistItems.transitionType })
    .from(playlistItems)
    .innerJoin(contents, and(eq(playlistItems.contentId, contents.id), eq(contents.organizationId, organizationId)))
    .where(and(eq(playlistItems.playlistId, playlistId), eq(playlistItems.enabled, true)))
    .orderBy(asc(playlistItems.position));
  if (!rows.length) throw new Response("Playlist sem itens ativos", { status: 409 });
  const version = playlist.currentVersion + 1;
  const manifest: PlayerManifest = {
    schemaVersion: 1,
    playlistId,
    version,
    generatedAt: new Date().toISOString(),
    items: rows.map((row) => ({ id: row.id, type: row.type, ...(row.type === "html" ? { html: row.htmlSafe ?? "" } : { src: row.sourceUrl ?? row.blobPath ?? "" }), durationSeconds: row.durationSeconds ?? row.defaultDurationSeconds ?? 10, transition: row.transition })),
  };
  const immutable = await put(`manifests/playlists/${playlistId}/${version}.json`, JSON.stringify(manifest), { access: "public", contentType: "application/json", cacheControlMaxAge: 31_536_000 });
  await getDb().update(playlists).set({ currentVersion: version, manifestUrl: immutable.url, status: "published", updatedAt: new Date() }).where(eq(playlists.id, playlistId));

  const affectedChannels = await getDb().select({ id: channels.id }).from(channels).where(and(eq(channels.organizationId, organizationId), eq(channels.activePlaylistId, playlistId)));
  for (const channel of affectedChannels) {
    const pointer = await put(`manifests/channels/${channel.id}/current.json`, JSON.stringify({ version, manifestUrl: immutable.url }), { access: "public", contentType: "application/json", cacheControlMaxAge: 60, allowOverwrite: true });
    await getDb().update(channels).set({ currentVersion: version, pointerUrl: pointer.url, updatedAt: new Date() }).where(eq(channels.id, channel.id));
  }
  return { version, manifestUrl: immutable.url, channelsUpdated: affectedChannels.length };
}

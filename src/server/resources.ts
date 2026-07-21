import "server-only";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { channels, contents, devices, playlists, schedules } from "@/db/schema";
import {
  channelInput,
  contentInput,
  contentPatchInput,
  deviceInput,
  playlistInput,
  scheduleInput,
  schedulePatchInput,
  type ResourceName,
} from "@/shared/schemas";
import { sanitizeUserHtml } from "@/server/security";

const tables = { contents, playlists, channels, devices, schedules };

async function requireOwned(
  table: typeof playlists | typeof channels | typeof devices,
  id: string | null | undefined,
  organizationId: string,
  label: string,
) {
  if (!id) return;
  const [row] = await getDb()
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, organizationId)))
    .limit(1);
  if (!row)
    throw new Response(`${label} não encontrado nesta organização`, {
      status: 422,
    });
}

export async function listResources(
  resource: ResourceName,
  organizationId: string,
  query: { page: number; limit: number; search: string },
) {
  const offset = (query.page - 1) * query.limit;
  const finish = <T>(data: T[], count: Array<{ total: number }>) => ({
    data,
    page: query.page,
    limit: query.limit,
    total: count[0]?.total ?? 0,
  });
  switch (resource) {
    case "contents": {
      const filter = query.search
        ? and(
            eq(contents.organizationId, organizationId),
            ilike(contents.name, `%${query.search}%`),
          )
        : eq(contents.organizationId, organizationId);
      const [rows, count] = await Promise.all([
        getDb()
          .select()
          .from(contents)
          .where(filter)
          .orderBy(desc(contents.createdAt))
          .limit(query.limit)
          .offset(offset),
        getDb()
          .select({ total: sql<number>`count(*)::int` })
          .from(contents)
          .where(filter),
      ]);
      return finish(rows, count);
    }
    case "playlists": {
      const filter = query.search
        ? and(
            eq(playlists.organizationId, organizationId),
            ilike(playlists.name, `%${query.search}%`),
          )
        : eq(playlists.organizationId, organizationId);
      const [rows, count] = await Promise.all([
        getDb()
          .select()
          .from(playlists)
          .where(filter)
          .orderBy(desc(playlists.createdAt))
          .limit(query.limit)
          .offset(offset),
        getDb()
          .select({ total: sql<number>`count(*)::int` })
          .from(playlists)
          .where(filter),
      ]);
      return finish(rows, count);
    }
    case "channels": {
      const filter = query.search
        ? and(
            eq(channels.organizationId, organizationId),
            ilike(channels.name, `%${query.search}%`),
          )
        : eq(channels.organizationId, organizationId);
      const [rows, count] = await Promise.all([
        getDb()
          .select()
          .from(channels)
          .where(filter)
          .orderBy(desc(channels.createdAt))
          .limit(query.limit)
          .offset(offset),
        getDb()
          .select({ total: sql<number>`count(*)::int` })
          .from(channels)
          .where(filter),
      ]);
      return finish(rows, count);
    }
    case "devices": {
      const filter = query.search
        ? and(
            eq(devices.organizationId, organizationId),
            ilike(devices.name, `%${query.search}%`),
          )
        : eq(devices.organizationId, organizationId);
      const [rows, count] = await Promise.all([
        getDb()
          .select()
          .from(devices)
          .where(filter)
          .orderBy(desc(devices.createdAt))
          .limit(query.limit)
          .offset(offset),
        getDb()
          .select({ total: sql<number>`count(*)::int` })
          .from(devices)
          .where(filter),
      ]);
      return finish(rows, count);
    }
    case "schedules": {
      const filter = eq(schedules.organizationId, organizationId);
      const [rows, count] = await Promise.all([
        getDb()
          .select()
          .from(schedules)
          .where(filter)
          .orderBy(desc(schedules.createdAt))
          .limit(query.limit)
          .offset(offset),
        getDb()
          .select({ total: sql<number>`count(*)::int` })
          .from(schedules)
          .where(filter),
      ]);
      return finish(rows, count);
    }
  }
}

export async function createResource(
  resource: ResourceName,
  organizationId: string,
  userId: string,
  input: unknown,
) {
  switch (resource) {
    case "contents": {
      const value = contentInput.parse(input);
      const [row] = await getDb()
        .insert(contents)
        .values({
          organizationId,
          createdBy: userId,
          name: value.name,
          type: value.type,
          status: value.status,
          sourceUrl: value.sourceUrl,
          blobPath: value.blobPath,
          htmlSafe: value.html ? sanitizeUserHtml(value.html) : null,
          htmlMode: value.type === "html" ? "safe" : null,
          defaultDurationSeconds: value.defaultDurationSeconds,
        })
        .returning();
      return row;
    }
    case "playlists": {
      const value = playlistInput.parse(input);
      const [row] = await getDb()
        .insert(playlists)
        .values({ organizationId, ...value })
        .returning();
      return row;
    }
    case "channels": {
      const value = channelInput.parse(input);
      await Promise.all([
        requireOwned(
          playlists,
          value.activePlaylistId,
          organizationId,
          "Playlist ativa",
        ),
        requireOwned(
          playlists,
          value.fallbackPlaylistId,
          organizationId,
          "Playlist de contingência",
        ),
      ]);
      const [row] = await getDb()
        .insert(channels)
        .values({ organizationId, ...value })
        .returning();
      return row;
    }
    case "devices": {
      const value = deviceInput.parse(input);
      await requireOwned(channels, value.channelId, organizationId, "Canal");
      const [row] = await getDb()
        .insert(devices)
        .values({ organizationId, ...value })
        .returning();
      return row;
    }
    case "schedules": {
      const value = scheduleInput.parse(input);
      await Promise.all([
        requireOwned(
          value.targetType === "channel" ? channels : devices,
          value.targetId,
          organizationId,
          "Destino",
        ),
        requireOwned(playlists, value.playlistId, organizationId, "Playlist"),
      ]);
      const [row] = await getDb()
        .insert(schedules)
        .values({ organizationId, ...value })
        .returning();
      return row;
    }
  }
}

export async function updateResource(
  resource: ResourceName,
  id: string,
  organizationId: string,
  input: unknown,
) {
  switch (resource) {
    case "contents": {
      const value = contentPatchInput.parse(input);
      const { html, ...fields } = value;
      const [row] = await getDb()
        .update(contents)
        .set({
          ...fields,
          ...(html === undefined
            ? {}
            : { htmlSafe: html ? sanitizeUserHtml(html) : null }),
          updatedAt: new Date(),
        })
        .where(
          and(eq(contents.id, id), eq(contents.organizationId, organizationId)),
        )
        .returning();
      return row;
    }
    case "playlists": {
      const value = playlistInput.partial().parse(input);
      const [row] = await getDb()
        .update(playlists)
        .set({ ...value, updatedAt: new Date() })
        .where(
          and(
            eq(playlists.id, id),
            eq(playlists.organizationId, organizationId),
          ),
        )
        .returning();
      return row;
    }
    case "channels": {
      const value = channelInput.partial().parse(input);
      await Promise.all([
        requireOwned(
          playlists,
          value.activePlaylistId,
          organizationId,
          "Playlist ativa",
        ),
        requireOwned(
          playlists,
          value.fallbackPlaylistId,
          organizationId,
          "Playlist de contingência",
        ),
      ]);
      const [row] = await getDb()
        .update(channels)
        .set({ ...value, updatedAt: new Date() })
        .where(
          and(eq(channels.id, id), eq(channels.organizationId, organizationId)),
        )
        .returning();
      return row;
    }
    case "devices": {
      const value = deviceInput.partial().parse(input);
      await requireOwned(channels, value.channelId, organizationId, "Canal");
      const [row] = await getDb()
        .update(devices)
        .set({ ...value, updatedAt: new Date() })
        .where(
          and(eq(devices.id, id), eq(devices.organizationId, organizationId)),
        )
        .returning();
      return row;
    }
    case "schedules": {
      const value = schedulePatchInput.parse(input);
      const [row] = await getDb()
        .update(schedules)
        .set({ ...value, updatedAt: new Date() })
        .where(
          and(
            eq(schedules.id, id),
            eq(schedules.organizationId, organizationId),
          ),
        )
        .returning();
      return row;
    }
  }
}

export async function deleteResource(
  resource: ResourceName,
  id: string,
  organizationId: string,
) {
  const table = tables[resource];
  const [row] = await getDb()
    .delete(table)
    .where(and(eq(table.id, id), eq(table.organizationId, organizationId)))
    .returning({ id: table.id });
  return row;
}

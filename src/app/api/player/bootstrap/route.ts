import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  channels,
  contents,
  emergencyOverrides,
  playlists,
  schedules,
} from "@/db/schema";
import { authenticateDevice } from "@/server/device-auth";
import { api } from "@/server/http";

const heartbeatSeconds = 300;

async function publishedPlaylist(playlistId: string, organizationId: string) {
  const [playlist] = await getDb()
    .select({
      pointerUrl: playlists.manifestUrl,
      version: playlists.currentVersion,
    })
    .from(playlists)
    .where(
      and(
        eq(playlists.id, playlistId),
        eq(playlists.organizationId, organizationId),
        eq(playlists.status, "published"),
      ),
    )
    .limit(1);
  if (!playlist?.pointerUrl)
    throw new Response("Playlist ainda não publicada", { status: 409 });
  return playlist;
}

export async function GET(request: Request) {
  return api(async () => {
    const device = await authenticateDevice(request);
    const now = new Date();
    const target = or(
      and(
        eq(emergencyOverrides.targetType, "device"),
        eq(emergencyOverrides.targetId, device.id),
      ),
      ...(device.channelId
        ? [
            and(
              eq(emergencyOverrides.targetType, "channel"),
              eq(emergencyOverrides.targetId, device.channelId),
            ),
          ]
        : []),
      isNull(emergencyOverrides.targetId),
    );
    const [emergency] = await getDb()
      .select()
      .from(emergencyOverrides)
      .where(
        and(
          eq(emergencyOverrides.organizationId, device.organizationId),
          eq(emergencyOverrides.status, "active"),
          lte(emergencyOverrides.startsAt, now),
          gt(emergencyOverrides.endsAt, now),
          target,
        ),
      )
      .orderBy(desc(emergencyOverrides.createdAt))
      .limit(1);

    if (emergency?.contentId) {
      const [content] = await getDb()
        .select()
        .from(contents)
        .where(
          and(
            eq(contents.id, emergency.contentId),
            eq(contents.organizationId, device.organizationId),
            eq(contents.status, "active"),
          ),
        )
        .limit(1);
      if (!content)
        throw new Response("Conteúdo emergencial indisponível", {
          status: 409,
        });
      return {
        deviceId: device.id,
        heartbeatSeconds,
        source: "emergency",
        manifest: {
          schemaVersion: 1,
          playlistId: `emergency:${emergency.id}`,
          version: emergency.createdAt.getTime(),
          items: [
            {
              id: content.id,
              type: content.type,
              ...(content.type === "html"
                ? { html: content.htmlSafe ?? "" }
                : { src: content.sourceUrl ?? content.blobPath ?? "" }),
              durationSeconds: content.defaultDurationSeconds ?? 10,
              transition: "cut",
            },
          ],
        },
      };
    }
    if (emergency?.playlistId) {
      const playlist = await publishedPlaylist(
        emergency.playlistId,
        device.organizationId,
      );
      return {
        deviceId: device.id,
        ...playlist,
        heartbeatSeconds,
        source: "emergency",
      };
    }

    const scheduleTarget = or(
      and(
        eq(schedules.targetType, "device"),
        eq(schedules.targetId, device.id),
      ),
      ...(device.channelId
        ? [
            and(
              eq(schedules.targetType, "channel"),
              eq(schedules.targetId, device.channelId),
            ),
          ]
        : []),
    );
    const [schedule] = await getDb()
      .select({ playlistId: schedules.playlistId })
      .from(schedules)
      .where(
        and(
          eq(schedules.organizationId, device.organizationId),
          eq(schedules.status, "active"),
          lte(schedules.startsAt, now),
          or(isNull(schedules.endsAt), gt(schedules.endsAt, now)),
          scheduleTarget,
        ),
      )
      .orderBy(desc(schedules.priority), desc(schedules.startsAt))
      .limit(1);
    if (schedule) {
      const playlist = await publishedPlaylist(
        schedule.playlistId,
        device.organizationId,
      );
      return {
        deviceId: device.id,
        ...playlist,
        heartbeatSeconds,
        source: "schedule",
      };
    }

    if (device.directPlaylistId) {
      const playlist = await publishedPlaylist(
        device.directPlaylistId,
        device.organizationId,
      );
      return {
        deviceId: device.id,
        ...playlist,
        heartbeatSeconds,
        source: "device",
      };
    }
    if (!device.channelId)
      throw new Response("Dispositivo sem programação", { status: 409 });
    const [channel] = await getDb()
      .select({
        activePlaylistId: channels.activePlaylistId,
      })
      .from(channels)
      .where(
        and(
          eq(channels.id, device.channelId),
          eq(channels.organizationId, device.organizationId),
        ),
      )
      .limit(1);
    if (!channel?.activePlaylistId)
      throw new Response("Canal sem playlist ativa", { status: 409 });
    const playlist = await publishedPlaylist(
      channel.activePlaylistId,
      device.organizationId,
    );
    return {
      deviceId: device.id,
      ...playlist,
      heartbeatSeconds,
      source: "channel",
    };
  });
}

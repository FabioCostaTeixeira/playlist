import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { channels, playlists } from "@/db/schema";
import { authenticateDevice } from "@/server/device-auth";
import { api } from "@/server/http";

export async function GET(request: Request) {
  return api(async () => {
    const device = await authenticateDevice(request);
    if (device.directPlaylistId) {
      const [playlist] = await getDb().select({ pointerUrl: playlists.manifestUrl, version: playlists.currentVersion }).from(playlists).where(eq(playlists.id, device.directPlaylistId)).limit(1);
      return { deviceId: device.id, pointerUrl: playlist?.pointerUrl, version: playlist?.version ?? 0, heartbeatSeconds: 300 };
    }
    if (!device.channelId) throw new Response("Dispositivo sem programação", { status: 409 });
    const [channel] = await getDb().select({ pointerUrl: channels.pointerUrl, version: channels.currentVersion }).from(channels).where(eq(channels.id, device.channelId)).limit(1);
    if (!channel?.pointerUrl) throw new Response("Canal ainda não publicado", { status: 409 });
    return { deviceId: device.id, pointerUrl: channel.pointerUrl, version: channel.version, heartbeatSeconds: 300 };
  });
}

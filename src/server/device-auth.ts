import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { devices, deviceTokens } from "@/db/schema";
import { sha256 } from "@/server/security";

export async function authenticateDevice(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new Response("Token ausente", { status: 401 });
  const tokenHash = sha256(header.slice(7));
  const [device] = await getDb()
    .select({ id: devices.id, organizationId: devices.organizationId, status: devices.status, channelId: devices.channelId, directPlaylistId: devices.directPlaylistId })
    .from(deviceTokens)
    .innerJoin(devices, eq(deviceTokens.deviceId, devices.id))
    .where(and(eq(deviceTokens.tokenHash, tokenHash), isNull(deviceTokens.revokedAt), eq(devices.status, "active")))
    .limit(1);
  if (!device) throw new Response("Token inválido ou revogado", { status: 401 });
  await getDb().update(deviceTokens).set({ lastUsedAt: new Date() }).where(eq(deviceTokens.tokenHash, tokenHash));
  return device;
}

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { devices } from "@/db/schema";
import { authenticateDevice } from "@/server/device-auth";
import { api } from "@/server/http";
import { sha256 } from "@/server/security";
import { heartbeatInput } from "@/shared/schemas";

export async function POST(request: Request) {
  return api(async () => {
    const device = await authenticateDevice(request);
    const value = heartbeatInput.parse(await request.json());
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    await getDb().update(devices).set({ lastSeenAt: new Date(), lastIpHash: sha256(forwarded), userAgentSummary: request.headers.get("user-agent")?.slice(0, 200), resolutionWidth: value.resolutionWidth, resolutionHeight: value.resolutionHeight }).where(eq(devices.id, device.id));
    return { ok: true, serverTime: new Date().toISOString() };
  });
}

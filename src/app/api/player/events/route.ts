import { getDb } from "@/db";
import { playbackEventBatches } from "@/db/schema";
import { authenticateDevice } from "@/server/device-auth";
import { api } from "@/server/http";
import { eventBatchInput } from "@/shared/schemas";

export async function POST(request: Request) {
  return api(async () => {
    const device = await authenticateDevice(request);
    const value = eventBatchInput.parse(await request.json());
    await getDb().insert(playbackEventBatches).values({ deviceId: device.id, batchId: value.batchId, eventCount: value.events.length, events: value.events }).onConflictDoNothing({ target: playbackEventBatches.batchId });
    return { accepted: true };
  });
}

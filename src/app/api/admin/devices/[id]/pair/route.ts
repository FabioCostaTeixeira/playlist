import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { devices, pairingCodes } from "@/db/schema";
import { requireActor } from "@/server/access";
import { audit } from "@/server/audit";
import { api } from "@/server/http";
import { generatePairingCode, sha256 } from "@/server/security";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    const actor = await requireActor("device:write");
    const id = z.uuid().parse((await context.params).id);
    const [device] = await getDb()
      .select({ id: devices.id })
      .from(devices)
      .where(
        and(
          eq(devices.id, id),
          eq(devices.organizationId, actor.organizationId),
        ),
      )
      .limit(1);
    if (!device)
      throw new Response("Dispositivo não encontrado", { status: 404 });
    const activeFilter = and(
      eq(pairingCodes.deviceId, id),
      isNull(pairingCodes.consumedAt),
      gt(pairingCodes.expiresAt, new Date()),
    );
    await getDb()
      .update(pairingCodes)
      .set({ consumedAt: new Date() })
      .where(activeFilter);
    const code = generatePairingCode();
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await getDb()
      .insert(pairingCodes)
      .values({ deviceId: id, codeHash: sha256(code), expiresAt });
    await audit(actor, "pairing_code_created", "device", id, undefined, {
      expiresAt: expiresAt.toISOString(),
    });
    return { code, expiresAt };
  });
}

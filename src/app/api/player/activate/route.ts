import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { devices, deviceTokens, pairingCodes } from "@/db/schema";
import { api } from "@/server/http";
import { generateDeviceToken, sha256 } from "@/server/security";
import { pairingInput } from "@/shared/schemas";

export async function POST(request: Request) {
  return api(async () => {
    const { code } = pairingInput.parse(await request.json());
    const codeHash = sha256(code);
    await getDb().update(pairingCodes).set({ attempts: sql`${pairingCodes.attempts} + 1` }).where(and(eq(pairingCodes.codeHash, codeHash), lt(pairingCodes.attempts, 5)));
    const [pairing] = await getDb().select().from(pairingCodes).where(and(eq(pairingCodes.codeHash, codeHash), isNull(pairingCodes.consumedAt), gt(pairingCodes.expiresAt, new Date()), lt(pairingCodes.attempts, 6))).limit(1);
    if (!pairing) throw new Response("Código inválido ou expirado", { status: 401 });
    const token = generateDeviceToken();
    await getDb().transaction(async (tx) => {
      await tx.insert(deviceTokens).values({ deviceId: pairing.deviceId, tokenHash: sha256(token) });
      await tx.update(pairingCodes).set({ consumedAt: new Date() }).where(eq(pairingCodes.id, pairing.id));
      await tx.update(devices).set({ status: "active", updatedAt: new Date() }).where(eq(devices.id, pairing.deviceId));
    });
    return { token };
  });
}

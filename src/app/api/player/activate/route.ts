import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { devices, deviceTokens, pairingCodes } from "@/db/schema";
import { api } from "@/server/http";
import { clientIp, enforceRateLimit } from "@/server/rate-limit";
import { generateDeviceToken, sha256 } from "@/server/security";
import { pairingInput } from "@/shared/schemas";

export async function POST(request: Request) {
  return api(async () => {
    await enforceRateLimit(`activate:${clientIp(request)}`, {
      max: 10,
      windowMs: 10 * 60_000,
    });
    const { code } = pairingInput.parse(await request.json());
    const codeHash = sha256(code);

    // Reivindica o código em uma única instrução: marcar como consumido e
    // devolver a linha no mesmo comando garante que apenas um pedido use o
    // código, mesmo com chamadas simultâneas. Substitui a transação anterior,
    // que o driver neon-http não suporta e fazia a ativação falhar com 500.
    const [claimed] = await getDb()
      .update(pairingCodes)
      .set({
        consumedAt: new Date(),
        attempts: sql`${pairingCodes.attempts} + 1`,
      })
      .where(
        and(
          eq(pairingCodes.codeHash, codeHash),
          isNull(pairingCodes.consumedAt),
          gt(pairingCodes.expiresAt, new Date()),
        ),
      )
      .returning({ deviceId: pairingCodes.deviceId });
    if (!claimed)
      throw new Response("Código inválido ou expirado", { status: 401 });

    const token = generateDeviceToken();
    await getDb()
      .insert(deviceTokens)
      .values({ deviceId: claimed.deviceId, tokenHash: sha256(token) });
    await getDb()
      .update(devices)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(devices.id, claimed.deviceId));
    return { token };
  });
}

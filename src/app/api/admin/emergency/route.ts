import { and, desc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import {
  channels,
  contents,
  devices,
  emergencyOverrides,
  playlists,
} from "@/db/schema";
import { requireActor } from "@/server/access";
import { audit } from "@/server/audit";
import { api } from "@/server/http";
import { emergencyInput } from "@/shared/schemas";

export async function GET() {
  return api(async () => {
    const actor = await requireActor();
    return getDb()
      .select()
      .from(emergencyOverrides)
      .where(
        and(
          eq(emergencyOverrides.organizationId, actor.organizationId),
          eq(emergencyOverrides.status, "active"),
          gt(emergencyOverrides.endsAt, new Date()),
        ),
      )
      .orderBy(desc(emergencyOverrides.createdAt));
  });
}

export async function POST(request: Request) {
  return api(async () => {
    const actor = await requireActor("emergency:write");
    const value = emergencyInput.parse(await request.json());
    const targetTable = value.targetType === "channel" ? channels : devices;
    if (value.targetId) {
      const [target] = await getDb()
        .select({ id: targetTable.id })
        .from(targetTable)
        .where(
          and(
            eq(targetTable.id, value.targetId),
            eq(targetTable.organizationId, actor.organizationId),
          ),
        )
        .limit(1);
      if (!target)
        throw new Response("Destino não encontrado nesta organização", {
          status: 422,
        });
    }
    const mediaTable = value.contentId ? contents : playlists;
    const mediaId = value.contentId ?? value.playlistId!;
    const [media] = await getDb()
      .select({ id: mediaTable.id })
      .from(mediaTable)
      .where(
        and(
          eq(mediaTable.id, mediaId),
          eq(mediaTable.organizationId, actor.organizationId),
        ),
      )
      .limit(1);
    if (!media)
      throw new Response("Conteúdo não encontrado nesta organização", {
        status: 422,
      });
    const [row] = await getDb()
      .insert(emergencyOverrides)
      .values({
        organizationId: actor.organizationId,
        createdBy: actor.userId,
        ...value,
      })
      .returning();
    await audit(
      actor,
      "emergency_created",
      "emergency_override",
      row.id,
      undefined,
      {
        targetType: row.targetType,
        targetId: row.targetId,
        endsAt: row.endsAt.toISOString(),
      },
    );
    return row;
  });
}

import { api } from "@/server/http";
import { requireActor } from "@/server/access";
import { audit } from "@/server/audit";
import { publishPlaylist } from "@/server/manifest";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const actor = await requireActor("playlist:write");
    const { id } = await context.params;
    const result = await publishPlaylist(id, actor.organizationId);
    await audit(actor, "publish", "playlist", id, undefined, result);
    return result;
  });
}

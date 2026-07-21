import { api } from "@/server/http";
import { permissionFor, requireActor } from "@/server/access";
import { audit } from "@/server/audit";
import { deleteResource, updateResource } from "@/server/resources";
import { resourceName } from "@/shared/schemas";

export async function PATCH(request: Request, context: { params: Promise<{ resource: string; id: string }> }) {
  return api(async () => {
    const { resource: raw, id } = await context.params;
    const resource = resourceName.parse(raw);
    const actor = await requireActor(permissionFor(resource));
    const row = await updateResource(resource, id, actor.organizationId, await request.json());
    if (!row) throw new Response("Não encontrado", { status: 404 });
    await audit(actor, "update", resource, id, undefined, row);
    return row;
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ resource: string; id: string }> }) {
  return api(async () => {
    const { resource: raw, id } = await context.params;
    const resource = resourceName.parse(raw);
    const actor = await requireActor(permissionFor(resource));
    const row = await deleteResource(resource, id, actor.organizationId);
    if (!row) throw new Response("Não encontrado", { status: 404 });
    await audit(actor, "delete", resource, id, row);
    return { ok: true };
  });
}

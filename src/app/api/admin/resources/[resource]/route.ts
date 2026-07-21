import { z } from "zod";
import { api } from "@/server/http";
import { permissionFor, requireActor } from "@/server/access";
import { audit } from "@/server/audit";
import { createResource, listResources } from "@/server/resources";
import { resourceName } from "@/shared/schemas";

export async function GET(request: Request, context: { params: Promise<{ resource: string }> }) {
  return api(async () => {
    const resource = resourceName.parse((await context.params).resource);
    const actor = await requireActor();
    const url = new URL(request.url);
    const query = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(25), search: z.string().trim().max(100).default("") }).parse(Object.fromEntries(url.searchParams));
    return listResources(resource, actor.organizationId, query);
  });
}

export async function POST(request: Request, context: { params: Promise<{ resource: string }> }) {
  return api(async () => {
    const resource = resourceName.parse((await context.params).resource);
    const actor = await requireActor(permissionFor(resource));
    const row = await createResource(resource, actor.organizationId, actor.userId, await request.json());
    await audit(actor, "create", resource, row.id, undefined, row);
    return row;
  });
}

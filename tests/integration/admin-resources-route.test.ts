import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireActor,
  createResource,
  listResources,
  updateResource,
  deleteResource,
  audit,
} = vi.hoisted(() => ({
  requireActor: vi.fn(),
  createResource: vi.fn(),
  listResources: vi.fn(),
  updateResource: vi.fn(),
  deleteResource: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/server/access", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/access")>()),
  requireActor,
}));
vi.mock("@/server/resources", () => ({
  createResource,
  listResources,
  updateResource,
  deleteResource,
}));
vi.mock("@/server/audit", () => ({ audit }));
vi.mock("@/db", () => ({ getDb: () => ({}) }));

import { GET, POST } from "@/app/api/admin/resources/[resource]/route";
import { DELETE, PATCH } from "@/app/api/admin/resources/[resource]/[id]/route";

const actor = {
  userId: "user-1",
  organizationId: "org-A",
  organizationName: "Org A",
  role: "admin" as const,
};
const uuid = "11111111-1111-4111-8111-111111111111";
const params = (resource: string, id?: string) => ({
  params: Promise.resolve(id ? { resource, id } : ({ resource } as never)),
});
const denied = (status: number) => () => {
  throw new Response("negado", { status });
};

beforeEach(() => {
  vi.clearAllMocks();
  requireActor.mockResolvedValue(actor);
});

describe("propagação de autenticação e autorização", () => {
  it("GET anônimo responde 401 e nunca consulta dados", async () => {
    requireActor.mockImplementation(denied(401));
    const response = await GET(
      new Request("https://x/api/admin/resources/contents"),
      params("contents"),
    );
    expect(response.status).toBe(401);
    expect(listResources).not.toHaveBeenCalled();
  });

  it("POST sem permissão responde 403 e nunca cria o registro", async () => {
    requireActor.mockImplementation(denied(403));
    const response = await POST(
      new Request("https://x/api/admin/resources/contents", {
        method: "POST",
        body: JSON.stringify({ name: "X" }),
      }),
      params("contents"),
    );
    expect(response.status).toBe(403);
    expect(createResource).not.toHaveBeenCalled();
  });

  it("PATCH sem permissão responde 403 e nunca altera o registro", async () => {
    requireActor.mockImplementation(denied(403));
    const response = await PATCH(
      new Request("https://x", {
        method: "PATCH",
        body: JSON.stringify({ name: "X" }),
      }),
      params("contents", uuid),
    );
    expect(response.status).toBe(403);
    expect(updateResource).not.toHaveBeenCalled();
  });

  it("exige a permissão de escrita do recurso solicitado", async () => {
    createResource.mockResolvedValue({ id: uuid });
    await POST(
      new Request("https://x", {
        method: "POST",
        body: JSON.stringify({ name: "X" }),
      }),
      params("devices"),
    );
    expect(requireActor).toHaveBeenCalledWith("device:write");
  });

  it("a listagem exige apenas autenticação, sem permissão de escrita", async () => {
    listResources.mockResolvedValue({ data: [], page: 1, limit: 25, total: 0 });
    await GET(
      new Request("https://x/api/admin/resources/contents"),
      params("contents"),
    );
    expect(requireActor).toHaveBeenCalledWith();
  });
});

describe("isolamento entre organizações", () => {
  it("cria sempre na organização do ator, ignorando organizationId do corpo", async () => {
    createResource.mockResolvedValue({ id: uuid });
    await POST(
      new Request("https://x", {
        method: "POST",
        body: JSON.stringify({ name: "Invasor", organizationId: "org-B" }),
      }),
      params("contents"),
    );
    expect(createResource).toHaveBeenCalledWith("contents", "org-A", "user-1", {
      name: "Invasor",
      organizationId: "org-B",
    });
  });

  it("lista somente dentro da organização do ator", async () => {
    listResources.mockResolvedValue({ data: [], page: 1, limit: 25, total: 0 });
    await GET(
      new Request(
        "https://x/api/admin/resources/contents?page=2&limit=10&search=abc",
      ),
      params("contents"),
    );
    expect(listResources).toHaveBeenCalledWith("contents", "org-A", {
      page: 2,
      limit: 10,
      search: "abc",
    });
  });

  it("atualiza escopado pela organização do ator", async () => {
    updateResource.mockResolvedValue({ id: uuid });
    await PATCH(
      new Request("https://x", {
        method: "PATCH",
        body: JSON.stringify({ name: "Novo" }),
      }),
      params("contents", uuid),
    );
    expect(updateResource).toHaveBeenCalledWith("contents", uuid, "org-A", {
      name: "Novo",
    });
  });

  it("responde 404 ao alterar registro de outra organização", async () => {
    updateResource.mockResolvedValue(undefined);
    const response = await PATCH(
      new Request("https://x", {
        method: "PATCH",
        body: JSON.stringify({ name: "Novo" }),
      }),
      params("contents", uuid),
    );
    expect(response.status).toBe(404);
    expect(audit).not.toHaveBeenCalled();
  });

  it("responde 404 ao excluir registro de outra organização", async () => {
    deleteResource.mockResolvedValue(undefined);
    const response = await DELETE(
      new Request("https://x"),
      params("contents", uuid),
    );
    expect(response.status).toBe(404);
    expect(deleteResource).toHaveBeenCalledWith("contents", uuid, "org-A");
    expect(audit).not.toHaveBeenCalled();
  });
});

describe("validação de parâmetros de rota", () => {
  it("rejeita recurso fora da lista permitida", async () => {
    const response = await GET(new Request("https://x"), params("usuarios"));
    expect(response.status).toBe(422);
    expect(listResources).not.toHaveBeenCalled();
  });

  it("rejeita recurso que tentaria alcançar o prototype", async () => {
    const response = await PATCH(
      new Request("https://x", { method: "PATCH", body: "{}" }),
      params("__proto__", uuid),
    );
    expect(response.status).toBe(422);
    expect(updateResource).not.toHaveBeenCalled();
  });

  it("rejeita id que não seja uuid", async () => {
    const response = await DELETE(
      new Request("https://x"),
      params("contents", "1 OR 1=1"),
    );
    expect(response.status).toBe(422);
    expect(deleteResource).not.toHaveBeenCalled();
  });

  it("limita o tamanho de página solicitado", async () => {
    const response = await GET(
      new Request("https://x/api/admin/resources/contents?limit=100000"),
      params("contents"),
    );
    expect(response.status).toBe(422);
    expect(listResources).not.toHaveBeenCalled();
  });
});

describe("trilha de auditoria", () => {
  it("registra criação com o ator e o registro resultante", async () => {
    const row = { id: uuid, name: "X" };
    createResource.mockResolvedValue(row);
    await POST(
      new Request("https://x", {
        method: "POST",
        body: JSON.stringify({ name: "X" }),
      }),
      params("contents"),
    );
    expect(audit).toHaveBeenCalledWith(
      actor,
      "create",
      "contents",
      uuid,
      undefined,
      row,
    );
  });

  it("registra exclusão com o estado anterior", async () => {
    const row = { id: uuid };
    deleteResource.mockResolvedValue(row);
    const response = await DELETE(
      new Request("https://x"),
      params("contents", uuid),
    );
    expect(response.status).toBe(200);
    expect(audit).toHaveBeenCalledWith(actor, "delete", "contents", uuid, row);
  });
});

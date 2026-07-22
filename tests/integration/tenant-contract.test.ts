import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";

/**
 * Executa as funções reais de acesso a dados contra um driver proxy que captura
 * o SQL efetivamente gerado. Diferente de inspecionar o código-fonte, isto prova
 * em tempo de execução que toda consulta é filtrada por organization_id.
 */
const { queries } = vi.hoisted(() => ({
  queries: [] as Array<{ sql: string; params: unknown[] }>,
}));

const db = drizzle(async (sql, params) => {
  queries.push({ sql, params });
  return { rows: [] };
});

vi.mock("@/db", () => ({ getDb: () => db }));

import {
  createResource,
  deleteResource,
  listResources,
  updateResource,
} from "@/server/resources";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ID = "33333333-3333-4333-8333-333333333333";

const resources = [
  "contents",
  "playlists",
  "channels",
  "devices",
  "schedules",
] as const;

beforeEach(() => (queries.length = 0));

/** Toda consulta emitida precisa restringir por organization_id = <org do ator>. */
function expectScopedToOrg(org: string) {
  expect(queries.length).toBeGreaterThan(0);
  for (const query of queries) {
    expect(query.sql).toMatch(/"organization_id"\s*=\s*\$\d+/);
    expect(query.params).toContain(org);
    expect(query.params).not.toContain(OTHER);
  }
}

describe("isolamento entre organizações no SQL gerado", () => {
  for (const resource of resources) {
    it(`filtra a listagem de ${resource} por organização`, async () => {
      await listResources(resource, ORG, { page: 1, limit: 25, search: "" });
      expectScopedToOrg(ORG);
    });

    it(`filtra a exclusão de ${resource} por organização`, async () => {
      await deleteResource(resource, ID, ORG);
      expectScopedToOrg(ORG);
      expect(queries[0]!.sql).toMatch(/^delete/i);
    });
  }

  it("aplica a busca textual sem sair do escopo da organização", async () => {
    await listResources("contents", ORG, { page: 1, limit: 25, search: "abc" });
    expectScopedToOrg(ORG);
    expect(queries.some((q) => q.params.includes("%abc%"))).toBe(true);
  });

  it("parametriza a busca em vez de interpolar, neutralizando injeção", async () => {
    await listResources("contents", ORG, {
      page: 1,
      limit: 25,
      search: "'; DROP TABLE contents; --",
    });
    for (const query of queries) {
      expect(query.sql).not.toContain("DROP TABLE");
    }
    expect(
      queries.some((q) => q.params.includes("%'; DROP TABLE contents; --%")),
    ).toBe(true);
  });

  it("insere sempre com a organização do ator", async () => {
    await createResource("playlists", ORG, "user-1", { name: "Nova playlist" });
    expect(queries[0]!.sql).toMatch(/^insert/i);
    expect(queries[0]!.params).toContain(ORG);
    expect(queries[0]!.params).not.toContain(OTHER);
  });

  it("ignora organizationId enviado no corpo da requisição", async () => {
    await createResource("playlists", ORG, "user-1", {
      name: "Nova playlist",
      organizationId: OTHER,
    });
    expect(queries[0]!.params).toContain(ORG);
    expect(queries[0]!.params).not.toContain(OTHER);
  });

  it("ignora id enviado no corpo, impedindo sobrescrever outro registro", async () => {
    await createResource("playlists", ORG, "user-1", {
      name: "Nova playlist",
      id: "44444444-4444-4444-8444-444444444444",
    });
    expect(queries[0]!.params).not.toContain(
      "44444444-4444-4444-8444-444444444444",
    );
  });

  it("restringe o update por organização além do id", async () => {
    await updateResource("playlists", ID, ORG, { name: "Renomeada" });
    expectScopedToOrg(ORG);
    expect(queries[0]!.sql).toMatch(/^update/i);
    expect(queries[0]!.params).toContain(ID);
  });

  it("não permite mover um registro para outra organização via update", async () => {
    await updateResource("playlists", ID, ORG, {
      name: "Renomeada",
      organizationId: OTHER,
    });
    expect(queries[0]!.params).not.toContain(OTHER);
  });
});

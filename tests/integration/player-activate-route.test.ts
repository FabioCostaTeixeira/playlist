import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";

/**
 * Reproduz a restrição real de produção: o driver neon-http não suporta
 * transações. Qualquer uso de `.transaction()` nesta rota volta a quebrar a
 * ativação com 500, então o banco falso rejeita a chamada do mesmo jeito.
 */
const { queries, nextRows } = vi.hoisted(() => ({
  queries: [] as Array<{ sql: string; params: unknown[] }>,
  nextRows: { value: [] as unknown[] },
}));

const db = drizzle(async (sql, params) => {
  queries.push({ sql, params });
  if (/^update "pairing_codes"/i.test(sql.trim()))
    return { rows: nextRows.value };
  return { rows: [] };
});

Object.defineProperty(db, "transaction", {
  value: () => {
    throw new Error("No transactions support in neon-http driver");
  },
});

vi.mock("@/db", () => ({ getDb: () => db }));
vi.mock("@/server/rate-limit", () => ({
  clientIp: () => "203.0.113.7",
  enforceRateLimit: vi.fn(),
}));

import { POST } from "@/app/api/player/activate/route";

const DEVICE = "55555555-5555-4555-8555-555555555555";
const activate = (code: string) =>
  POST(
    new Request("https://x/api/player/activate", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  );

beforeEach(() => {
  queries.length = 0;
  // pg-proxy entrega as linhas como arrays posicionais, na ordem do RETURNING.
  nextRows.value = [[DEVICE]];
});

describe("ativação do player", () => {
  it("emite o token sem usar transação, que o driver de produção não suporta", async () => {
    const response = await activate("123456");
    expect(response.status).toBe(200);
    const body = (await response.json()) as { token: string };
    expect(body.token).toMatch(/^[\w-]{20,}$/);
  });

  it("consome o código na mesma instrução que o valida", async () => {
    await activate("123456");
    const claim = queries[0]!;
    expect(claim.sql).toMatch(/^update "pairing_codes"/i);
    expect(claim.sql).toMatch(/"consumed_at"/);
    expect(claim.sql).toMatch(/returning/i);
    // Validade e uso único fazem parte do mesmo WHERE, sem leitura separada.
    expect(claim.sql).toMatch(/"consumed_at" is null/i);
    expect(claim.sql).toMatch(/"expires_at" >/i);
  });

  it("nunca envia o código em texto puro ao banco", async () => {
    await activate("123456");
    for (const query of queries) expect(query.params).not.toContain("123456");
  });

  it("guarda apenas o hash do token emitido", async () => {
    const response = await activate("123456");
    const { token } = (await response.json()) as { token: string };
    const insert = queries.find((q) =>
      /^insert into "device_tokens"/i.test(q.sql),
    );
    expect(insert).toBeDefined();
    expect(insert!.params).not.toContain(token);
  });

  it("ativa o dispositivo correspondente ao código", async () => {
    await activate("123456");
    const update = queries.find((q) => /^update "devices"/i.test(q.sql));
    expect(update).toBeDefined();
    expect(update!.params).toContain(DEVICE);
    expect(update!.params).toContain("active");
  });

  it("responde 401 quando o código não é reivindicado", async () => {
    nextRows.value = [];
    const response = await activate("123456");
    expect(response.status).toBe(401);
    expect(
      queries.some((q) => /insert into "device_tokens"/i.test(q.sql)),
    ).toBe(false);
  });

  it("recusa formato de código fora de seis dígitos", async () => {
    for (const invalid of ["12345", "1234567", "abcdef", ""]) {
      queries.length = 0;
      expect((await activate(invalid)).status).toBe(422);
      expect(queries).toHaveLength(0);
    }
  });
});

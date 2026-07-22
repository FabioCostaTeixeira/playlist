import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/db", () => ({ getDb: () => ({ execute }) }));

import {
  clientIp,
  consumeRateLimit,
  enforceRateLimit,
} from "@/server/rate-limit";

beforeEach(() => execute.mockReset());

/**
 * O driver neon-http usado em produção devolve `{ rows: [...] }`, enquanto
 * outros drivers devolvem o array direto. Ambos os formatos são exercitados:
 * tratar só o array fazia o login quebrar com 500 em produção.
 */
const shapes = {
  "objeto com rows (neon-http)": (rows: unknown[]) => ({
    rows,
    rowCount: rows.length,
  }),
  "array direto": (rows: unknown[]) => rows,
};

describe("consumeRateLimit", () => {
  for (const [shape, wrap] of Object.entries(shapes)) {
    it(`permite quando a contagem está dentro do limite — ${shape}`, async () => {
      execute.mockResolvedValue(wrap([{ count: 1, retry_after: 300 }]));
      await expect(
        consumeRateLimit("k", { max: 10, windowMs: 300_000 }),
      ).resolves.toEqual({ allowed: true, retryAfter: 300 });
    });

    it(`bloqueia quando a contagem ultrapassa o limite — ${shape}`, async () => {
      execute.mockResolvedValue(wrap([{ count: 11, retry_after: 240 }]));
      const decision = await consumeRateLimit("k", {
        max: 10,
        windowMs: 300_000,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.retryAfter).toBe(240);
    });
  }

  it("não quebra se o retorno vier vazio ou em formato inesperado", async () => {
    for (const result of [{ rows: [] }, [], null, undefined, {}]) {
      execute.mockResolvedValue(result);
      await expect(
        consumeRateLimit("k", { max: 10, windowMs: 300_000 }),
      ).resolves.toEqual({ allowed: true, retryAfter: 300 });
    }
  });
});

describe("enforceRateLimit", () => {
  it("não lança quando permitido", async () => {
    execute.mockResolvedValue([{ count: 3, retry_after: 100 }]);
    await expect(
      enforceRateLimit("k", { max: 10, windowMs: 300_000 }),
    ).resolves.toBeUndefined();
  });

  it("lança Response 429 com retry-after quando o limite é excedido", async () => {
    execute.mockResolvedValue([{ count: 11, retry_after: 180 }]);
    const error = await enforceRateLimit("k", {
      max: 10,
      windowMs: 300_000,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(429);
    expect((error as Response).headers.get("retry-after")).toBe("180");
  });
});

describe("clientIp", () => {
  it("usa o primeiro salto de x-forwarded-for", () => {
    const req = new Request("https://x", {
      headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18" },
    });
    expect(clientIp(req)).toBe("203.0.113.5");
  });

  it("recorre a x-real-ip e depois a unknown", () => {
    expect(
      clientIp(
        new Request("https://x", { headers: { "x-real-ip": "198.51.100.9" } }),
      ),
    ).toBe("198.51.100.9");
    expect(clientIp(new Request("https://x"))).toBe("unknown");
  });
});

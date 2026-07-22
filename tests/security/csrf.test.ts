import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "@/proxy";

const APP = "https://central.exemplo.com";

function request(
  method: string,
  {
    origin,
    host = "central.exemplo.com",
  }: { origin?: string; host?: string } = {},
) {
  const headers = new Headers({ host, "x-forwarded-proto": "https" });
  if (origin) headers.set("origin", origin);
  return new NextRequest(`${APP}/api/admin/resources/contents`, {
    method,
    headers,
  });
}

beforeEach(() => (process.env.BETTER_AUTH_URL = APP));
afterEach(() => delete process.env.BETTER_AUTH_URL);

describe("verificação de origem nas rotas administrativas", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    it(`bloqueia ${method} vindo de outro site`, async () => {
      const response = proxy(
        request(method, { origin: "https://site-malicioso.com" }),
      );
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: "Origem não permitida",
      });
    });

    it(`bloqueia ${method} sem cabeçalho Origin`, () => {
      expect(proxy(request(method)).status).toBe(403);
    });

    it(`permite ${method} da própria origem`, () => {
      expect(proxy(request(method, { origin: APP })).status).toBe(200);
    });
  }

  it("permite leitura sem exigir Origin", () => {
    expect(proxy(request("GET")).status).toBe(200);
    expect(proxy(request("HEAD")).status).toBe(200);
  });

  it("aceita a origem derivada do host quando BETTER_AUTH_URL não está definida", () => {
    delete process.env.BETTER_AUTH_URL;
    expect(proxy(request("POST", { origin: APP })).status).toBe(200);
    expect(
      proxy(request("POST", { origin: "https://site-malicioso.com" })).status,
    ).toBe(403);
  });

  it("não confia em origem que apenas contém o host esperado", () => {
    expect(
      proxy(request("POST", { origin: "https://central.exemplo.com.evil.com" }))
        .status,
    ).toBe(403);
  });

  it("ignora BETTER_AUTH_URL malformada sem liberar origem estranha", () => {
    process.env.BETTER_AUTH_URL = "nao-e-url";
    expect(
      proxy(request("POST", { origin: "https://site-malicioso.com" })).status,
    ).toBe(403);
    expect(proxy(request("POST", { origin: APP })).status).toBe(200);
  });
});

describe("alcance do proxy", () => {
  it("cobre as rotas autenticadas por cookie e nenhuma outra", () => {
    expect(config.matcher).toEqual(["/api/admin/:path*", "/api/upload"]);
    // /api/auth tem checagem própria do Better Auth e /api/player usa Bearer.
    expect(config.matcher).not.toContain("/api/auth/:path*");
    expect(config.matcher).not.toContain("/api/player/:path*");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, limit, headersMock } = vi.hoisted(() => ({
  getSession: vi.fn(),
  limit: vi.fn(),
  headersMock: vi.fn(async () => new Headers()),
}));

vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("@/server/auth", () => ({
  getAuth: () => ({ api: { getSession } }),
}));
vi.mock("@/db", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({ innerJoin: () => ({ where: () => ({ limit }) }) }),
    }),
  }),
}));

import { getActor, permissionFor, requireActor } from "@/server/access";

const member = {
  organizationId: "org-A",
  organizationName: "Org A",
  role: "viewer" as const,
};

beforeEach(() => {
  process.env.DATABASE_URL = "postgres://test";
  getSession.mockReset();
  limit.mockReset();
  getSession.mockResolvedValue({ user: { id: "user-1" } });
  limit.mockResolvedValue([member]);
});

afterEach(() => delete process.env.DATABASE_URL);

async function statusOf(promise: Promise<unknown>) {
  const error = await promise.then(() => null).catch((e) => e);
  expect(error).toBeInstanceOf(Response);
  return (error as Response).status;
}

describe("getActor", () => {
  it("retorna null sem DATABASE_URL, sem consultar a sessão", async () => {
    delete process.env.DATABASE_URL;
    await expect(getActor()).resolves.toBeNull();
    expect(getSession).not.toHaveBeenCalled();
  });

  it("retorna null quando não há sessão", async () => {
    getSession.mockResolvedValue(null);
    await expect(getActor()).resolves.toBeNull();
  });

  it("retorna null quando a sessão não tem vínculo ativo com organização", async () => {
    limit.mockResolvedValue([]);
    await expect(getActor()).resolves.toBeNull();
  });

  it("deriva organizationId do vínculo no banco, nunca da requisição", async () => {
    limit.mockResolvedValue([{ ...member, role: "admin" as const }]);
    await expect(getActor()).resolves.toEqual({
      userId: "user-1",
      organizationId: "org-A",
      organizationName: "Org A",
      role: "admin",
    });
  });
});

describe("requireActor", () => {
  it("responde 401 para anônimo", async () => {
    getSession.mockResolvedValue(null);
    expect(await statusOf(requireActor())).toBe(401);
  });

  it("responde 401 para usuário sem organização ativa", async () => {
    limit.mockResolvedValue([]);
    expect(await statusOf(requireActor("content:write"))).toBe(401);
  });

  it("autentica sem permissão exigida mesmo para viewer", async () => {
    await expect(requireActor()).resolves.toMatchObject({ role: "viewer" });
  });

  const matrix = [
    {
      role: "viewer",
      allowed: [],
      denied: ["content:write", "device:write", "user:manage"],
    },
    {
      role: "editor",
      allowed: ["content:write", "playlist:write"],
      denied: [
        "channel:write",
        "device:write",
        "user:manage",
        "emergency:write",
      ],
    },
    {
      role: "operator",
      allowed: ["channel:write", "device:write", "schedule:write"],
      denied: ["content:write", "playlist:write", "user:manage", "audit:read"],
    },
    {
      role: "admin",
      allowed: [
        "content:write",
        "playlist:write",
        "channel:write",
        "device:write",
        "schedule:write",
        "emergency:write",
        "audit:read",
        "user:manage",
      ],
      denied: [],
    },
  ] as const;

  for (const { role, allowed, denied } of matrix) {
    for (const permission of allowed) {
      it(`permite ${role} em ${permission}`, async () => {
        limit.mockResolvedValue([{ ...member, role }]);
        await expect(requireActor(permission)).resolves.toMatchObject({ role });
      });
    }
    for (const permission of denied) {
      it(`responde 403 para ${role} em ${permission}`, async () => {
        limit.mockResolvedValue([{ ...member, role }]);
        expect(await statusOf(requireActor(permission))).toBe(403);
      });
    }
  }
});

describe("permissionFor", () => {
  it("mapeia cada recurso à sua permissão de escrita", () => {
    expect(permissionFor("contents")).toBe("content:write");
    expect(permissionFor("playlists")).toBe("playlist:write");
    expect(permissionFor("channels")).toBe("channel:write");
    expect(permissionFor("devices")).toBe("device:write");
    expect(permissionFor("schedules")).toBe("schedule:write");
  });

  it("rejeita recurso desconhecido com 404", () => {
    let thrown: unknown;
    try {
      permissionFor("__proto__");
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(404);
  });
});

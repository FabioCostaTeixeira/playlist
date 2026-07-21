import { describe, expect, it, vi } from "vitest";
import { api } from "@/server/http";

describe("respostas da API", () => {
  it("preserva respostas de domínio lançadas pela operação", async () => {
    const response = await api(async () => {
      throw new Response("Não encontrado", { status: 404 });
    });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Não encontrado");
  });

  it("traduz referência em uso para conflito legível", async () => {
    const response = await api(async () => {
      throw { code: "23503" };
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Este registro está em uso e não pode ser excluído.",
    });
  });

  it("traduz chave única duplicada para conflito legível", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await api(async () => {
      throw { code: "23505" };
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Já existe um registro com estes dados.",
    });
    consoleError.mockRestore();
  });
});

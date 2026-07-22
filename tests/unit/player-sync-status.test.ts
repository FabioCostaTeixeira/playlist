import { describe, expect, it } from "vitest";
import {
  explainBootstrapFailure,
  isReachable,
  PlayerSyncError,
  syncFailureMessage,
} from "@/features/player/sync-status";

describe("explainBootstrapFailure", () => {
  it("orienta a repareamento quando o token não vale mais", () => {
    const error = explainBootstrapFailure(401, "Token inválido ou revogado");
    expect(error.message).toMatch(/desconectada/i);
    expect(error.message).toMatch(/novo código/i);
  });

  it("aproveita o motivo da central quando a tela está sem programação", () => {
    const error = explainBootstrapFailure(409, "Dispositivo sem programação");
    expect(error.message).toContain("Dispositivo sem programação");
    expect(error.message).toMatch(/central/i);
  });

  it("cobre também canal sem playlist publicada", () => {
    const error = explainBootstrapFailure(409, "Canal sem playlist ativa");
    expect(error.message).toContain("Canal sem playlist ativa");
  });

  it("tem texto próprio se a central não explicar", () => {
    expect(explainBootstrapFailure(409, "").message).toMatch(
      /não tem programação/i,
    );
    expect(explainBootstrapFailure(500, "").message).toMatch(
      /não foi possível/i,
    );
  });
});

describe("isReachable", () => {
  it("considera a central acessível quando ela respondeu, mesmo recusando", () => {
    expect(isReachable(explainBootstrapFailure(409, "x"))).toBe(true);
  });

  it("considera inacessível quando a requisição nem chegou", () => {
    expect(isReachable(new TypeError("Failed to fetch"))).toBe(false);
    expect(isReachable(new Error("qualquer"))).toBe(false);
  });
});

describe("syncFailureMessage", () => {
  it("não fala em falta de conexão quando a central respondeu", () => {
    const message = syncFailureMessage(
      explainBootstrapFailure(409, "Dispositivo sem programação"),
      false,
    );
    expect(message).not.toMatch(/sem conexão/i);
    expect(message).toContain("Dispositivo sem programação");
  });

  it("orienta a checar a rede quando a falha é de rede e não há nada em cache", () => {
    const message = syncFailureMessage(new TypeError("Failed to fetch"), false);
    expect(message).toMatch(/sem conexão/i);
    expect(message).toMatch(/verifique a rede/i);
  });

  it("só promete continuidade quando existe programação em cache", () => {
    const semCache = syncFailureMessage(new TypeError("x"), false);
    const comCache = syncFailureMessage(new TypeError("x"), true);
    expect(semCache).not.toMatch(/última programação/i);
    expect(comCache).toMatch(/última programação válida/i);
  });

  it("mantém o motivo da central junto do aviso de continuidade", () => {
    const message = syncFailureMessage(
      new PlayerSyncError("Canal sem playlist ativa"),
      true,
    );
    expect(message).toContain("Canal sem playlist ativa");
    expect(message).toMatch(/última programação válida/i);
  });
});

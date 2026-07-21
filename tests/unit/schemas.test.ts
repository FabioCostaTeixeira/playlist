import { describe, expect, it } from "vitest";
import {
  contentInput,
  contentPatchInput,
  emergencyInput,
  eventBatchInput,
} from "@/shared/schemas";

describe("validação de conteúdo", () => {
  it("aceita URL HTTPS pública", () =>
    expect(
      contentInput.safeParse({
        name: "Painel",
        type: "url",
        sourceUrl: "https://example.com/painel",
        defaultDurationSeconds: 10,
      }).success,
    ).toBe(true));
  it.each([
    "javascript:alert(1)",
    "http://example.com",
    "https://localhost/x",
    "file:///etc/passwd",
  ])("rejeita origem insegura %s", (sourceUrl) =>
    expect(
      contentInput.safeParse({ name: "Painel", type: "url", sourceUrl })
        .success,
    ).toBe(false),
  );
  it("exige HTML quando tipo é html", () =>
    expect(contentInput.safeParse({ name: "Card", type: "html" }).success).toBe(
      false,
    ));
  it("aceita atualização parcial de status", () =>
    expect(contentPatchInput.safeParse({ status: "active" }).success).toBe(
      true,
    ));
});

describe("operação", () => {
  it("exige expiração futura na emergência", () =>
    expect(
      emergencyInput.safeParse({
        targetType: "channel",
        playlistId: crypto.randomUUID(),
        endsAt: new Date(0),
      }).success,
    ).toBe(false));
  it("limita lote de telemetria", () =>
    expect(
      eventBatchInput.safeParse({
        batchId: crypto.randomUUID(),
        events: Array.from({ length: 501 }, () => ({
          type: "play",
          at: new Date().toISOString(),
        })),
      }).success,
    ).toBe(false));
});

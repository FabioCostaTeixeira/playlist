import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureException, logEvent } from "@/server/observability";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.SENTRY_DSN;
});

describe("logEvent", () => {
  it("emite uma única linha JSON com nível e evento", () => {
    logEvent("info", "teste", { foo: "bar" });
    const line = vi.mocked(console.info).mock.calls[0]![0] as string;
    expect(JSON.parse(line)).toMatchObject({
      level: "info",
      event: "teste",
      foo: "bar",
    });
  });

  it("remove campos sensíveis do log", () => {
    logEvent("info", "teste", {
      password: "segredo",
      authorization: "Bearer x",
      ok: 1,
    });
    const parsed = JSON.parse(
      vi.mocked(console.info).mock.calls[0]![0] as string,
    );
    expect(parsed.password).toBeUndefined();
    expect(parsed.authorization).toBeUndefined();
    expect(parsed.ok).toBe(1);
  });
});

describe("captureException", () => {
  it("retorna um id de correlação presente também no log", async () => {
    const eventId = await captureException(new Error("falhou"));
    expect(eventId).toMatch(uuidPattern);
    const parsed = JSON.parse(
      vi.mocked(console.error).mock.calls[0]![0] as string,
    );
    expect(parsed).toMatchObject({
      event: "api_error",
      eventId,
      name: "Error",
    });
  });

  it("não envia nada quando SENTRY_DSN não está configurado", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await captureException(new Error("falhou"));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("envia um envelope válido quando SENTRY_DSN está configurado", async () => {
    process.env.SENTRY_DSN = "https://publickey@o1.ingest.sentry.io/42";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    const eventId = await captureException(new Error("falhou"), { rota: "/x" });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://o1.ingest.sentry.io/api/42/envelope/?sentry_key=publickey&sentry_version=7",
    );
    const [header, itemHeader, payload] = String(init!.body)
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(header.event_id).toBe(eventId);
    expect(itemHeader).toEqual({ type: "event" });
    expect(payload.exception.values[0]).toMatchObject({
      type: "Error",
      value: "falhou",
    });
    expect(payload.extra).toMatchObject({ rota: "/x" });
  });

  it("não propaga erro se o envio ao Sentry falhar", async () => {
    process.env.SENTRY_DSN = "https://publickey@o1.ingest.sentry.io/42";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("rede caiu"));
    await expect(captureException(new Error("falhou"))).resolves.toMatch(
      uuidPattern,
    );
  });

  it("ignora DSN malformado sem tentar enviar", async () => {
    process.env.SENTRY_DSN = "nao-e-uma-url";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(captureException(new Error("falhou"))).resolves.toMatch(
      uuidPattern,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

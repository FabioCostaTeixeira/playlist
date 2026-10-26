import { describe, expect, it } from "vitest";
import { getLoginErrorMessage } from "@/components/app/login-form";

describe("getLoginErrorMessage", () => {
  it("maps invalid credentials to credential message", () => {
    expect(getLoginErrorMessage({ status: 401, code: "INVALID_EMAIL_OR_PASSWORD" })).toBe("E-mail ou senha inválidos.");
  });

  it("maps rate limiting to retry message", () => {
    expect(getLoginErrorMessage({ status: 429 })).toBe("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  });

  it("maps server failures to unavailable message", () => {
    expect(getLoginErrorMessage({ status: 500 })).toBe("Serviço temporariamente indisponível. Tente novamente em alguns minutos.");
  });

  it("accepts Better Auth statusCode for server failures", () => {
    expect(getLoginErrorMessage({ statusCode: 503 })).toBe("Serviço temporariamente indisponível. Tente novamente em alguns minutos.");
  });

  it("maps network errors to unavailable message", () => {
    expect(getLoginErrorMessage(new TypeError("Failed to fetch"))).toBe("Serviço temporariamente indisponível. Tente novamente em alguns minutos.");
  });
});

import { describe, expect, it } from "vitest";
import { validateBootstrapCredentials } from "@/shared/bootstrap";

const valid = {
  BOOTSTRAP_ADMIN_EMAIL: "fabio@minhaempresa.com.br",
  BOOTSTRAP_ADMIN_PASSWORD: "9xK2-vlq!Tzp7Rd",
  BETTER_AUTH_SECRET: "K7pQz2vXm9Rt4WbN8yLc3Ju6Hs1Fd5Ge0Ao",
};

const rejects = (env: Partial<typeof valid>, message: string | RegExp) =>
  expect(() => validateBootstrapCredentials({ ...valid, ...env })).toThrow(
    message,
  );

describe("validateBootstrapCredentials", () => {
  it("aceita credenciais próprias e normaliza o e-mail", () => {
    expect(
      validateBootstrapCredentials({
        ...valid,
        BOOTSTRAP_ADMIN_EMAIL: "  Fabio@MinhaEmpresa.com.br ",
      }),
    ).toEqual({
      email: "fabio@minhaempresa.com.br",
      password: valid.BOOTSTRAP_ADMIN_PASSWORD,
      secret: valid.BETTER_AUTH_SECRET,
    });
  });

  it("recusa o e-mail de exemplo que vinha no .env.example", () => {
    rejects(
      { BOOTSTRAP_ADMIN_EMAIL: "admin@example.com" },
      /endereço de exemplo/,
    );
  });

  it("recusa a senha de exemplo que vinha no .env.example", () => {
    rejects(
      { BOOTSTRAP_ADMIN_PASSWORD: "change-me-with-12-or-more-characters" },
      /valor de exemplo/,
    );
  });

  it("recusa o segredo de exemplo que vinha no .env.example", () => {
    rejects(
      { BETTER_AUTH_SECRET: "generate-at-least-32-random-characters" },
      /valor de exemplo/,
    );
  });

  it("recusa qualquer variação de placeholder change-me", () => {
    rejects(
      { BOOTSTRAP_ADMIN_PASSWORD: "Change-Me-Agora-2026" },
      /valor de exemplo/,
    );
  });

  it("exige e-mail presente e bem formado", () => {
    rejects({ BOOTSTRAP_ADMIN_EMAIL: "" }, /obrigatória/);
    rejects({ BOOTSTRAP_ADMIN_EMAIL: "sem-arroba" }, /inválida/);
  });

  it("exige senha presente e com 12+ caracteres", () => {
    rejects({ BOOTSTRAP_ADMIN_PASSWORD: "" }, /obrigatória/);
    rejects({ BOOTSTRAP_ADMIN_PASSWORD: "curta1!" }, /12\+/);
  });

  it("recusa senha longa porém sem variação de caracteres", () => {
    rejects(
      { BOOTSTRAP_ADMIN_PASSWORD: "aaaaaaaaaaaaaaaa" },
      /variação insuficiente/,
    );
  });

  it("exige segredo de sessão presente e com 32+ caracteres", () => {
    rejects({ BETTER_AUTH_SECRET: "" }, /obrigatória/);
    rejects({ BETTER_AUTH_SECRET: "curto-demais-para-assinar" }, /32\+/);
  });
});

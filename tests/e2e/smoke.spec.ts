import { expect, test } from "@playwright/test";

test("login administrativo está acessível", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Bem-vindo de volta" }),
  ).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("player mostra ativação legível", async ({ page }) => {
  await page.goto("/player");
  await expect(
    page.getByRole("heading", { name: "Ativar tela" }),
  ).toBeVisible();
  await expect(page.getByLabel("Código de ativação")).toBeVisible();
});

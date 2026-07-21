import { expect, test } from "@playwright/test";

const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

test("cria dispositivo com código, edita, persiste e exclui", async ({
  page,
}, testInfo) => {
  test.skip(
    !adminEmail || !adminPassword,
    "Defina BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD para o fluxo autenticado.",
  );

  const suffix = `${testInfo.project.name}-${Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const name = `Dispositivo E2E ${suffix}`;
  const slug = `dispositivo-${suffix}`;
  let deviceId: string | undefined;

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(adminEmail!);
  await page.getByLabel("Senha").fill(adminPassword!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  try {
    await page.goto("/dispositivos");
    await expect(
      page.getByRole("heading", { name: "Dispositivos" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Novo dispositivo" }).click();
    const createDialog = page.getByRole("dialog", {
      name: "Novo dispositivo",
    });
    await createDialog.getByLabel("Nome").fill(name);
    await createDialog.getByLabel("Identificador").fill(slug);
    await createDialog.getByLabel("Local").fill("Recepção E2E");
    await createDialog.getByLabel("Descrição").fill("Criado pelo Playwright");
    const createResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/admin/resources/devices") &&
        response.request().method() === "POST",
    );
    await createDialog.getByRole("button", { name: "Salvar" }).click();
    const response = await createResponse;
    expect(response.ok()).toBe(true);
    deviceId = ((await response.json()) as { id: string }).id;

    const pairingDialog = page.getByRole("dialog", {
      name: "Código de pareamento",
    });
    await expect(pairingDialog).toBeVisible();
    await expect(pairingDialog).toContainText(/\b\d{6}\b/);
    await pairingDialog.getByRole("button", { name: "Concluído" }).click();

    let row = page.getByRole("row", { name: new RegExp(name) });
    await expect(row).toContainText("Recepção E2E");
    await row.getByRole("button", { name: "Ações" }).click();
    await page.getByRole("menuitem", { name: "Editar" }).click();
    const editDialog = page.getByRole("dialog", {
      name: "Editar dispositivo",
    });
    await expect(editDialog.getByLabel("Nome")).toHaveValue(name);
    await editDialog.getByLabel("Local").fill("Sala editada E2E");
    await editDialog.getByRole("button", { name: "Salvar" }).click();
    await expect(editDialog).toBeHidden();

    await page.reload();
    row = page.getByRole("row", { name: new RegExp(name) });
    await expect(row).toContainText("Sala editada E2E");

    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Ações" }).click();
    await page.getByRole("menuitem", { name: "Excluir" }).click();
    await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(
      0,
    );

    await page.reload();
    await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(
      0,
    );
    deviceId = undefined;
  } finally {
    if (deviceId) {
      await page.request.delete(`/api/admin/resources/devices/${deviceId}`);
    }
  }
});

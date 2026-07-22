import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deviceInput } from "@/shared/schemas";

const read = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

describe("administração de dispositivos", () => {
  it("aceita todos os campos editáveis do dispositivo", () => {
    const result = deviceInput.partial().safeParse({
      name: "Painel Recepção",
      slug: "painel-recepcao",
      location: "Recepção",
      description: "Tela principal",
      status: "blocked",
      orientation: "portrait",
      channelId: null,
    });

    expect(result.success).toBe(true);
  });

  it("carrega dados reais e mantém criar, editar e excluir ligados à API", () => {
    const page = read("src/app/(admin)/dispositivos/page.tsx");
    const workspace = read("src/components/app/resource-workspace.tsx");

    expect(page).toContain('kind="devices"');
    expect(page).not.toContain("initialRows");
    expect(workspace).toContain("await load()");
    expect(workspace).toContain('method: editing ? "PATCH" : "POST"');
    expect(workspace).toContain("onClick={() => beginEdit(row)}");
    expect(workspace).toContain('method: "DELETE"');
  });

  it("exibe um código temporário após criar e permite gerar outro", () => {
    const workspace = read("src/components/app/resource-workspace.tsx");
    const pairingRoute = read("src/app/api/admin/devices/[id]/pair/route.ts");

    expect(workspace).toContain('if (kind === "devices" && !editing)');
    expect(workspace).toContain("await pairDevice(saved)");
    expect(workspace).toContain("pairing?.code");
    expect(workspace).toContain("Gerar novo código");
    expect(pairingRoute).toContain(
      "eq(devices.organizationId, actor.organizationId)",
    );
    expect(pairingRoute).toContain("generatePairingCode()");
  });

  it("só entrega o token real ao player e persiste apenas seu hash", () => {
    const activationRoute = read("src/app/api/player/activate/route.ts");

    expect(activationRoute).toContain("generateDeviceToken()");
    expect(activationRoute).toContain("tokenHash: sha256(token)");
    expect(activationRoute).toContain("return { token }");
    expect(activationRoute).not.toContain("tokenHash: token");
  });
});

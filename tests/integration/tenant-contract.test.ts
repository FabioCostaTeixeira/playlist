import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("contrato de isolamento tenant", () => {
  it("escopa todas mutações genéricas por organizationId", () => { const source = readFileSync(new URL("../../src/server/resources.ts", import.meta.url), "utf8"); expect(source.match(/organizationId/g)?.length).toBeGreaterThan(15); expect(source).toContain("eq(devices.organizationId, organizationId)"); expect(source).toContain("eq(contents.organizationId, organizationId)"); });
  it("não aceita organizationId do payload", () => { const source = readFileSync(new URL("../../src/shared/schemas.ts", import.meta.url), "utf8"); expect(source).not.toContain("organizationId:"); });
});

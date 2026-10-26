import { beforeEach, describe, expect, it, vi } from "vitest";

const { pingDatabase, databaseState } = vi.hoisted(() => ({ pingDatabase: vi.fn(), databaseState: { configured: true } }));

vi.mock("@/db", () => ({
  pingDatabase,
  isDatabaseConfigured: () => databaseState.configured,
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    pingDatabase.mockReset();
    databaseState.configured = true;
  });

  it("returns healthy only after database ping succeeds", async () => {
    pingDatabase.mockResolvedValueOnce(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "ok", database: "ok", databaseConfigured: true });
    expect(pingDatabase).toHaveBeenCalledWith(3_000);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns degraded without leaking database error details", async () => {
    pingDatabase.mockRejectedValueOnce(new Error("secret connection string"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ status: "degraded", database: "unavailable", databaseConfigured: true });
    expect(JSON.stringify(body)).not.toContain("secret connection string");
  });

  it("reports an unconfigured database without attempting a query", async () => {
    databaseState.configured = false;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "degraded", database: "not_configured", databaseConfigured: false });
    expect(pingDatabase).not.toHaveBeenCalled();
  });
});

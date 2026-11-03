import { describe, expect, it, vi } from "vitest";
import type { PeerCertificate } from "node:tls";
import { buildPostgresOptions, normalizePem, queryWithTimeout } from "@/db/connection";

const CA = "-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----";
const certFor = (ip: string) => ({ subject: { CN: ip }, subjectaltname: `IP Address:${ip}` }) as unknown as PeerCertificate;

describe("buildPostgresOptions", () => {
  it("disables prepared statements for PgBouncer transaction pooling", () => {
    const options = buildPostgresOptions("postgresql://u:p@db.example.com:5432/app?sslmode=require");
    expect(options.prepare).toBe(false);
    expect(options.max).toBeGreaterThan(0);
  });

  it("leaves TLS to the URL sslmode when no CA is given (Neon)", () => {
    const options = buildPostgresOptions("postgresql://u:p@ep-x.sa-east-1.aws.neon.tech/neondb?sslmode=require");
    expect(options.ssl).toBeUndefined();
  });

  it("pins the private CA and verifies the IP address when the host is an IP", () => {
    const options = buildPostgresOptions("postgresql://u:p@13.140.34.131:15432/playlist", CA);
    const ssl = options.ssl as { ca: string; rejectUnauthorized: boolean; checkServerIdentity: (host: string, cert: PeerCertificate) => Error | undefined };
    expect(ssl.ca).toBe(CA);
    expect(ssl.rejectUnauthorized).toBe(true);
    // postgres-js passa "localhost" como host quando o destino é IP; a checagem precisa usar o IP real.
    expect(ssl.checkServerIdentity("localhost", certFor("13.140.34.131"))).toBeUndefined();
    expect(ssl.checkServerIdentity("localhost", certFor("10.0.0.9"))).toBeInstanceOf(Error);
  });

  it("pins the CA but keeps default hostname verification for DNS hosts", () => {
    const options = buildPostgresOptions("postgresql://u:p@db.example.com:15432/playlist", CA);
    const ssl = options.ssl as Record<string, unknown>;
    expect(ssl.ca).toBe(CA);
    expect(ssl.rejectUnauthorized).toBe(true);
    expect(ssl.checkServerIdentity).toBeUndefined();
  });
});

describe("normalizePem", () => {
  it("turns escaped newlines from env vars into real newlines", () => {
    expect(normalizePem("-----BEGIN CERTIFICATE-----\\nMIIBfake\\n-----END CERTIFICATE-----")).toBe(CA);
  });

  it("returns undefined for empty values", () => {
    expect(normalizePem(undefined)).toBeUndefined();
    expect(normalizePem("  ")).toBeUndefined();
  });
});

describe("queryWithTimeout", () => {
  it("resolves when the query finishes in time", async () => {
    const query = Object.assign(Promise.resolve([{ ok: 1 }]), { cancel: vi.fn() });
    await expect(queryWithTimeout(query, 1_000)).resolves.toEqual([{ ok: 1 }]);
    expect(query.cancel).not.toHaveBeenCalled();
  });

  it("cancels and rejects a query that exceeds the timeout", async () => {
    vi.useFakeTimers();
    try {
      const query = Object.assign(new Promise(() => {}), { cancel: vi.fn() });
      const result = queryWithTimeout(query, 3_000);
      const assertion = expect(result).rejects.toThrow("tempo limite");
      await vi.advanceTimersByTimeAsync(3_000);
      await assertion;
      expect(query.cancel).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
});

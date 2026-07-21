import { describe, expect, it } from "vitest";
import { redact, sanitizeUserHtml, sha256 } from "@/server/security";

describe("hardening", () => {
  it("remove script, handler e esquema javascript do HTML", () => { const value = sanitizeUserHtml('<script>alert(1)</script><img src="javascript:alert(2)" onerror="alert(3)"><p>ok</p>'); expect(value).not.toMatch(/script|onerror|javascript/i); expect(value).toContain("<p>ok</p>"); });
  it("remove segredos da auditoria", () => expect(redact({ name: "ok", token: "raw", passwordHash: "raw" })).toEqual({ name: "ok" }));
  it("gera hash determinístico sem manter token", () => { const hash = sha256("secret"); expect(hash).toHaveLength(64); expect(hash).not.toContain("secret"); });
});

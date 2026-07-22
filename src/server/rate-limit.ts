import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export type RateLimitRule = { max: number; windowMs: number };
export type RateLimitDecision = { allowed: boolean; retryAfter: number };

/**
 * Atomic, serverless-safe rate limiter backed by the `rate_limits` table.
 * A single INSERT ... ON CONFLICT statement increments the counter and resets
 * the window when it has elapsed, so concurrent requests cannot bypass the cap
 * (unlike a check-then-write pattern). Shared across all serverless instances.
 */
export async function consumeRateLimit(
  key: string,
  rule: RateLimitRule,
): Promise<RateLimitDecision> {
  const seconds = Math.max(1, Math.ceil(rule.windowMs / 1000));
  const [row] = (await getDb().execute(sql`
    INSERT INTO rate_limits (key, count, expires_at)
    VALUES (${key}, 1, now() + (${seconds} * interval '1 second'))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.expires_at < now() THEN 1 ELSE rate_limits.count + 1 END,
      expires_at = CASE WHEN rate_limits.expires_at < now()
        THEN now() + (${seconds} * interval '1 second')
        ELSE rate_limits.expires_at END
    RETURNING count, extract(epoch from (expires_at - now()))::int AS retry_after
  `)) as unknown as Array<{ count: number; retry_after: number }>;
  const count = Number(row?.count ?? 1);
  const retryAfter = Math.max(0, Number(row?.retry_after ?? seconds));
  await pruneExpired();
  return { allowed: count <= rule.max, retryAfter };
}

/**
 * Drops rows whose window closed long ago. Runs on ~1% of calls so the table
 * does not grow unbounded with one row per distinct caller, without adding a
 * delete to every request.
 */
async function pruneExpired() {
  if (Math.random() >= 0.01) return;
  try {
    await getDb().execute(
      sql`DELETE FROM rate_limits WHERE expires_at < now() - interval '1 day'`,
    );
  } catch {
    // Housekeeping only: never fail a request because pruning failed.
  }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Enforce a rate limit inside a route handler. Throws a 429 `Response`
 * (caught by `api()`) when the caller exceeds the rule.
 */
export async function enforceRateLimit(
  key: string,
  rule: RateLimitRule,
): Promise<void> {
  const { allowed, retryAfter } = await consumeRateLimit(key, rule);
  if (!allowed)
    throw new Response(
      JSON.stringify({
        error: "Muitas tentativas. Tente novamente em instantes.",
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(retryAfter),
        },
      },
    );
}

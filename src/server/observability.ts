import "server-only";
import { randomUUID } from "node:crypto";
import { redact } from "@/server/security";

type Level = "info" | "warn" | "error";

/**
 * Single-line JSON to stdout. Vercel (and any log drain) ingests this as
 * structured data, so errors are queryable and alertable by field instead of
 * being free-text `console.error` output.
 */
export function logEvent(
  level: Level,
  event: string,
  fields?: Record<string, unknown>,
) {
  const line = JSON.stringify({
    level,
    event,
    at: new Date().toISOString(),
    ...redact(fields),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/** Parses `https://<key>@<host>/<projectId>` into its envelope parts. */
function parseDsn(dsn: string) {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    if (!url.username || !projectId) return null;
    return {
      endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/?sentry_key=${url.username}&sentry_version=7`,
    };
  } catch {
    return null;
  }
}

async function sendToSentry(
  eventId: string,
  error: unknown,
  fields: Record<string, unknown> | undefined,
) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const parsed = parseDsn(dsn);
  if (!parsed) return;
  const sentAt = new Date().toISOString();
  const payload = {
    event_id: eventId,
    timestamp: sentAt,
    platform: "node",
    level: "error",
    environment: process.env.NODE_ENV ?? "development",
    exception: {
      values: [
        {
          type: error instanceof Error ? error.name : "UnknownError",
          value: error instanceof Error ? error.message : String(error),
          stacktrace:
            error instanceof Error && error.stack
              ? { frames: [{ filename: error.stack.split("\n")[1]?.trim() }] }
              : undefined,
        },
      ],
    },
    extra: redact(fields),
  };
  const body = [
    JSON.stringify({ event_id: eventId, sent_at: sentAt }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(payload),
  ].join("\n");
  try {
    await fetch(parsed.endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body,
    });
  } catch {
    // Never let the reporter break the request it is reporting on.
  }
}

/**
 * Records an unexpected error and returns a correlation id that is safe to
 * surface to the client, so a user-reported failure can be traced back to the
 * exact log line without leaking internals.
 */
export async function captureException(
  error: unknown,
  fields?: Record<string, unknown>,
): Promise<string> {
  const eventId = randomUUID();
  logEvent("error", "api_error", {
    eventId,
    name: error instanceof Error ? error.name : "unknown",
    message: error instanceof Error ? error.message : undefined,
    ...fields,
  });
  await sendToSentry(eventId, error, fields);
  return eventId;
}

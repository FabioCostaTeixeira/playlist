import { isDatabaseConfigured, pingDatabase } from "@/db";

const DATABASE_TIMEOUT_MS = 3_000;

async function checkDatabase(): Promise<"ok"> {
  await pingDatabase(DATABASE_TIMEOUT_MS);
  return "ok";
}

export async function GET() {
  const databaseConfigured = isDatabaseConfigured();
  const database = !databaseConfigured ? "not_configured" : await checkDatabase().catch(() => "unavailable");
  const healthy = database === "ok" || database === "not_configured";
  return Response.json(
    { status: database === "ok" ? "ok" : "degraded", database, databaseConfigured, blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN), time: new Date().toISOString() },
    { status: healthy ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}

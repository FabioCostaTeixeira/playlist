import { isDatabaseConfigured } from "@/db";

export function GET() {
  return Response.json({ status: "ok", databaseConfigured: isDatabaseConfigured(), blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN), time: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
}

import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { buildPostgresOptions, normalizePem, queryWithTimeout } from "./connection";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");
  const client = postgres(url, buildPostgresOptions(url, normalizePem(process.env.DATABASE_CA_CERT)));
  return drizzle(client, { schema });
}

let instance: ReturnType<typeof createDb> | undefined;

export function getDb() {
  instance ??= createDb();
  return instance;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/** Consulta mínima para o health check; cancela no servidor se passar do limite. */
export async function pingDatabase(timeoutMs: number) {
  await queryWithTimeout(getDb().$client`select 1`, timeoutMs);
}

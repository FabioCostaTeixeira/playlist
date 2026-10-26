import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { buildPostgresOptions, normalizePem } from "./src/db/connection";

const url = process.env.DATABASE_URL ?? "";
const caPem = normalizePem(process.env.DATABASE_CA_CERT);

// Com CA própria o drizzle-kit precisa das credenciais separadas para receber `ssl`.
function credentials() {
  if (!caPem || !url) return { url };
  const parsed = new URL(url);
  const ssl = buildPostgresOptions(url, caPem).ssl as Exclude<ReturnType<typeof buildPostgresOptions>["ssl"], string | boolean | undefined>;
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    ssl,
  };
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: credentials(),
  strict: true,
  verbose: true,
});

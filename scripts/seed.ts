import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../src/db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL obrigatória");
const db = drizzle(neon(databaseUrl), { schema });
const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (!password || password.length < 12) throw new Error("BOOTSTRAP_ADMIN_PASSWORD precisa ter 12+ caracteres");
const auth = betterAuth({ database: drizzleAdapter(db, { provider: "pg", schema }), secret: process.env.BETTER_AUTH_SECRET, emailAndPassword: { enabled: true, minPasswordLength: 12 } });

const [existingUser] = await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1);
let userId = existingUser?.id;
if (!userId) {
  const result = await auth.api.signUpEmail({ body: { email, password, name: "Administrador" } });
  userId = result.user.id;
}

const slug = "organizacao-principal";
let [organization] = await db.select().from(schema.organizations).where(eq(schema.organizations.slug, slug)).limit(1);
if (!organization) [organization] = await db.insert(schema.organizations).values({ name: process.env.BOOTSTRAP_ORGANIZATION_NAME ?? "Minha organização", slug }).returning();
await db.insert(schema.organizationMembers).values({ organizationId: organization.id, userId, role: "admin" }).onConflictDoUpdate({ target: [schema.organizationMembers.organizationId, schema.organizationMembers.userId], set: { role: "admin", status: "active" } });
console.info("Seed concluído", { organizationId: organization.id, adminEmail: email });

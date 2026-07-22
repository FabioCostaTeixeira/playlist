import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../src/db/schema";
import { validateBootstrapCredentials } from "../src/shared/bootstrap";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL obrigatória");
  // Valida antes de abrir conexão: nada é escrito com credencial de exemplo.
  const { email, password, secret } = validateBootstrapCredentials({
    BOOTSTRAP_ADMIN_EMAIL: process.env.BOOTSTRAP_ADMIN_EMAIL,
    BOOTSTRAP_ADMIN_PASSWORD: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  });
  const db = drizzle(neon(databaseUrl), { schema });
  const auth = betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),
    secret,
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
  });

  const [existingUser] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);
  let userId = existingUser?.id;
  if (!userId) {
    const result = await auth.api.signUpEmail({
      body: { email, password, name: "Administrador" },
    });
    userId = result.user.id;
  }

  const slug = "organizacao-principal";
  let [organization] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, slug))
    .limit(1);
  if (!organization) {
    [organization] = await db
      .insert(schema.organizations)
      .values({
        name: process.env.BOOTSTRAP_ORGANIZATION_NAME ?? "Minha organização",
        slug,
      })
      .returning();
  }
  await db
    .insert(schema.organizationMembers)
    .values({ organizationId: organization.id, userId, role: "admin" })
    .onConflictDoUpdate({
      target: [
        schema.organizationMembers.organizationId,
        schema.organizationMembers.userId,
      ],
      set: { role: "admin", status: "active" },
    });
  console.info("Seed concluído", {
    organizationId: organization.id,
    adminEmail: email,
  });
}

main().catch((error) => {
  console.error("Falha no seed", error);
  process.exitCode = 1;
});

import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { consumeRateLimit } from "@/server/rate-limit";

function createAuth() {
  return betterAuth({
    appName: "Playlist",
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
    },
    session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 60 },
    // Explícito em vez de herdado: só a própria origem pode iniciar fluxos de
    // autenticação, fechando CSRF nas rotas do Better Auth.
    trustedOrigins: process.env.BETTER_AUTH_URL
      ? [process.env.BETTER_AUTH_URL]
      : [],
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      // `lax` impede que o cookie de sessão acompanhe POST vindo de outro site.
      defaultCookieAttributes: { sameSite: "lax" },
    },
    rateLimit: {
      // Enforced in production (Better Auth default). Shared across serverless
      // instances via the `rate_limits` table so an attacker cannot spread
      // guesses across cold starts. `consume` is atomic; `get`/`set` are only
      // required by the type and never called while `consume` is present.
      customStorage: {
        get: async () => null,
        set: async () => {},
        async consume(key, rule) {
          return consumeRateLimit(`auth:${key}`, {
            max: rule.max,
            windowMs: rule.window * 1000,
          });
        },
      },
      customRules: {
        "/sign-in/email": { window: 300, max: 10 },
        "/sign-up/email": { window: 3600, max: 10 },
      },
    },
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  instance ??= createAuth();
  return instance;
}

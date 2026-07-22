import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Origem esperada da própria requisição, atrás do proxy da hospedagem.
 * `BETTER_AUTH_URL` é a origem canônica quando configurada.
 */
function allowedOrigins(request: NextRequest) {
  const origins = new Set<string>();
  const configured = process.env.BETTER_AUTH_URL;
  if (configured) {
    try {
      origins.add(new URL(configured).origin);
    } catch {
      // Configuração inválida não deve derrubar a verificação de origem.
    }
  }
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    origins.add(`${proto}://${host}`);
  }
  return origins;
}

/**
 * Defesa contra CSRF nas rotas administrativas, que são autenticadas por
 * cookie de sessão. Requisições que alteram estado precisam declarar uma
 * origem igual à da aplicação.
 *
 * Cobre apenas `/api/admin/*` e `/api/upload`: `/api/auth/*` tem a própria
 * checagem do Better Auth e `/api/player/*` autentica por token Bearer, que
 * o navegador nunca anexa automaticamente.
 */
export function proxy(request: NextRequest) {
  if (!unsafeMethods.has(request.method)) return NextResponse.next();

  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins(request).has(origin))
    return NextResponse.json(
      { error: "Origem não permitida" },
      { status: 403 },
    );

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*", "/api/upload"],
};

/**
 * Opções de conexão Postgres compartilhadas entre app, seed e drizzle-kit.
 * Sem "server-only" de propósito: scripts de linha de comando também usam.
 */
import { isIP } from "node:net";
import { checkServerIdentity, type PeerCertificate } from "node:tls";
import type { Options } from "postgres";

/** Variáveis de ambiente costumam guardar PEM com "\n" literal; converte para quebras reais. */
export function normalizePem(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\\n/g, "\n") : undefined;
}

/**
 * - `prepare: false`: o PgBouncer em modo transação não mantém prepared statements.
 * - Com CA própria, o certificado do servidor é fixado nela. Quando o host é IP,
 *   o postgres-js valida contra "localhost"; aqui a validação usa o IP real.
 * - Sem CA (Neon), o TLS segue o `sslmode` da própria URL.
 */
export function buildPostgresOptions(url: string, caPem?: string): Options<Record<string, never>> {
  const options: Options<Record<string, never>> = {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  };
  if (!caPem) return options;

  const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  options.ssl = isIP(host)
    ? { ca: caPem, rejectUnauthorized: true, checkServerIdentity: (_host: string, cert: PeerCertificate) => checkServerIdentity(host, cert) }
    : { ca: caPem, rejectUnauthorized: true };
  return options;
}

type CancellableQuery<T> = PromiseLike<T> & { cancel: () => unknown };

/** Limita a espera de uma consulta e cancela no servidor se o tempo estourar. */
export function queryWithTimeout<T>(query: CancellableQuery<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      query.cancel();
      reject(new Error(`Consulta excedeu o tempo limite de ${timeoutMs} ms`));
    }, timeoutMs);
  });
  return Promise.race([Promise.resolve(query), timeout]).finally(() => clearTimeout(timeoutId));
}

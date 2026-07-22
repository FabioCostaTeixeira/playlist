/**
 * Validação das credenciais usadas para criar o primeiro administrador.
 * Fica separada do script de seed para poder ser testada e para falhar antes
 * de qualquer escrita no banco.
 */

/** Valores de exemplo que nunca podem virar credencial real. */
const placeholders = [
  "change-me-with-12-or-more-characters",
  "generate-at-least-32-random-characters",
  "change-me",
  "changeme",
  "password",
  "senha",
  "admin",
];

function isPlaceholder(value: string) {
  const normalized = value.trim().toLowerCase();
  return placeholders.some(
    (placeholder) =>
      normalized === placeholder || normalized.includes("change-me"),
  );
}

export type BootstrapCredentials = {
  email: string;
  password: string;
  secret: string;
};

export function validateBootstrapCredentials(env: {
  BOOTSTRAP_ADMIN_EMAIL?: string;
  BOOTSTRAP_ADMIN_PASSWORD?: string;
  BETTER_AUTH_SECRET?: string;
}): BootstrapCredentials {
  const email = env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.BOOTSTRAP_ADMIN_PASSWORD;
  const secret = env.BETTER_AUTH_SECRET;

  if (!email) throw new Error("BOOTSTRAP_ADMIN_EMAIL obrigatória");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    throw new Error("BOOTSTRAP_ADMIN_EMAIL inválida");
  if (/@(example|test|localhost)\.(com|org|net)$/.test(email))
    throw new Error(
      "BOOTSTRAP_ADMIN_EMAIL ainda é o endereço de exemplo. Defina um e-mail real.",
    );

  if (!password) throw new Error("BOOTSTRAP_ADMIN_PASSWORD obrigatória");
  if (password.length < 12)
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD precisa ter 12+ caracteres");
  if (isPlaceholder(password))
    throw new Error(
      "BOOTSTRAP_ADMIN_PASSWORD ainda é o valor de exemplo. Gere uma senha própria.",
    );
  if (new Set(password).size < 5)
    throw new Error(
      "BOOTSTRAP_ADMIN_PASSWORD tem variação insuficiente de caracteres",
    );

  // Sem um segredo forte as sessões emitidas pelo Better Auth são forjáveis.
  if (!secret) throw new Error("BETTER_AUTH_SECRET obrigatória");
  if (secret.length < 32)
    throw new Error("BETTER_AUTH_SECRET precisa ter 32+ caracteres");
  if (isPlaceholder(secret))
    throw new Error(
      "BETTER_AUTH_SECRET ainda é o valor de exemplo. Gere um segredo próprio.",
    );

  return { email, password, secret };
}

/**
 * A central pode recusar a sincronização por um motivo conhecido — tela sem
 * programação, canal sem playlist publicada, token revogado. Nesses casos a
 * rede está funcionando, e tratar tudo como "sem conexão" manda o operador
 * investigar o problema errado.
 */
export class PlayerSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlayerSyncError";
  }
}

/** Traduz a recusa da central em uma instrução acionável na tela. */
export function explainBootstrapFailure(status: number, body: string) {
  const detail = body.trim();
  if (status === 401)
    return new PlayerSyncError(
      "Esta tela foi desconectada da central. Gere um novo código e ative novamente.",
    );
  if (status === 409)
    return new PlayerSyncError(
      detail
        ? `${detail}. Defina a programação desta tela na central.`
        : "Esta tela ainda não tem programação. Defina na central.",
    );
  return new PlayerSyncError(
    detail || "Não foi possível carregar a programação agora.",
  );
}

/** A central respondeu, mesmo que recusando: a conexão está de pé. */
export function isReachable(error: unknown) {
  return error instanceof PlayerSyncError;
}

export function syncFailureMessage(error: unknown, hasManifest: boolean) {
  const reason = isReachable(error)
    ? (error as PlayerSyncError).message
    : "Sem conexão com a central.";
  if (hasManifest) return `${reason} Reproduzindo última programação válida.`;
  return isReachable(error) ? reason : `${reason} Verifique a rede desta tela.`;
}

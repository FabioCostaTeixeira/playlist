/**
 * Lógica pura do rodízio do player. Sem DOM, sem timers — só decisões que dá para
 * testar isoladamente. O componente `SlideStage` cuida do efeito (iframes, timers,
 * eventos de load); aqui ficam as regras.
 */

/** Tipos de virada que o palco sabe animar. */
export type TransitionKind = "cube" | "flip" | "fade";

/** Virada padrão quando o item não escolheu uma deliberadamente. */
export const DEFAULT_TRANSITION: TransitionKind = "cube";

/** Duração da virada 3D, em ms. Injetada no CSS via `--flip-ms` pelo SlideStage. */
export const FLIP_DURATION_MS = 1200;

/**
 * Teto de espera pelo próximo slide ficar pronto antes de virar assim mesmo.
 * Portal que trava ou recusa iframe não pode segurar o rodízio para sempre.
 */
export const READY_CAP_MS = 8_000;

/** Tempo mínimo que um item fica na tela (o `durationSeconds` nunca cai abaixo disso). */
export const MIN_DWELL_SECONDS = 3;

/**
 * Resolve qual virada aplicar.
 *
 * Hoje não há UI para o operador escolher a transição por item, então todo valor no
 * banco é o default de coluna `"fade"` — plumbing dormente, não escolha. Por isso
 * `"fade"`, vazio e valores desconhecidos caem no default (`cube`); só `"flip"` e
 * `"cube"` explícitos são tratados como escolha deliberada. `prefers-reduced-motion`
 * força `fade` e sobrepõe tudo (acessibilidade / conforto visual).
 */
export function resolveTransition(
  value: string | undefined,
  options: { reduceMotion?: boolean } = {},
): TransitionKind {
  if (options.reduceMotion) return "fade";
  if (value === "flip") return "flip";
  if (value === "cube") return "cube";
  return DEFAULT_TRANSITION;
}

/** Próximo índice do rodízio, com volta ao início. Lista vazia ou inválida → 0. */
export function nextIndex(current: number, length: number): number {
  if (!Number.isFinite(length) || length <= 0) return 0;
  if (!Number.isFinite(current) || current < 0) return 0;
  return (current + 1) % length;
}

/** Só faz sentido pré-carregar e virar quando há pelo menos dois itens. */
export function canRotate(length: number): boolean {
  return Number.isFinite(length) && length >= 2;
}

/** Quanto tempo (ms) o item fica na tela, respeitando o piso de MIN_DWELL_SECONDS. */
export function dwellMs(durationSeconds: number | undefined): number {
  const seconds = Number.isFinite(durationSeconds)
    ? (durationSeconds as number)
    : MIN_DWELL_SECONDS;
  return Math.max(MIN_DWELL_SECONDS, seconds) * 1000;
}

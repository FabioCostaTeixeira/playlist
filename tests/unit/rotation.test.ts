import { describe, expect, it } from "vitest";
import {
  canRotate,
  DEFAULT_TRANSITION,
  dwellMs,
  MIN_DWELL_SECONDS,
  nextIndex,
  resolveTransition,
} from "@/features/player/rotation";

describe("resolveTransition", () => {
  it("usa o default (cube) quando o item não escolheu nada", () => {
    expect(resolveTransition(undefined)).toBe("cube");
    expect(resolveTransition("")).toBe("cube");
    expect(DEFAULT_TRANSITION).toBe("cube");
  });

  it("trata o valor legado 'fade' como não escolhido → default", () => {
    // "fade" é o default de coluna do banco, não uma escolha do operador.
    expect(resolveTransition("fade")).toBe("cube");
  });

  it("honra escolhas deliberadas", () => {
    expect(resolveTransition("flip")).toBe("flip");
    expect(resolveTransition("cube")).toBe("cube");
  });

  it("cai para o default em valor desconhecido", () => {
    expect(resolveTransition("carrossel-maluco")).toBe("cube");
  });

  it("prefers-reduced-motion força fade e sobrepõe tudo", () => {
    expect(resolveTransition("cube", { reduceMotion: true })).toBe("fade");
    expect(resolveTransition("flip", { reduceMotion: true })).toBe("fade");
    expect(resolveTransition(undefined, { reduceMotion: true })).toBe("fade");
  });
});

describe("nextIndex", () => {
  it("avança e dá a volta no fim", () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(1, 3)).toBe(2);
    expect(nextIndex(2, 3)).toBe(0);
  });

  it("é seguro com entradas inválidas", () => {
    expect(nextIndex(0, 0)).toBe(0);
    expect(nextIndex(5, -1)).toBe(0);
    expect(nextIndex(-3, 4)).toBe(0);
    expect(nextIndex(Number.NaN, 4)).toBe(0);
  });
});

describe("canRotate", () => {
  it("exige pelo menos dois itens", () => {
    expect(canRotate(0)).toBe(false);
    expect(canRotate(1)).toBe(false);
    expect(canRotate(2)).toBe(true);
    expect(canRotate(9)).toBe(true);
  });
});

describe("dwellMs", () => {
  it("respeita o piso mínimo", () => {
    expect(dwellMs(0)).toBe(MIN_DWELL_SECONDS * 1000);
    expect(dwellMs(1)).toBe(MIN_DWELL_SECONDS * 1000);
    expect(dwellMs(undefined)).toBe(MIN_DWELL_SECONDS * 1000);
  });

  it("usa a duração do item quando acima do piso", () => {
    expect(dwellMs(10)).toBe(10_000);
    expect(dwellMs(30)).toBe(30_000);
  });
});

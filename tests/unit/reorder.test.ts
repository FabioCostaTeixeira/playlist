import { describe, expect, it } from "vitest";
import { reorder } from "@/lib/reorder";

describe("reorder", () => {
  it("move um item para frente", () => {
    expect(reorder(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("move um item para trás", () => {
    expect(reorder(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("mover para a mesma posição é no-op", () => {
    expect(reorder(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]);
  });

  it("limita o destino ao intervalo válido", () => {
    expect(reorder(["a", "b", "c"], 0, 99)).toEqual(["b", "c", "a"]);
    expect(reorder(["a", "b", "c"], 2, -5)).toEqual(["c", "a", "b"]);
  });

  it("origem inválida devolve a lista intacta", () => {
    expect(reorder(["a", "b"], -1, 0)).toEqual(["a", "b"]);
    expect(reorder(["a", "b"], 5, 0)).toEqual(["a", "b"]);
    expect(reorder(["a", "b"], 1.5, 0)).toEqual(["a", "b"]);
  });

  it("não muta a lista original", () => {
    const original = ["a", "b", "c"];
    reorder(original, 0, 2);
    expect(original).toEqual(["a", "b", "c"]);
  });
});

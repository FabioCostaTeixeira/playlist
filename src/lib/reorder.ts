/**
 * Move um item de `from` para `to`, devolvendo uma nova lista. Índices fora do
 * intervalo são tratados com segurança: `from` inválido devolve a lista intacta;
 * `to` é limitado ao intervalo válido.
 */
export function reorder<T>(list: readonly T[], from: number, to: number): T[] {
  const result = list.slice();
  if (!Number.isInteger(from) || from < 0 || from >= result.length) {
    return result;
  }
  const target = Math.max(0, Math.min(result.length - 1, Math.trunc(to)));
  const [moved] = result.splice(from, 1);
  result.splice(target, 0, moved);
  return result;
}

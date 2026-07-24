# Ordenar a programação — arrastar e soltar

**Data:** 2026-07-23
**Status:** aprovado (brainstorming), em implementação
**Branch:** `feat/ordenar-programacao`

## Problema

O operador quer **definir a ordem da apresentação** arrastando os itens da
programação. Hoje o diálogo "Itens de {playlist}" mostra os conteúdos como
**checkboxes na ordem do catálogo** — a ordem real da playlist (array
`playlistItems`) existe, mas não é visível nem reordenável.

## Diagnóstico

O **backend já suporta reordenar**: `PUT /api/admin/playlists/[id]/items` recebe o
array na ordem desejada e regrava `position` pelo índice do array
([route.ts](../../../src/app/api/admin/playlists/[id]/items/route.ts), já audita
como `reorder_items`). A feature é **frontend**: mostrar os itens numa lista
ordenada e arrastável.

## Decisão

Drag-and-drop **custom, sem dependência** (pointer events) — mantém o projeto
enxuto (padrão do time: poucas deps, audit zero). Funciona mouse e toque.

### UX do diálogo (redesenhado, duas zonas)

1. **Programação (arraste ⠿ para ordenar):** lista ordenada dos itens
   selecionados. Cada linha: handle ⠿, posição, nome, duração (input), ▲▼ (mover
   um passo, acessível por teclado), ✕ (remover).
2. **Adicionar conteúdo:** conteúdos ativos ainda não incluídos, cada um com
   "+ Adicionar" (joga no fim da lista).

Rodapé mantém "Salvar rascunho" e "Publicar".

### Mecânica do arrastar

- `onPointerDown` no handle → `setPointerCapture` (as linhas têm `key` estável por
  `contentId`, então o nó DOM arrastado persiste na reordenação e mantém a
  captura). `onPointerMove` mede as linhas (`getBoundingClientRect`), calcula a
  posição-alvo pelo Y do cursor e reordena ao vivo. `onPointerUp` finaliza.
- `touch-action: none` no handle para não rolar a página no toque.
- ▲▼ chamam a mesma reordenação de um passo (precisão + acessibilidade).

### Isolamento

- `reorder(list, from, to)` — helper **puro** e testável.
- `SortableItems` — componente próprio (lista arrastável). Também **alivia** o
  `resource-workspace.tsx`, que já está grande (1100+ linhas).

## Fora de escopo (YAGNI)

- Sem mudança de backend/schema (o PUT já grava a ordem).
- Sem nova dependência.
- Sem escolha de transição por item (o `transitionType` do PUT segue `fade`; o
  player aplica cubo por padrão — ver ADR-006).

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/lib/reorder.ts` | novo — `reorder(list, from, to)` puro |
| `tests/unit/reorder.test.ts` | novo — testes do helper |
| `src/components/app/sortable-items.tsx` | novo — lista arrastável (drag + ▲▼ + duração + ✕) |
| `src/components/app/resource-workspace.tsx` | redesenha o diálogo (2 zonas), usa `SortableItems` |

## Testes

- `reorder.test.ts`: mover para frente/trás, extremos, índices inválidos, no-op.
- Componente validado manualmente (drag depende de layout real).
- Portão de qualidade (`npm run check`) verde.

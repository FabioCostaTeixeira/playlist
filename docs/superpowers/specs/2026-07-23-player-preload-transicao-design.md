# Player — Pré-carregamento invisível + transição 3D

**Data:** 2026-07-23
**Status:** aprovado (brainstorming), em implementação
**Branch:** `feat/player-preload-transicao`

## Problema (pedido do cliente)

As telas exibem **portais de notícia** (conteúdo tipo `url`, renderizado em iframe),
alternando de um portal para outro em tempo determinado. Dois pedidos:

1. **Carregamento mais rápido na tela de exibição** — hoje, quando o rodízio troca
   para um portal, o espectador vê a página do portal carregando.
2. **Uma transição de uma tela para outra** — efeito de cubo / "quadro virando" na
   troca.

## Diagnóstico

O player ([`src/features/player/player-engine.tsx`](../../../src/features/player/player-engine.tsx))
hoje renderiza **um** item por vez (`manifest.items[index]`) e troca via `setTimeout`,
com uma transição fixa `animate-in fade-in duration-500`. Não há pré-carregamento do
próximo item, então o iframe do próximo portal só começa a carregar **depois** que
vira o item atual → o espectador vê o portal carregando.

Observações que orientam a solução:

- O manifesto **já carrega um campo `transition` por item** (`playlist_items.transition_type`
  → `manifest.ts` → player), hoje **ignorado** pelo player. O modelo de dados já
  previa transições variadas.
- O player **já cacheia** mídia (CacheStorage) e **já faz preload da mídia** do
  próximo item — mas **não** pré-carrega iframes (`url`/`html`), que é justamente o
  caso lento.
- Hardware das telas: **PC / mini-PC** com Chrome/Edge → GPU forte, transform 3D em
  iframe vivo é viável sem medo de engasgo.

## Decisão de arquitetura — Abordagem A: double-buffer de 2 iframes + virada 3D

Um único mecanismo resolve os dois pedidos: **pré-carregar o próximo slide escondido
enquanto o atual aparece; quando chega a vez, ele já está pronto e a troca é uma
virada 3D**.

### Componentes

- **`SlideStage`** (novo, `src/features/player/slide-stage.tsx`): palco com **2 slots
  físicos** (A/B) num container 3D. Um slot é a frente (visível), o outro carrega o
  próximo item escondido. Cada slot renderiza os 4 tipos existentes (image/video/url/html).
- **`rotation.ts`** (novo, `src/features/player/rotation.ts`): lógica pura e testável —
  `resolveTransition`, `nextIndex`, `canRotate`, constantes de tempo. Sem DOM.
- **`player-engine.tsx`** (alterado): passa a delegar a exibição ao `SlideStage`.
  Mantém intactos token/bootstrap/sync/heartbeat/cache. Remove só o render single-slide
  e o `setTimeout` de rotação (que migram para `SlideStage`).
- **`globals.css`** (alterado): classes 3D (perspective, preserve-3d, faces, cube/flip/fade).

### Pipeline de rodízio (double-buffer)

```
Início:   slot0 = item[0] (frente, visível)   slot1 = item[1] (trás, carregando)
          dwell de item[0] roda (durationSeconds)

dwell termina → ready-gate no slot de trás → VIRADA 3D → trás vira frente
                depois: slot que ficou atrás carrega item[2] (fresco)
... repete
```

- **Lead máximo:** o próximo item começa a carregar **no instante em que o atual
  vira frente** — ganha o dwell inteiro de vantagem. No caso normal já está pronto na
  hora da virada → **zero tela em branco**.
- **Ready-gate:** só vira quando o slot de trás disparou o evento de pronto
  (`load` do iframe / `canplay` do vídeo / `onLoad` da imagem) **ou** estourou o teto
  `READY_CAP_MS` (8s). Portal lento atrasa um tico, nunca pisca.
- **Frescor "de hora em hora":** resolve sozinho — cada portal recarrega a cada volta
  do rodízio (mais fresco que 1h). **Não** há reload da página inteira nem timer de 1h.

### Transição

Container 3D com `rotateY`. Tipos: **`cube`** (default), **`flip`**, e **`fade`**
(usado quando `prefers-reduced-motion`). O tipo vem de `resolveTransition(item.transition)`.

> **Decisão sobre o default:** hoje não existe UI para o operador escolher a transição
> por item, então **todo** `transition_type` no banco é o default de coluna `"fade"` —
> ou seja, plumbing dormente, nenhuma escolha deliberada. Por isso o player trata
> `"fade"`/vazio/desconhecido como "não escolhido" → aplica o **default `cube`**. Só
> `"flip"` e `"cube"` explícitos são tratados como escolha. `prefers-reduced-motion`
> força `fade` (acessibilidade), sobrepondo tudo. Quando existir uma UI de seleção de
> transição, revisitar (então `"fade"` volta a ser escolha válida). Nenhuma mudança de
> schema/migração é necessária.

Cube e flip são viradas ~180° simétricas → o swap binário frente/trás anima limpo via
CSS transition, sem "flash" de reset. Duração `FLIP_DURATION_MS` (700ms), ease-in-out.

### Casos de borda

- **Portal recusa iframe** (`X-Frame-Options`/CSP): o teto de 8s vira mesmo assim.
  Limite conhecido pré-existente, não é regressão.
- **Playlist com < 2 itens:** `canRotate` false → sem rodízio, sem virada.
- **Manifesto novo publicado** (sync de 60s troca `version`): `SlideStage` reseta pelo
  `key`/efeito → frente = item[0], slots recarregam, sem portal fantasma.
- **Vídeo termina antes do dwell** (`onEnded`): mantém o avanço antecipado, integrado à virada.
- **`prefers-reduced-motion`:** cai para `fade`.

### Fora de escopo (YAGNI)

- Não mexe em sync/bootstrap/manifest no servidor.
- Não cria UI de escolha de transição (o `transition_type` por item já existe como plumbing).
- Não faz reload da página inteira (rejeitado — piscaria a tela e é desnecessário).

## Testes

- **`tests/unit/rotation.test.ts`**: `resolveTransition` (default cube, flip explícito,
  reduced-motion → fade, legado "fade" → cube), `nextIndex` (wrap, vazio), `canRotate`.
- **Componente `SlideStage`:** validado manualmente no mini-PC (jsdom não carrega iframe
  cross-origin de verdade). A lógica de avanço é coberta pelos helpers puros.
- **Portão de qualidade:** `npm run check` (lint + typecheck + test + build) verde.

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/features/player/slide-stage.tsx` | novo — palco 2 slots + render + rodízio + virada |
| `src/features/player/rotation.ts` | novo — helpers puros |
| `src/features/player/player-engine.tsx` | usa `<SlideStage>`; remove render single-slide + effect de rotação |
| `src/app/globals.css` | classes 3D |
| `tests/unit/rotation.test.ts` | novo |
| `docs/STATUS.md`, `docs/DECISIONS.md` | ADR de transições/double-buffer |
| `../../MELHORIA-CONTINUA.md` (raiz) | log da evolução |

# Resumo de Contexto

> Gerado pelo `context-loader-agent` + `intake-pm-agent`.
> Consolida o entendimento inicial da demanda e o contexto consultado na base de conhecimento.

## 1. Identificação

- **Cliente:** _não informado_
- **Área:** - CRUD de canais.
- CRUD de dispositivos.
- Associação dispositivo-canal.
- Playlist direta opcional com precedência documentada.
- Código de pareamento temporário.
- Token exclusivo do dispositivo.
- Revogação, bloqueio e reativação.
- Orientação e resolução.
- Manifesto/ponteiro individual.


**US-0601 — Criar canal**  
Como operador, quero associar uma playlist a um canal reutilizável por várias telas.

Critérios de aceite:

- Alterar o canal atualiza a programação dos dispositivos vinculados via ponteiro/versionamento.
- Dispositivos não são atualizados linha por linha desnecessariamente.

**US-0602 — Parear dispositivo**  
Como operador, quero ativar uma tela usando um código curto e temporário sem digitar senha na televisão.

Critérios de aceite:

- Código aleatório, de uso único, com expiração curta.
- Tentativas limitadas.
- Token real só é entregue após confirmação.
- Token armazenado com hash no banco.
- Código nunca vira credencial permanente.

**US-0603 — Revogar tela**  
Como administrador, quero bloquear um dispositivo comprometido.

Critérios de aceite:

- Token revogado deixa de acessar API protegida.
- Player comprometido não acessa dados administrativos.
- Evento auditado.

**US-0604 — Rotear programação**  
Como operador, quero que telas diferentes exibam canais diferentes.

Critérios de aceite:

- Cada dispositivo obtém apenas seu ponteiro autorizado.
- Alteração refletida na próxima sincronização.
- Sem vazamento de programação privada entre organizações.


- Testar ativação concorrente.
- Medir leitura do ponteiro via CDN.
- Demonstrar que consulta periódica do player não alcança o Neon.
- Testar centenas de dispositivos simulados consultando manifestos cacheados.


- Brute force de pairing code.
- Reutilização de código consumido.
- Token roubado/revogado.
- IDOR entre dispositivos.
- Rate limiting.
- Comparação segura de tokens.

---
- **Objetivo:** _não informado_
- **Sistemas envolvidos:** _não informado_
- **Data de geração:** 2026-07-21 15:03

## 2. Entendimento da demanda

_não informado_

## 3. Contexto consultado (base de conhecimento)

> Inventário automático da pasta `knowledge_base/` (varredura recursiva).
> Formatos lidos: `.md`, `.txt`, `.sql`, `.query`. `.pdf` é listado mas não lido nesta versão.

### 3.1 Arquivos disponíveis

| Arquivo | Tipo | Tamanho | Conteúdo lido |
|---------|------|---------|---------------|
| `clients/exemplo-cliente/business-rules.md` | .md | 0.5 KB | sim |
| `clients/exemplo-cliente/data-model.md` | .md | 0.6 KB | sim |
| `clients/exemplo-cliente/decisions.md` | .md | 0.4 KB | sim |
| `clients/exemplo-cliente/glossary.md` | .md | 0.5 KB | sim |
| `clients/exemplo-cliente/overview.md` | .md | 0.5 KB | sim |
| `global/business-rules.md` | .md | 0.5 KB | sim |
| `global/coding-standards.md` | .md | 0.5 KB | sim |
| `global/lessons-learned.md` | .md | 0.4 KB | sim |
| `global/project-management-standards.md` | .md | 0.5 KB | sim |
| `global/technical-standards.md` | .md | 0.7 KB | sim |

### 3.2 Itens relevantes (a curar)

- Regras existentes relevantes: _a preencher_
- Decisões anteriores relevantes: _a preencher_
- Padrões técnicos aplicáveis: _a preencher_
- Glossário relevante: _a preencher_

## 4. Restrições identificadas

_nenhuma restrição informada_

## 5. Possíveis conflitos com contexto

- _a preencher_

## 6. Dúvidas críticas

- _a preencher_

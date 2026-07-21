# Demanda Original

> Este arquivo é uma cópia fiel da demanda recebida em `input/`.
> Não editar. Serve como fonte de rastreabilidade.

---

# PROMPT MESTRE — PLATAFORMA DE DIGITAL SIGNAGE WEB

## 1. Papel da IA orquestradora

Você é a IA orquestradora responsável por construir, testar, documentar e preparar para produção uma plataforma web de Digital Signage. Trabalhe do início ao fim com autonomia técnica, sem pular fases e sem considerar uma feature concluída apenas porque a interface foi criada.

O sistema deverá permitir que administradores cadastrem conteúdos, construam playlists, criem canais, cadastrem dispositivos com navegador e controlem qual programação será exibida em cada tela. O player deverá alternar URLs, imagens, vídeos e conteúdos HTML conforme duração, ordem e agendamento definidos na central.

Seu objetivo é entregar uma aplicação funcional, segura, sustentável, escalável e econômica, pronta para deploy na Vercel, usando Neon PostgreSQL como banco administrativo e Vercel Blob/CDN para arquivos e manifestos publicados.

Ao encontrar uma ambiguidade não crítica, adote a alternativa mais simples, segura e reversível, registre a decisão no ADR correspondente e prossiga. Só interrompa para pedir decisão humana quando houver impacto material em escopo, custo, segurança, exclusão de dados, fornecedor ou arquitetura irreversível.

---

## 2. Resultado esperado

Entregar:

1. Central administrativa responsiva.
2. CRUD seguro de organizações, usuários, funções e permissões.
3. Biblioteca de conteúdos com URL, imagem, vídeo e HTML seguro.
4. Playlists ordenáveis com duração individual por item.
5. Canais reutilizáveis por vários dispositivos.
6. Cadastro e pareamento seguro de dispositivos.
7. Player web/PWA de tela cheia, com cache offline.
8. Distribuição econômica por manifestos JSON em CDN, sem consultas frequentes ao Neon.
9. Monitoramento de status online/offline com heartbeat econômico.
10. Agendamento de playlists e conteúdo emergencial.
11. Auditoria administrativa e telemetria mínima.
12. Testes automatizados, performance e segurança por bloco.
13. Documentação de desenvolvimento, deploy, operação e recuperação.
14. Deploy de homologação e preparação para produção.

---

## 3. Escopo e prioridades

### 3.1 MVP obrigatório

- Autenticação administrativa.
- Controle de acesso baseado em papéis.
- Organizações preparadas desde o banco, mesmo que inicialmente exista apenas uma.
- CRUD de usuários.
- CRUD de dispositivos.
- Pareamento por código temporário.
- Conteúdos: URL, imagem, vídeo e HTML seguro.
- Upload de arquivos para Vercel Blob.
- Playlists com ordenação, duração e ativação.
- Canais e associação canal-dispositivo.
- Publicação de manifestos JSON versionados.
- Player em tela cheia.
- Cache offline da última programação válida.
- Heartbeat e estado online/offline.
- Auditoria de ações administrativas.
- Testes e documentação.

### 3.2 Preparar a arquitetura, mas não implementar antes do MVP

- Cobrança e planos.
- White-label completo.
- API pública para terceiros.
- Captura remota de tela.
- Comandos em tempo real por WebSocket.
- Aplicativo nativo para Android/Windows.
- Reconhecimento facial, sensores ou métricas de audiência.
- Editor visual complexo de templates.

Não construa funcionalidades futuras por antecipação. Crie apenas pontos de extensão claros quando isso não aumentar significativamente a complexidade.

---

## 4. Stack técnica obrigatória

- Next.js com App Router e TypeScript estrito.
- React.
- Tailwind CSS.
- Componentes acessíveis e reutilizáveis; shadcn/ui pode ser utilizado.
- Neon PostgreSQL.
- Drizzle ORM e migrations versionadas.
- Vercel para deploy.
- Vercel Blob para imagens, vídeos, HTML e manifestos publicados.
- Zod para validação compartilhada.
- Solução de autenticação madura compatível com Next.js, preferencialmente Better Auth ou Auth.js; justificar a escolha em ADR.
- Senhas com Argon2id ou mecanismo equivalente oferecido com segurança pela biblioteca escolhida.
- Vitest para testes unitários e de integração leves.
- Playwright para testes ponta a ponta.
- Lighthouse CI para experiência e performance web.
- k6, autocannon ou ferramenta equivalente para carga das rotas críticas.
- ESLint, Prettier e verificação de tipos.
- Sentry ou alternativa equivalente preparado por variáveis de ambiente, sem bloquear desenvolvimento local.

Não fixe versões arbitrárias no prompt. Ao iniciar, verifique versões estáveis e compatíveis, registre-as no lockfile e evite dependências desnecessárias.

---

## 5. Princípios arquiteturais obrigatórios

### 5.1 Neon não atende a reprodução contínua

O banco é a fonte administrativa de verdade, mas o player não deve consultar o Neon em cada rotação, reinício ou verificação de conteúdo.

Fluxo obrigatório de publicação:

1. Administrador altera dados na central.
2. Dados são validados e persistidos no Neon.
3. A ação de publicar gera manifesto JSON imutável e versionado.
4. Manifesto é enviado ao Vercel Blob/CDN.
5. Um ponteiro pequeno e cacheável informa a versão atual de canal/dispositivo.
6. Player consulta o CDN usando ETag/If-None-Match ou versionamento equivalente.
7. Player baixa nova programação somente quando a versão mudar.
8. Player executa localmente e mantém cache da última versão válida.

Estrutura lógica sugerida:

```text
/manifests/playlists/{playlistId}/{version}.json
/manifests/channels/{channelId}/current.json
/manifests/devices/{deviceId}/current.json
```

Não expor IDs sequenciais, credenciais, tokens ou informações administrativas nos manifestos.

### 5.2 Separação de planos

- Plano administrativo: banco, CRUD, publicação e auditoria.
- Plano de distribuição: CDN, manifestos e mídia.
- Plano do player: execução, cache, heartbeat e telemetria em lote.

Uma indisponibilidade temporária do Neon não pode interromper uma playlist já sincronizada.

### 5.3 Multi-tenant seguro

Todas as entidades de negócio deverão possuir `organization_id` quando aplicável. Toda consulta administrativa deverá ser filtrada pelo tenant no servidor. Nunca confiar em `organization_id` vindo livremente do cliente.

### 5.4 Segurança por padrão

- Negar acesso por padrão.
- Validar no servidor.
- Aplicar menor privilégio.
- Não registrar senhas, tokens, cookies ou URLs assinadas.
- Usar transações nas operações de publicação e associação crítica.
- Auditar mudanças sensíveis.
- Revogar tokens de dispositivo individualmente.

### 5.5 Operação degradada

Se CDN, API ou internet falhar, o player deverá:

1. Continuar com a última playlist válida.
2. Registrar o erro localmente.
3. Tentar novamente com backoff e jitter.
4. Nunca entrar em loop agressivo.
5. Exibir fallback local somente se nunca houve sincronização válida.

---

## 6. Regras de otimização de tokens e contexto

Estas regras são obrigatórias para a IA orquestradora:

1. Antes de editar, localizar apenas arquivos diretamente relacionados usando busca por nome/símbolo.
2. Não reler arquivos inteiros quando um trecho específico for suficiente.
3. Não repetir a especificação completa em cada etapa.
4. Manter `docs/STATUS.md` curto e atualizado como memória operacional.
5. Manter `docs/DECISIONS.md` ou ADRs apenas para decisões relevantes.
6. Usar um plano por bloco com no máximo: objetivo, arquivos afetados, testes e riscos.
7. Reutilizar componentes e utilitários existentes antes de criar novos.
8. Evitar comentários que apenas repetem o código.
9. Evitar gerar documentação duplicada.
10. Executar testes direcionados durante desenvolvimento e suíte completa somente nos portões definidos.
11. Resumir logs longos, preservando erro, arquivo, linha e causa.
12. Não enviar arquivos de mídia ou grandes fixtures ao contexto; usar fixtures pequenas e geradas.
13. Após cada bloco, compactar o estado em `docs/STATUS.md` contendo:
   - concluído;
   - pendente;
   - decisões;
   - migrations aplicadas;
   - testes executados;
   - riscos conhecidos;
   - próximo bloco.
14. Ao retomar uma sessão, ler primeiro `AGENTS.md`, `docs/STATUS.md`, `docs/ARCHITECTURE.md` e o plano do bloco atual.
15. Nunca reconstruir uma feature já aceita sem evidência de regressão ou mudança de requisito.

---

## 7. Convenções de qualidade

### 7.1 Definição de pronto global

Uma história só está pronta quando:

- Implementação completa.
- Validação no servidor.
- Controle de permissão aplicado.
- Estados de carregamento, vazio, sucesso e erro tratados.
- Teste unitário ou de integração adequado.
- Fluxo crítico coberto por E2E quando aplicável.
- Acessibilidade básica verificada.
- Sem erro de lint, tipos ou build.
- Teste de segurança do bloco aprovado.
- Teste de performance do bloco aprovado.
- Documentação mínima atualizada.
- Evidências registradas no relatório do bloco.

### 7.2 Comandos mínimos do portão

Defina scripts equivalentes a:

```text
lint
typecheck
test
test:integration
test:e2e
test:security
test:performance
build
```

### 7.3 Proibição de avanço

Não avançar quando houver:

- Vulnerabilidade crítica ou alta conhecida.
- Teste crítico falhando.
- Migration não reproduzível.
- Vazamento entre organizações.
- Token exposto.
- Build quebrado.
- Regressão relevante de performance.
- Fluxo principal apenas simulado/mocado sem implementação real.

---

## 8. Modelo inicial de dados

Criar migrations para as entidades abaixo. Ajustes são permitidos se documentados.

### 8.1 Identidade e acesso

```text
organizations
- id uuid pk
- name
- slug unique
- status
- created_at
- updated_at

users
- id uuid pk
- organization_id fk
- name
- email normalizado
- password_hash ou vínculo gerenciado pela solução de auth
- status
- last_login_at
- created_at
- updated_at

roles
- id uuid pk
- organization_id nullable para papéis de sistema
- name
- key

permissions
- id uuid pk
- key unique
- description

user_roles
- user_id
- role_id

role_permissions
- role_id
- permission_id
```

### 8.2 Conteúdo

```text
contents
- id uuid pk
- organization_id fk
- name
- type: url | image | video | html
- status: draft | active | archived
- source_url nullable
- blob_path nullable
- mime_type nullable
- file_size nullable
- checksum nullable
- default_duration_seconds nullable
- iframe_compatibility: unknown | allowed | blocked | warning
- html_mode nullable
- metadata jsonb
- created_by
- created_at
- updated_at
```

### 8.3 Programação

```text
playlists
- id uuid pk
- organization_id fk
- name
- description
- status: draft | published | archived
- current_version integer
- created_at
- updated_at

playlist_items
- id uuid pk
- playlist_id fk
- content_id fk
- position integer
- duration_seconds nullable
- transition_type
- enabled
- valid_from nullable
- valid_until nullable

channels
- id uuid pk
- organization_id fk
- name
- description
- active_playlist_id nullable
- fallback_playlist_id nullable
- current_version integer
- created_at
- updated_at
```

### 8.4 Dispositivos

```text
devices
- id uuid pk
- organization_id fk
- name
- slug
- location nullable
- description nullable
- status: pending | active | blocked | archived
- orientation: landscape | portrait | auto
- resolution_width nullable
- resolution_height nullable
- channel_id nullable
- direct_playlist_id nullable
- current_manifest_version integer
- last_seen_at nullable
- last_ip_hash nullable
- user_agent_summary nullable
- created_at
- updated_at

device_tokens
- id uuid pk
- device_id fk
- token_hash
- expires_at nullable
- revoked_at nullable
- last_used_at nullable
- created_at

pairing_codes
- id uuid pk
- code_hash
- expires_at
- attempts
- consumed_at nullable
- temporary_device_id nullable
- created_at
```

### 8.5 Operação

```text
schedules
- id uuid pk
- organization_id fk
- target_type: channel | device
- target_id
- playlist_id
- starts_at
- ends_at nullable
- priority
- timezone
- status

emergency_overrides
- id uuid pk
- organization_id fk
- target_type
- target_id nullable
- content_id ou playlist_id
- starts_at
- ends_at
- status

audit_logs
- id uuid pk
- organization_id fk
- actor_user_id nullable
- action
- entity_type
- entity_id
- before_safe jsonb nullable
- after_safe jsonb nullable
- ip_hash nullable
- created_at

playback_event_batches
- id uuid pk
- device_id fk
- batch_id unique
- event_count
- received_at

playback_events (opcional/configurável)
- id uuid pk
- device_id fk
- content_id nullable
- event_type
- occurred_at
- result
- safe_error_code nullable
```

Criar índices por `organization_id`, chaves estrangeiras, status, `last_seen_at`, relações de playlist/canal e campos de busca usados. Impedir posições duplicadas por playlist. Definir política clara de deleção lógica versus física.

---

## 9. Papéis e permissões

Implementar inicialmente:

### Superadministrador

- Gerencia organizações.
- Controle global.
- Acesso a auditoria global.

### Administrador da organização

- Gerencia usuários, conteúdos, playlists, canais e dispositivos da organização.
- Publica programação.
- Revoga dispositivos.

### Editor

- Gerencia conteúdos e playlists.
- Não gerencia usuários nem configurações sensíveis.

### Operador

- Associa canais/dispositivos, publica programações autorizadas e acompanha status.

### Visualizador

- Somente leitura.

Permissões devem ser avaliadas no servidor. Ocultar botões no frontend é apenas experiência visual e não substitui autorização.

---

## 10. Contratos principais

### 10.1 Manifesto de playlist

```json
{
  "schemaVersion": 1,
  "playlistId": "opaque-id",
  "version": 24,
  "publishedAt": "ISO-8601",
  "defaults": {
    "transition": "fade",
    "fallbackDurationSeconds": 15
  },
  "items": [
    {
      "id": "opaque-item-id",
      "type": "image",
      "src": "https://cdn.example/file",
      "durationSeconds": 15,
      "checksum": "sha256-value",
      "validFrom": null,
      "validUntil": null
    }
  ]
}
```

Validar manifesto com schema versionado no servidor e no player. Campos desconhecidos devem ser tolerados quando seguros; versões incompatíveis devem manter o último manifesto válido.

### 10.2 Heartbeat

- Intervalo padrão: 5 minutos.
- Offline após janela configurável, inicialmente 15 minutos.
- Backoff e jitter em falhas.
- Idempotência quando aplicável.
- Atualizar apenas `last_seen_at`, sem inserir uma linha por heartbeat.
- Não consultar playlists ou conteúdos no heartbeat.

### 10.3 Telemetria

- Acumular eventos no player.
- Enviar em lote a cada 30–60 minutos ou ao atingir limite.
- Usar `batch_id` idempotente.
- Permitir desativar eventos detalhados.
- Nunca bloquear reprodução por falha de telemetria.

---

# 11. PLANO DE CONSTRUÇÃO POR BLOCOS

Execute os blocos na ordem. Ao fim de cada bloco, aplique o Portão Universal de Qualidade descrito na seção 12.

## BLOCO 0 — Descoberta, baseline e contratos

### Objetivo

Preparar o repositório e remover ambiguidades antes da implementação.

### Features

- Inicialização do projeto.
- Lockfile e scripts padronizados.
- `.env.example` sem segredos.
- Estratégia de ambientes local, preview e produção.
- Documento de arquitetura.
- Convenções de código.
- Matriz de permissões.
- Modelo de ameaças inicial.
- Orçamento de performance.
- Estratégia de testes.

### Histórias de usuário

**US-0001 — Ambiente reproduzível**  
Como desenvolvedor, quero instalar e iniciar o projeto com comandos documentados para que qualquer ambiente produza o mesmo resultado.

Critérios de aceite:

- Instalação limpa funciona.
- `lint`, `typecheck`, testes e build possuem scripts.
- Nenhum segredo versionado.
- README descreve requisitos e execução.

**US-0002 — Arquitetura registrada**  
Como responsável técnico, quero entender os componentes, limites e fluxos para manter o sistema sustentável.

Critérios de aceite:

- Diagrama de alto nível.
- Fluxo de publicação e reprodução documentado.
- ADR de autenticação, storage e ORM.
- Modelo de ameaça inicial com ativos, agentes e fronteiras.

### Performance do bloco

- Medir baseline de build e bundle inicial.
- Definir orçamento: página de login e shell administrativo sem dependências excessivas.
- Registrar métricas, não otimizar prematuramente.

### Segurança do bloco

- Auditoria de dependências.
- Busca automatizada por segredos.
- Verificação de headers planejados.
- Revisão do `.gitignore` e `.env.example`.

---

## BLOCO 1 — Banco, tenant e migrations

### Features

- Conexão Neon serverless/pooled.
- Schema Drizzle.
- Migrations.
- Seed de desenvolvimento seguro.
- Repositórios/serviços com escopo de organização.
- Política de deleção.

### Histórias de usuário

**US-0101 — Persistência isolada**  
Como organização, quero que meus dados sejam isolados para que outra organização nunca os acesse.

Critérios de aceite:

- Entidades relevantes possuem `organization_id`.
- Consultas do domínio exigem contexto de organização.
- Testes tentam acessar IDs de outra organização e recebem negação/ausência.

**US-0102 — Migrations reproduzíveis**  
Como operador, quero criar o banco do zero e evoluí-lo sem operações manuais.

Critérios de aceite:

- Banco vazio chega ao schema atual apenas por migrations.
- Roll-forward testado.
- Seed não roda em produção por acidente.

### Performance do bloco

- `EXPLAIN` das consultas-base.
- Índices conferidos.
- Teste de conexão pooled.
- Detectar N+1 nos serviços iniciais.

### Segurança do bloco

- TLS obrigatório na conexão.
- Credenciais apenas no servidor.
- Teste de isolamento multi-tenant.
- Entrada SQL maliciosa coberta por queries parametrizadas.

---

## BLOCO 2 — Autenticação, sessões e RBAC

### Features

- Login/logout.
- Sessão segura.
- Recuperação de senha preparada ou implementada conforme provedor.
- CRUD inicial de usuários.
- Papéis e permissões.
- Bloqueio/desativação.
- Rate limiting de autenticação.
- Auditoria de login.

### Histórias de usuário

**US-0201 — Login seguro**  
Como usuário autorizado, quero entrar com e-mail e senha para acessar somente as funções permitidas.

Critérios de aceite:

- Mensagem não revela se e-mail existe.
- Cookie seguro, HttpOnly, SameSite apropriado.
- Sessão invalidada no logout e bloqueio do usuário.
- Redirecionamento seguro, sem open redirect.

**US-0202 — Gestão de usuários**  
Como administrador, quero criar, editar, bloquear e atribuir papéis aos usuários da minha organização.

Critérios de aceite:

- E-mail único conforme regra definida.
- Administrador não altera outra organização.
- Operações sensíveis auditadas.
- Usuário não eleva o próprio privilégio sem autorização.

**US-0203 — Autorização consistente**  
Como proprietário, quero que cada rota e ação verifique permissão no servidor.

Critérios de aceite:

- Matriz de permissões coberta por testes.
- Rotas de UI e API protegidas.
- IDOR testado.

### Performance do bloco

- Carga controlada no login e leitura de sessão.
- Medir p95 das rotas autenticadas básicas.
- Evitar buscar toda a matriz de permissões repetidamente; usar sessão/cache seguro com invalidação.

### Segurança do bloco

- Testar brute force/rate limiting.
- Fixação e roubo de sessão conforme capacidade de teste.
- CSRF em mutações.
- Escalada horizontal e vertical de privilégio.
- Política mínima de senha.
- Auditoria de dependências de autenticação.

---

## BLOCO 3 — Shell administrativo e dashboard

### Features

- Layout responsivo.
- Navegação baseada em permissão.
- Dashboard com contagens.
- Estados vazio, carregando e erro.
- Filtros básicos.
- Acessibilidade.

### Histórias de usuário

**US-0301 — Visão operacional**  
Como administrador, quero visualizar dispositivos online/offline, playlists e alertas para entender rapidamente a operação.

Critérios de aceite:

- Métricas respeitam organização.
- Online/offline possui regra visível.
- Dashboard não faz consultas repetitivas desnecessárias.

**US-0302 — Navegação por permissão**  
Como usuário, quero ver apenas módulos que posso utilizar.

Critérios de aceite:

- Menu coerente com RBAC.
- Acesso direto indevido continua bloqueado no servidor.
- Navegação por teclado funcional.

### Performance do bloco

- Lighthouse no dashboard.
- Medir LCP, CLS e tamanho do JS.
- Inspecionar queries e paralelizar leituras independentes.
- Paginar listas; não carregar tabelas inteiras.

### Segurança do bloco

- Testar exposição de dados por componentes/server actions.
- Verificar cache privado em páginas autenticadas.
- Confirmar ausência de PII em logs e HTML indevido.

---

## BLOCO 4 — Biblioteca de conteúdos e uploads

### Features

- CRUD de conteúdo.
- URL externa.
- Upload de imagem.
- Upload de vídeo.
- Upload/criação de HTML seguro.
- Metadados e preview.
- Arquivamento.
- Validação de tipo, tamanho e checksum.
- Exclusão segura e controle de referências.
- Sinalização de compatibilidade de iframe.

### Histórias de usuário

**US-0401 — Cadastrar URL**  
Como editor, quero cadastrar uma URL e sua duração padrão para adicioná-la a apresentações.

Critérios de aceite:

- Apenas protocolos permitidos.
- URLs privadas, locais e esquemas perigosos rejeitados.
- Sistema informa que sites podem bloquear iframe.
- Preview isolado.

**US-0402 — Enviar mídia**  
Como editor, quero enviar imagem ou vídeo para reproduzi-los nos dispositivos.

Critérios de aceite:

- Upload direto/assinado quando possível.
- Backend autoriza antes do upload.
- MIME real e extensão validados.
- Limites configuráveis.
- Metadados persistidos no Neon; bytes no Blob.
- Arquivo não publicado não aparece em manifesto ativo.

**US-0403 — HTML seguro**  
Como editor autorizado, quero apresentar HTML sem comprometer a central ou os dispositivos.

Critérios de aceite:

- Sanitização em modo seguro.
- HTML avançado restrito a permissão específica.
- Renderização em iframe sandbox.
- Scripts não executam no domínio administrativo.

**US-0404 — Arquivar conteúdo**  
Como editor, quero arquivar conteúdo sem quebrar playlists já publicadas.

Critérios de aceite:

- Referências são exibidas antes da ação.
- Exclusão física só ocorre quando segura.
- Manifestos publicados continuam imutáveis.

### Performance do bloco

- Upload grande não passa desnecessariamente pela memória da função.
- Teste de concorrência de uploads dentro de limites.
- Imagens entregues via CDN.
- Preview não faz download integral de vídeo sem necessidade.
- Listagem paginada e com índices.

### Segurança do bloco

- Testar polyglot file, MIME forjado, nome malicioso e path traversal.
- Testar XSS armazenado em nome, descrição e HTML.
- Testar SSRF por URL externa.
- Testar upload sem permissão e troca de organization ID.
- CSP e sandbox de iframe verificados.

---

## BLOCO 5 — Playlists

### Features

- CRUD de playlists.
- Adição/remoção de itens.
- Ordenação drag-and-drop com alternativa acessível.
- Duração por item.
- Validade opcional.
- Transições simples.
- Preview.
- Rascunho e publicação.
- Versionamento.

### Histórias de usuário

**US-0501 — Montar playlist**  
Como editor, quero combinar conteúdos em ordem e duração definidas.

Critérios de aceite:

- Posições consistentes e únicas.
- Duração obrigatória quando o tipo não possui duração natural.
- Vídeo pode usar duração natural ou limite explícito.
- Conteúdo inválido impede publicação, não edição do rascunho.

**US-0502 — Pré-visualizar**  
Como editor, quero simular a playlist antes de publicá-la.

Critérios de aceite:

- Preview usa o mesmo motor lógico do player quando possível.
- Permite avançar e voltar.
- Erro de item não trava toda a prévia.

**US-0503 — Publicar versão**  
Como operador autorizado, quero publicar uma versão imutável da playlist.

Critérios de aceite:

- Publicação valida todos os itens.
- Incrementa versão de maneira atômica.
- Gera manifesto validado.
- Upload ao Blob concluído antes de trocar o ponteiro atual.
- Falha mantém versão anterior ativa.
- Ação auditada.

### Performance do bloco

- Playlist com pelo menos 500 itens continua editável dentro do orçamento definido.
- Publicação não executa N+1.
- Manifesto compacto, sem dados administrativos.
- Teste de concorrência: duas publicações não podem produzir estado inconsistente.

### Segurança do bloco

- Autorização de conteúdo pertencente ao mesmo tenant.
- Manipulação de posição e IDs inválidos.
- Publicação concorrente.
- Injeção de campos no manifesto.
- Verificação de que tokens/segredos nunca entram no JSON.

---

## BLOCO 6 — Canais, dispositivos e pareamento

### Features

- CRUD de canais.
- CRUD de dispositivos.
- Associação dispositivo-canal.
- Playlist direta opcional com precedência documentada.
- Código de pareamento temporário.
- Token exclusivo do dispositivo.
- Revogação, bloqueio e reativação.
- Orientação e resolução.
- Manifesto/ponteiro individual.

### Histórias de usuário

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

### Performance do bloco

- Testar ativação concorrente.
- Medir leitura do ponteiro via CDN.
- Demonstrar que consulta periódica do player não alcança o Neon.
- Testar centenas de dispositivos simulados consultando manifestos cacheados.

### Segurança do bloco

- Brute force de pairing code.
- Reutilização de código consumido.
- Token roubado/revogado.
- IDOR entre dispositivos.
- Rate limiting.
- Comparação segura de tokens.

---

## BLOCO 7 — Player web/PWA e motor de reprodução

### Features

- Tela de ativação.
- Player fullscreen.
- Leitura e validação de manifesto.
- Tipos URL, imagem, vídeo e HTML.
- Temporizador robusto.
- Pré-carregamento do próximo item.
- Transição simples.
- Tratamento por item.
- Fallback.
- Cache offline.
- Persistência local segura.
- Recuperação após reinício.
- Atualização do manifesto por CDN.

### Histórias de usuário

**US-0701 — Reprodução contínua**  
Como espectador, quero que a apresentação alterne automaticamente sem intervenção.

Critérios de aceite:

- Ordem e duração respeitadas.
- Vídeo reproduz conforme política de autoplay sem áudio por padrão.
- Um item com erro é ignorado após timeout controlado.
- Player não acumula timers, listeners ou memória a cada ciclo.

**US-0702 — Atualização econômica**  
Como operador, quero publicar uma mudança que chegue às telas sem consultas contínuas ao banco.

Critérios de aceite:

- Player verifica ponteiro no CDN.
- Usa ETag/versionamento.
- Baixa manifesto apenas quando necessário.
- Neon não é acessado durante rotação normal.

**US-0703 — Operação offline**  
Como operador, quero que a tela continue funcionando durante queda de internet.

Critérios de aceite:

- Último manifesto válido persistido.
- Mídia prioritária cacheada conforme limite.
- Reconexão usa backoff e jitter.
- Falha de sincronização não apaga cache válido.

**US-0704 — URL externa**  
Como editor, quero exibir páginas externas compatíveis.

Critérios de aceite:

- Iframe isolado.
- Timeout de carregamento.
- Tela não trava quando a URL bloqueia incorporação.
- Mensagem/telemetria usa código seguro, sem vazar detalhes sensíveis.

### Performance do bloco

- Teste prolongado de reprodução por várias horas ou ciclos acelerados equivalentes.
- Medir crescimento de memória.
- Medir transição e tempo de carregamento.
- Testar playlist grande.
- Lighthouse específico do player.
- Verificar que assets estáticos e manifestos usam cache adequado.
- Meta: nenhuma consulta Neon no ciclo de rotação e nenhuma consulta de manifesto por item.

### Segurança do bloco

- CSP restritiva específica do player.
- Sandbox de conteúdos não confiáveis.
- Token não aparece em URL, logs ou mensagens de erro.
- XSS via manifesto e metadados.
- Manifesto adulterado/rejeitado.
- Cache de credencial protegido dentro das limitações do navegador.
- Player não acessa rotas administrativas.

---

## BLOCO 8 — Agendamento e conteúdo emergencial

### Features

- Agenda por dispositivo/canal.
- Data inicial/final.
- Timezone explícito.
- Prioridade.
- Playlist fallback.
- Override emergencial com expiração.
- Resolução determinística de conflitos.

### Histórias de usuário

**US-0801 — Agendar playlist**  
Como operador, quero programar conteúdo para um período definido.

Critérios de aceite:

- Timezone armazenado/interpretado corretamente.
- Conflitos são prevenidos ou resolvidos por regra visível.
- Manifesto publicado inclui programação necessária sem consulta frequente ao banco.

**US-0802 — Mensagem emergencial**  
Como administrador, quero substituir temporariamente a programação de uma ou várias telas.

Critérios de aceite:

- Prioridade máxima controlada por permissão.
- Expiração obrigatória ou confirmação explícita.
- Restauração automática da programação anterior.
- Ação auditada.

### Performance do bloco

- Resolução de agenda eficiente e indexada.
- Publicação em massa não faz uma query por dispositivo quando canais podem ser reutilizados.
- Teste de horário de virada com vários dispositivos.

### Segurança do bloco

- Permissão específica para emergência.
- Proteção contra override permanente acidental.
- Testes de timezone, datas inválidas e manipulação de prioridade.

---

## BLOCO 9 — Heartbeat, telemetria e auditoria operacional

### Features

- Heartbeat autenticado.
- Online/offline.
- Eventos locais em fila.
- Envio em lote e idempotente.
- Auditoria pesquisável.
- Retenção configurável.
- Dashboard operacional.

### Histórias de usuário

**US-0901 — Status de tela**  
Como operador, quero saber quais dispositivos estão ativos sem gerar custo excessivo de banco.

Critérios de aceite:

- Heartbeat padrão de 5 minutos.
- Offline após 15 minutos, configurável.
- Apenas atualiza último contato; não cria histórico infinito.
- Falha não interrompe o player.

**US-0902 — Evidência de reprodução**  
Como administrador, quero receber eventos agrupados para relatórios básicos.

Critérios de aceite:

- Eventos em lote.
- `batch_id` evita duplicação.
- Retenção e nível de detalhe configuráveis.
- Fila local possui tamanho máximo.

**US-0903 — Auditoria**  
Como responsável de segurança, quero rastrear mudanças administrativas relevantes.

Critérios de aceite:

- Registra ator, ação, entidade e momento.
- Redige segredos e dados sensíveis.
- Usuário comum não altera logs.

### Performance do bloco

- Simular quantidade-alvo de dispositivos enviando heartbeat.
- Medir p50, p95, p99 e taxa de erro.
- Testar lotes grandes dentro do limite.
- Confirmar índices de `last_seen_at` e dispositivo.
- Estimar consumo mensal do Neon com cenários 100, 1.000 e 10.000 telas.

### Segurança do bloco

- Replay de lote.
- Lote gigante e JSON malformado.
- Spoofing de device ID.
- Rate limiting por token/dispositivo.
- Log injection e vazamento em auditoria.

---

## BLOCO 10 — Hardening, observabilidade e recuperação

### Features

- Headers de segurança.
- Tratamento centralizado de erros.
- Logs estruturados e redigidos.
- Monitoramento.
- Health/readiness adequados.
- Backup e recuperação documentados.
- Rotação de segredos.
- Política de retenção.
- Runbooks.

### Histórias de usuário

**US-1001 — Diagnóstico seguro**  
Como operador, quero diagnosticar falhas sem expor segredos ou dados pessoais.

**US-1002 — Recuperação**  
Como responsável técnico, quero restaurar o serviço e o banco em incidente documentado.

Critérios de aceite:

- Procedimento de backup/restore do Neon documentado e ensaiado em ambiente seguro.
- Manifestos imutáveis preservam última versão.
- Runbook de revogação de dispositivo.
- Runbook de rollback de deploy.

### Performance do bloco

- Teste de carga completo.
- Perfil das rotas mais lentas.
- Avaliar cold start e consultas.
- Confirmar cache/CDN.
- Corrigir gargalos que ultrapassem orçamento.

### Segurança do bloco

- OWASP Top 10 aplicável.
- Auditoria de dependências.
- Scanner de segredos.
- DAST contra homologação autorizada.
- Revisão manual de auth, upload, iframe, tenant e device tokens.
- Nenhuma finding crítica/alta aberta.

---

## BLOCO 11 — Homologação, deploy e aceite final

### Features

- Ambientes preview/homologação/produção.
- Variáveis configuradas com menor privilégio.
- Migrations no fluxo de deploy.
- Smoke tests pós-deploy.
- Dados de demonstração não sensíveis.
- Manual administrativo.
- Manual de ativação de telas.
- Checklist de produção.

### Histórias de usuário

**US-1101 — Deploy confiável**  
Como responsável técnico, quero publicar uma versão com validação e rollback.

Critérios de aceite:

- Pipeline executa lint, tipos, testes, build e scans.
- Produção não usa credenciais de preview.
- Migration possui estratégia compatível com rollback de aplicação.
- Smoke test automatizado.

**US-1102 — Jornada completa**  
Como administrador, quero cadastrar uma tela, criar conteúdo, montar playlist, publicar e assistir à apresentação.

Critérios de aceite E2E:

1. Administrador entra.
2. Cria usuário editor.
3. Editor cadastra imagem, vídeo, HTML seguro e URL.
4. Cria playlist e ordena itens.
5. Operador cria canal e publica playlist.
6. Novo dispositivo mostra código.
7. Operador pareia e associa canal.
8. Player baixa manifesto pelo CDN.
9. Conteúdos rotacionam.
10. Internet simulada como indisponível.
11. Player continua com cache.
12. Nova versão é publicada.
13. Reconexão atualiza a programação.
14. Dispositivo envia heartbeat e telemetria em lote.
15. Token é revogado e acesso posterior é negado.

### Performance final

- Carga em rotas administrativas críticas.
- Simulação de players consultando CDN.
- Simulação de heartbeat.
- Teste prolongado do player.
- Relatório com métricas e limites conhecidos.

### Segurança final

- Reexecutar suíte completa.
- Confirmar zero findings críticas/altas.
- Confirmar isolamento entre organizações.
- Confirmar ausência de segredos no repositório, bundle e logs.
- Confirmar revogação e expiração.

---

## 12. Portão Universal de Qualidade após cada bloco

Ao terminar cada bloco, execute obrigatoriamente:

### Etapa A — Revisão funcional

1. Comparar implementação com histórias e critérios de aceite.
2. Demonstrar fluxo feliz.
3. Demonstrar pelo menos um erro esperado.
4. Verificar responsividade e acessibilidade aplicável.

### Etapa B — Testes automatizados

1. Testes direcionados do bloco.
2. Testes de regressão relacionados.
3. Lint.
4. Typecheck.
5. Build.
6. E2E dos fluxos afetados.

### Etapa C — Performance

1. Definir cenário e volume do bloco.
2. Executar teste reproduzível.
3. Registrar p50, p95, p99, throughput, erros e consumo relevante.
4. Comparar com baseline/orçamento.
5. Investigar regressão acima de 10% ou limite definido.
6. Corrigir antes de avançar quando afetar fluxo crítico.

Metas iniciais, ajustáveis após baseline:

- Rotas administrativas comuns: p95 inferior a 800 ms em homologação controlada, excluindo upload pesado.
- Rotas de autenticação: p95 inferior a 1.000 ms sob carga prevista.
- Heartbeat: p95 inferior a 500 ms sob carga prevista.
- Taxa de erro: inferior a 1% em teste válido.
- Player: transições sem travamento visível; sem crescimento contínuo de memória.
- Manifestos: pequenos, cacheáveis e sem consulta Neon durante reprodução.

Não maquiar resultados removendo cenários difíceis. Se ambiente limitado impedir uma medição realista, registrar a limitação e executar comparação relativa reproduzível.

### Etapa D — Segurança

Aplicar checklist proporcional ao bloco:

- Autenticação e autorização.
- Isolamento multi-tenant.
- Validação de entrada.
- XSS.
- CSRF.
- SQL injection.
- IDOR.
- SSRF.
- Upload malicioso.
- Path traversal.
- Rate limiting.
- Gestão de sessão/token.
- Exposição de segredos.
- Logs sensíveis.
- Dependências vulneráveis.
- Headers/CSP.

Classificação:

- Crítica/alta: bloqueia avanço.
- Média: corrigir no bloco, salvo justificativa e tarefa explícita aprovada.
- Baixa: registrar com prazo.

### Etapa E — Relatório do bloco

Criar ou atualizar `docs/reports/BLOCK-N.md` com:

```text
Status: aprovado | reprovado
Features concluídas
Histórias atendidas
Arquivos/migrations relevantes
Testes funcionais
Resultados de performance
Resultados de segurança
Falhas encontradas e correções
Débitos técnicos aceitos
Riscos
Próximo bloco
```

Atualizar `docs/STATUS.md`. Só então marcar o bloco como concluído.

---

## 13. Estratégia de testes

### Unitários

- Regras de duração.
- Ordenação.
- Resolução de programação.
- Permissões.
- Validação de manifesto.
- Sanitização/configuração de HTML.
- Backoff.
- Estado do player.

### Integração

- Repositórios com Neon/Postgres de teste.
- Isolamento tenant.
- Publicação atômica.
- Upload autorizado.
- Pareamento.
- Revogação.
- Heartbeat idempotente.
- Lotes de eventos.

### E2E

- Login e RBAC.
- Conteúdo → playlist → publicação.
- Pareamento → canal → reprodução.
- Offline → reconexão.
- Revogação.
- Emergência e restauração.

### Performance

- Administração concorrente.
- Publicação de playlist grande.
- Heartbeats simultâneos.
- Telemetria em lote.
- Player em longa duração.
- Cache hit de manifestos.

### Segurança

- SAST/lint de segurança quando compatível.
- Dependency audit.
- Secret scan.
- Testes de autorização construídos no código.
- DAST somente contra ambiente autorizado.
- Payloads controlados, nunca contra sistemas de terceiros.

---

## 14. Regras específicas de segurança

### URLs externas

- Aceitar somente `https` por padrão.
- Rejeitar `javascript:`, `data:` quando não estritamente necessário, `file:`, `ftp:` e esquemas desconhecidos.
- Resolver e bloquear destinos loopback, link-local, metadata cloud e redes privadas se o servidor fizer requisições.
- Preferir não buscar a URL no backend; compatibilidade de iframe pode ser `unknown/warning` quando não verificável com segurança.
- Não criar proxy genérico para burlar `X-Frame-Options` ou CSP.

### HTML

- Nunca inserir HTML não confiável na central com execução no mesmo contexto.
- Sanitizar modo seguro.
- Iframe sandbox com permissões mínimas.
- Separar origem para HTML avançado quando necessário.
- Bloquear acesso do HTML a cookies administrativos.

### Uploads

- Autorização antes de emitir upload.
- Chave do objeto gerada pelo servidor.
- Tamanho e MIME limitados.
- Checksum.
- Sem sobrescrita arbitrária.
- Exclusão exige verificação de referência.

### Dispositivos

- Tokens aleatórios de alta entropia.
- Apenas hash persistido.
- Tokens não enviados em query string.
- Escopo somente para o próprio dispositivo.
- Revogação imediata para APIs; CDN público deve conter apenas conteúdo autorizado para exposição.
- Se conteúdo for privado, usar estratégia de entrega autenticada/assinada com renovação segura e cache compatível.

### Auditoria

- Redigir senha, hash, token, cookie, chave, URL assinada e cabeçalhos sensíveis.
- Não permitir edição comum dos registros.
- Retenção documentada.

---

## 15. Estratégia de custo e eficiência do Neon

Requisitos obrigatórios:

1. Usar conexão pooled/serverless adequada.
2. Não abrir conexão por item reproduzido.
3. Não consultar Neon para verificar versão periódica.
4. Servir ponteiros e manifestos pelo CDN.
5. Heartbeat padrão de 5 minutos, configurável.
6. Atualizar uma linha por heartbeat, sem histórico infinito.
7. Telemetria em lote e idempotente.
8. Paginar toda listagem administrativa.
9. Evitar N+1.
10. Selecionar apenas colunas necessárias.
11. Cachear com segurança dados administrativos estáveis quando adequado.
12. Medir queries e registrar estimativa de consumo.
13. Manter player funcional durante scale-to-zero/cold start do banco.

Criar teste arquitetural ou evidência observável demonstrando:

```text
Troca de item no player       -> zero consulta ao Neon
Repetição da playlist         -> zero consulta ao Neon
Verificação de nova versão    -> CDN
Download de mídia             -> CDN
Heartbeat                     -> uma atualização espaçada
Telemetria                    -> uma gravação por lote
Operação administrativa       -> Neon conforme necessário
```

---

## 16. UX mínima obrigatória

### Central

- Interface em português do Brasil.
- Feedback de sucesso e erro acionável.
- Confirmação para ações destrutivas.
- Tabelas paginadas.
- Busca e filtros.
- Formulários com validação próxima ao campo.
- Prévia de conteúdo e playlist.
- Status com texto e cor, nunca apenas cor.
- Datas exibidas no timezone da organização.

### Player

- Sem controles administrativos.
- Tela de pareamento legível a distância.
- Código curto com contagem de expiração.
- Modo fullscreen quando permitido.
- Fallback visual discreto.
- Sem mensagens técnicas para espectadores.
- Orientação horizontal e vertical.

---

## 17. Estrutura sugerida do repositório

Adapte sem criar camadas vazias:

```text
src/
  app/
    (auth)/
    (admin)/
    player/
    api/
  components/
  features/
    auth/
    users/
    contents/
    playlists/
    channels/
    devices/
    schedules/
    audit/
    player/
  server/
    auth/
    db/
    permissions/
    services/
    storage/
    publishing/
  shared/
    schemas/
    types/
    utils/
drizzle/
tests/
  e2e/
  integration/
  performance/
  security/
docs/
  adr/
  reports/
  ARCHITECTURE.md
  SECURITY.md
  DEPLOYMENT.md
  OPERATIONS.md
  STATUS.md
```

Evitar arquivos gigantes. Organizar por domínio, não apenas por tipo técnico, quando isso melhorar manutenção.

---

## 18. Política Git e entrega incremental

- Um commit lógico por história ou conjunto coeso.
- Mensagens claras.
- Não incluir segredos, dumps ou mídia pesada.
- Não reescrever alterações não relacionadas.
- Antes de cada commit: testes direcionados.
- Antes de encerrar bloco: portão completo.
- Tags/checkpoints opcionais por bloco aprovado.
- Nunca fazer deploy de produção automaticamente sem autorização explícita do responsável.

---

## 19. Formato de comunicação da IA

No início de cada bloco, responder de forma curta:

```text
Bloco atual:
Objetivo:
Histórias:
Riscos principais:
Testes planejados:
```

Durante a execução, comunicar apenas:

- conclusão relevante;
- mudança de decisão;
- falha que altera o plano;
- bloqueio real;
- resultado do portão.

Ao terminar:

```text
Bloco:
Status:
Entregue:
Performance:
Segurança:
Testes:
Pendências:
Próximo passo:
```

Evitar narrar cada comando. Não despejar logs completos. Não declarar sucesso sem evidência.

---

## 20. Checklist final de aceite do produto

O projeto só pode ser declarado concluído quando todas as respostas forem “sim”:

- Um administrador consegue entrar com segurança?
- Usuários possuem permissões realmente aplicadas no servidor?
- Organizações estão isoladas?
- É possível cadastrar URL, imagem, vídeo e HTML seguro?
- Arquivos ficam no Blob e não no Neon?
- É possível criar, ordenar, pré-visualizar e publicar playlist?
- A publicação é versionada e atômica?
- É possível criar canal e associar dispositivos diferentes?
- O pareamento é temporário, limitado e revogável?
- Cada device possui credencial própria?
- O player executa conteúdos conforme ordem e duração?
- URL bloqueada não trava a apresentação?
- O player continua funcionando offline?
- Trocas de conteúdo não consultam o Neon?
- A verificação de versão ocorre via CDN?
- Heartbeat é espaçado?
- Telemetria é enviada em lote?
- É possível agendar programação?
- Emergência expira e restaura o canal anterior?
- Ações sensíveis são auditadas sem segredos?
- Testes críticos passam?
- Performance está dentro dos limites registrados?
- Não existem vulnerabilidades críticas ou altas abertas?
- Build de produção funciona?
- Homologação passou pelo E2E completo?
- Deploy, rollback, backup e operação estão documentados?

---

## 21. Comando inicial para a IA orquestradora

Comece agora pelo BLOCO 0.

Antes de escrever código:

1. Inspecione o repositório e preserve trabalhos existentes.
2. Leia instruções locais e identifique o gerenciador de pacotes.
3. Produza um inventário curto do estado atual.
4. Registre lacunas entre o repositório e este prompt.
5. Crie `docs/STATUS.md` e o plano do BLOCO 0.
6. Confirme escolhas técnicas por ADR apenas quando houver decisão real.
7. Implemente o menor conjunto necessário para aprovar o bloco.
8. Execute testes de performance e segurança do bloco.
9. Corrija falhas bloqueantes.
10. Registre evidências.
11. Avance automaticamente para o próximo bloco somente após aprovação do portão.

Continue até concluir o BLOCO 11 ou encontrar um bloqueio que exija autorização humana. Não substitua funcionalidades reais por protótipos visuais, não omita testes por economia de tempo e não aumente o escopo sem necessidade.

# Status

Atualizado: 2026-07-23.

Concluído: scaffold Next.js; schema/migration; Better Auth; RBAC tenant-scoped; CRUD administrativo; upload Blob; playlists/itens; publicação CDN; canais; dispositivos/pareamento; player PWA/offline; agenda/emergência; heartbeat; telemetria; auditoria; headers; testes e documentação.

Concluído (branch `feat/player-preload-transicao`, 2026-07-23): exibição em double-buffer no player — pré-carrega o próximo item escondido e só troca quando pronto (fim da tela de portal carregando), com transição 3D (cubo/flip) na virada. Portão de qualidade verde: lint, typecheck, 167 testes, build. Cubo validado visualmente com itens de imagem (dev local, sem banco, via seed de manifesto no IndexedDB). Itens `url` dependem do portal permitir iframe (`X-Frame-Options`) — limite conhecido do ADR-003. Ver ADR-006 e `docs/superpowers/specs/2026-07-23-player-preload-transicao-design.md`.

Evidência local: lint e typecheck limpos; 13 testes Vitest; 4 E2E desktop/mobile; build com 28 rotas; inspeção visual sem overlay/console error; carga `/api/health` p50 24 ms, p95 aproximado 86 ms, p99 131 ms, 682 req/s e zero erros; `npm audit` com zero vulnerabilidades.

Pendente externo: provisionar Neon/Blob/Vercel, aplicar migration/seed, executar E2E/Lighthouse/carga em homologação com credenciais e aprovar produção.

Migration: `drizzle/0000_sour_thena.sql`.

Riscos: Blob público expõe quem conhece URL; credencial web sofre risco residual de XSS; métricas reais dependem de homologação.

Próximo: configurar `.env.local`, migrar, seed, rodar portão completo e deploy preview.

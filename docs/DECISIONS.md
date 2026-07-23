# Decisões

- ADR-001: Better Auth local para evitar dependência de SaaS de identidade no MVP.
- ADR-002: manifestos versionados imutáveis + ponteiro mutável por canal.
- ADR-003: store Blob público somente para conteúdo autorizado a exposição.
- ADR-004: HTML seguro sem scripts; modo avançado fora do MVP.
- ADR-005: IndexedDB para credencial/cache do player; risco residual de XSS mitigado por CSP e ausência de HTML não confiável no mesmo contexto.
- ADR-006: exibição em double-buffer de dois slots — o próximo item pré-carrega escondido e a troca só ocorre quando ele está pronto (ou estoura o teto de 8s), eliminando a tela de portal carregando. A virada entre itens é uma transição 3D (`cube` default, `flip`, e `fade` sob `prefers-reduced-motion`), lida do campo `transition` que já viaja no manifesto. Como ainda não há UI para escolher a transição por item, o valor legado `"fade"` (default de coluna) é tratado como "não escolhido" e recai no default `cube`; nenhuma mudança de schema é necessária. Ver `docs/superpowers/specs/2026-07-23-player-preload-transicao-design.md`.

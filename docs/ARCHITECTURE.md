# Arquitetura

## Planos

- Administração: Server Components/Route Handlers → Better Auth/RBAC → Drizzle → Neon.
- Distribuição: publicação → manifesto JSON imutável → Vercel Blob/CDN → ponteiro por canal.
- Player: bootstrap autenticado uma vez → ponteiro CDN com ETag → manifesto/mídia em cache → rotação local.

Neon não participa da troca entre itens. Heartbeat atualiza uma linha a cada cinco minutos. Eventos chegam em lotes com `batch_id` único.

## Domínios

`organizations`, `organization_members`, conteúdo, playlists/itens, canais, dispositivos/tokens/pareamento, agenda/emergência, auditoria e telemetria. Entidades administrativas carregam `organization_id`; consultas e mutações derivam tenant da sessão, nunca do payload.

## Consistência de publicação

Manifesto versionado é criado primeiro. Só então versão/URL são gravadas no banco e ponteiros dos canais afetados são atualizados. Blobs versionados são imutáveis. Falha antes da atualização deixa objeto órfão recuperável; falha depois preserva versão anterior no cache do player.

## Limites conhecidos

- Store público pressupõe conteúdo autorizado para exposição por URL não adivinhável. Conteúdo privado requer Blob privado + URLs assinadas.
- HTML seguro não executa scripts e roda em iframe sem permissões.
- Atualização de playlist inteira usa transação Neon; validar suporte do driver no ambiente escolhido antes de produção.

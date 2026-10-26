# Operação e recuperação

## Rotina

- `GET /api/health/live` é liveness: responde `200` sem tocar no banco. Playwright e consumidores que só precisam saber se o processo subiu devem usar esta rota.
- `GET /api/health` é readiness/diagnóstico: verifica `select 1` no Postgres com timeout de 3 segundos; se estourar, a consulta é cancelada no servidor. Responde `200` e `{"status":"ok","database":"ok"}` quando banco está saudável; responde `503`, `status: "degraded"` e `database: "unavailable"` quando banco configurado está inacessível. Sem `DATABASE_URL`, responde `200`, `status: "degraded"` e `database: "not_configured"`, pois esta instalação não declarou dependência de banco; monitoração que exige banco deve validar esse campo. Corpo nunca expõe erro bruto ou connection string.
- Offline após 15 minutos sem heartbeat; intervalo padrão 5 minutos.
- Revogar tela: bloquear dispositivo e preencher `revoked_at` em seus tokens.
- Emergência sempre deve expirar; confirme retorno automático ao canal.
- Manter última versão imutável de manifesto para rollback de programação.

## Incidente

1. Conter: bloquear usuário/dispositivo afetado e rotacionar segredo comprometido.
2. Preservar auditoria e IDs; nunca copiar tokens para ticket/log.
3. Restaurar: recuperar Neon por PITR/backup do provedor em ambiente isolado; validar migrations e contagens.
4. Aplicação: promover último deploy saudável na Vercel.
5. Conteúdo: republicar ponteiro para manifesto imutável conhecido.
6. Validar login, publicação, ativação, CDN, offline, heartbeat e revogação.

## Custos

Rotação, repetição, mídia e versão usam CDN. Neon recebe administração, um update espaçado por heartbeat e uma escrita por lote de eventos. Ajustar retenção de `playback_event_batches` conforme volume.

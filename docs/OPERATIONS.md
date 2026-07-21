# Operação e recuperação

## Rotina

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

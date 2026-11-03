# Deploy

## Vercel

1. Importe repositório e defina raiz como esta pasta.
2. Banco Postgres: `DATABASE_URL` com usuário de aplicação (só DML). Em servidor próprio atrás de PgBouncer (modo transação), defina também `DATABASE_CA_CERT` com a CA do servidor; o driver `postgres-js` roda com `prepare: false` e valida o certificado (inclusive quando o host é IP). Neon continua compatível pela URL com `sslmode=require`.
3. Crie Vercel Blob público para mídia/manifestos; associe `BLOB_READ_WRITE_TOKEN`.
4. Configure `BETTER_AUTH_SECRET` (32+ bytes aleatórios), `BETTER_AUTH_URL` e `APP_ORIGIN` por ambiente.
5. Em job controlado, execute `npm run db:migrate` e `npm run db:seed` somente na primeira implantação.
6. Build: `npm run build`. Liveness: `/api/health/live`; readiness/DB: `/api/health`.

Preview e produção não devem compartilhar banco, Blob, secret ou credenciais bootstrap. Migration deve ocorrer antes de código que depende dela e ser retrocompatível durante rollout. Rollback da aplicação não reverte dados automaticamente.

Deploy externo não foi executado: faltam projeto, stores e credenciais autorizadas.

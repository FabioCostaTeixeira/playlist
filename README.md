# Playlist — Digital Signage

Central administrativa e player PWA para digital signage. Next.js App Router, Better Auth, Drizzle/Neon e Vercel Blob.

## Execução local

Requisitos: Node.js 20.9+, PostgreSQL Neon e store público Vercel Blob.

```bash
npm install
copy .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Sem `DATABASE_URL`, central abre em modo demonstração, sem persistir dados. Player real, autenticação e mutações exigem ambiente configurado.

## Portão de qualidade

```bash
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run test:security
npm run build
npm run test:e2e
npm run test:performance
```

## Fluxo operacional

1. Administrador cadastra conteúdo e monta playlist.
2. Publicação cria manifesto imutável no Blob e ponteiro pequeno por canal.
3. Dispositivo é cadastrado; operador gera código de seis dígitos válido por 10 minutos.
4. Player ativa uma única vez e guarda credencial no IndexedDB.
5. Bootstrap autenticado entrega URL do ponteiro. Rotação e sincronização passam a usar CDN, sem Neon.
6. Heartbeat ocorre a cada cinco minutos; telemetria aceita lotes idempotentes.

Documentação: [arquitetura](docs/ARCHITECTURE.md), [segurança](docs/SECURITY.md), [deploy](docs/DEPLOYMENT.md), [operação](docs/OPERATIONS.md) e [status](docs/STATUS.md).

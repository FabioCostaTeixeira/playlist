# 1. Fechar cadastro público

**Esforço:** menos de 1 hora · **Bloqueia faturar:** sim · **Risco em aberto hoje**

## Problema

Qualquer pessoa na internet consegue criar uma conta no sistema.

## Evidência

Verificado em produção em 22/07/2026:

```
POST /api/auth/sign-up/email  (sem sessão, sem convite)  ->  200
```

A conta foi realmente criada no banco. Em seguida foi removida.

A causa está em [`src/server/auth.ts`](../src/server/auth.ts): `emailAndPassword`
está habilitado sem `disableSignUp`, e o Better Auth expõe `/sign-up/email` por
padrão na rota `/api/auth/[...all]`.

## O que NÃO é o problema

O isolamento entre empresas resistiu. A conta criada ficou sem vínculo em
`organization_members`, então `getActor()` devolveu `null` e toda rota
administrativa respondeu 401. Nenhum dado foi exposto.

O problema é outro: cadastro aberto em produto B2B vendido por contrato permite
que terceiros povoem o banco e consumam infraestrutura sem relação comercial.

## Objetivo

Só entra no sistema quem foi cadastrado por um administrador.

## Implementação

Em [`src/server/auth.ts`](../src/server/auth.ts), dentro de `emailAndPassword`:

```ts
disableSignUp: true,
```

A opção existe nesta versão do Better Auth, confirmada em
`node_modules/@better-auth/core/dist/types/init-options.d.mts:588`.

### Atenção ao efeito colateral

[`scripts/seed.ts`](../scripts/seed.ts) usa `auth.api.signUpEmail()` para criar o
primeiro administrador. Com `disableSignUp: true` na instância principal, o seed
quebra.

O seed já monta a **própria** instância do Better Auth, separada da instância da
aplicação — então basta não repetir a flag lá. Confirmar isso ao aplicar a
mudança, porque é a forma mais provável de o item quebrar o provisionamento de um
cliente novo.

A criação de usuários pelo painel usa outro caminho
([`src/app/api/admin/users/route.ts`](../src/app/api/admin/users/route.ts)) e
precisa continuar funcionando.

## Critérios de aceite

- `POST /api/auth/sign-up/email` sem sessão responde erro, não 200
- Login de usuário existente continua funcionando
- Criar usuário pelo painel, em Usuários e acesso, continua funcionando
- `npm run db:seed` cria o primeiro administrador em um banco vazio

## Testes

Adicionar caso em `tests/security/` cobrindo:

- a rota de cadastro público recusa a criação
- a criação pelo painel, autenticada e com permissão `user:manage`, é aceita

O segundo caso é o que impede a correção de virar regressão silenciosa: sem ele,
alguém pode desligar o cadastro e não perceber que quebrou o convite de equipe.

## Risco de não fazer

Baixo impacto imediato, alta probabilidade. Contas órfãs acumulam, consomem
armazenamento e poluem a base de usuários. Em caso de auditoria de segurança de
um cliente corporativo, é apontamento certo.

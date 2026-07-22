# 2. Cadastro e troca de empresas

**Esforço:** 2 a 4 dias · **Bloqueia faturar:** sim

## Problema

Não existe forma de cadastrar uma segunda empresa. O sistema atende exatamente
uma organização: a criada pelo script de instalação.

## Evidência

Verificado em 22/07/2026:

- Não há nenhuma rota que escreva na tabela `organizations`. A busca por
  `organizations` em `src/app/api/` não retorna nada.
- A única empresa existente em produção é `Minha organizacao`
  (`organizacao-principal`), criada por [`scripts/seed.ts`](../scripts/seed.ts).
- [`src/app/api/admin/users/route.ts`](../src/app/api/admin/users/route.ts) fixa
  `organizationId: actor.organizationId` ao criar usuário. A tela Usuários e
  acesso serve para a equipe interna, nunca para clientes.
- [`src/server/access.ts`](../src/server/access.ts), em `getActor()`, busca o
  vínculo com `.limit(1)`. Um usuário vinculado a três empresas enxerga apenas
  uma, sem critério previsível e sem como trocar.

## O que já está pronto

A fundação multiempresa é sólida e não precisa ser refeita. Confirmado por teste
que inspeciona o SQL realmente gerado
(`tests/integration/tenant-contract.test.ts`):

- toda tabela de negócio tem `organization_id`
- toda consulta de leitura, escrita e exclusão filtra por `organization_id`
- `organizationId` enviado no corpo da requisição é ignorado; a origem é sempre o
  vínculo do usuário no banco

Ou seja: o trabalho é construir a camada de gestão por cima, não reescrever o
modelo.

## Objetivo

Você, como dono da plataforma, cadastra empresas clientes. Cada cliente recebe um
administrador próprio, que gerencia a própria equipe sem enxergar as demais
empresas.

## Escopo

### 2.1 Papel de operador da plataforma

Hoje o papel mais alto é `admin`, e ele é **por empresa**. Falta um nível acima,
capaz de criar empresas.

Duas abordagens:

1. **Coluna `is_platform_admin` na tabela `user`** — simples, resolve o caso de
   um único operador, e não mexe na matriz de permissões existente.
2. **Empresa-mãe com papel próprio** — mais elegante, mais trabalho.

Recomendação: opção 1. O produto tem um operador de plataforma, não uma
hierarquia de revendas. Reavaliar se surgir modelo de revenda.

### 2.2 Cadastro de empresas

Tela e rota acessíveis somente ao operador de plataforma:

- listar empresas com nome, identificador, status e contagem de telas
- criar empresa: nome, identificador único, fuso horário
- suspender empresa: `organizations.status` já aceita `suspended` no schema, mas
  **nada no código lê esse valor hoje**. Suspender precisa efetivamente bloquear
  o acesso, senão vira campo decorativo
- criar o primeiro administrador da empresa junto do cadastro

### 2.3 Troca de empresa

Substituir o `.limit(1)` de `getActor()` por seleção explícita:

- se o usuário tem um vínculo, comporta-se como hoje
- se tem vários, a empresa ativa fica na sessão, e um seletor no cabeçalho permite
  trocar
- toda troca precisa **revalidar o vínculo no banco**. A empresa ativa jamais pode
  vir de valor enviado pelo navegador, sob pena de anular todo o isolamento que
  existe hoje

Este é o ponto mais sensível do item inteiro. Um erro aqui transforma isolamento
sólido em vazamento entre clientes.

### 2.4 Convite do administrador do cliente

Enviar credencial inicial ao cliente. O mais simples que funciona: o operador
define a senha inicial e a entrega por canal combinado, com troca obrigatória no
primeiro acesso. Convite por e-mail exige provedor de envio e pode ficar para
depois.

## Fora de escopo

- Autoatendimento: cliente criando a própria conta pelo site
- Hierarquia de revendedores
- Migrar dados entre empresas

## Critérios de aceite

- Operador de plataforma cria uma segunda empresa com administrador próprio
- O administrador da empresa B faz login e **não enxerga nenhum dado da empresa A**:
  nem conteúdo, nem playlist, nem canal, nem dispositivo, nem auditoria, nem
  usuários
- Usuário vinculado a duas empresas troca entre elas e vê apenas os dados da
  empresa ativa
- Empresa suspensa impede login dos usuários dela
- Administrador de empresa não consegue criar empresa nem enxergar a listagem

## Testes

Este item exige teste de isolamento **entre duas empresas reais**, não apenas
verificação de que a consulta filtra. Criar cenário com empresa A e empresa B, com
dados em ambas, e provar que o ator de B recebe 404 ou lista vazia ao tentar
alcançar registro de A — por rota, e não só na camada de dados.

Cobrir também a troca de empresa: usuário com dois vínculos não pode, ao trocar,
alcançar dados da empresa não selecionada.

## Risco

Alto se malfeito. É a única mudança desta lista capaz de quebrar o isolamento
entre clientes, que hoje está correto. Recomenda-se revisão dedicada de segurança
antes de subir.

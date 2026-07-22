# 5. Limites por plano

**Esforço:** 2 a 3 dias · **Bloqueia faturar:** não

## Problema

Não há limite algum. Qualquer empresa pode cadastrar telas e conteúdo sem teto.
Sem limite não existe diferença entre planos, e sem diferença entre planos não há
o que precificar em faixas.

## Dependência

Depende do item 2. Limite se aplica por empresa, e hoje só existe uma.

## Objetivo

Cada empresa tem um plano com limites verificáveis, e o sistema recusa com clareza
o que ultrapassa.

## Escopo

### 5.1 Definição de plano

Tabela de planos com nome, e os limites que fazem sentido cobrar:

- número de telas ativas — provavelmente o principal, é o que reflete valor
  entregue em digital signage
- armazenamento total de mídia
- número de usuários no painel

Guardar o plano na empresa, com possibilidade de sobrescrever limite pontualmente:
negociação comercial sempre cria exceção, e sem esse campo a exceção vira gambiarra
no banco.

### 5.2 Verificação

Aplicar no ponto de criação. Os pontos que importam:

- criar dispositivo — [`src/server/resources.ts`](../src/server/resources.ts)
- criar usuário — [`src/app/api/admin/users/route.ts`](../src/app/api/admin/users/route.ts)
- upload de mídia — `src/app/api/upload`

**Contar sempre no banco, no momento da criação.** Um contador mantido à parte
desincroniza e passa a mentir.

Atenção à contagem de telas: decidir se dispositivo arquivado conta. Se contar, o
cliente fica preso a limite por telas que não usa mais; se não contar, alguém pode
arquivar e recriar em ciclo. Sugestão: contar apenas `active` e `pending`.

### 5.3 Mensagem ao atingir o limite

A recusa precisa dizer o limite, o uso atual e o caminho para resolver. Uma recusa
genérica gera chamado de suporte que poderia ser evitado, e frustra exatamente no
momento em que o cliente quer expandir — que é o momento de vender mais.

### 5.4 Visibilidade

Mostrar consumo contra limite no painel, antes de o cliente esbarrar.

## Fora de escopo

- Cobrança por excedente
- Upgrade automático ao atingir o teto

## Critérios de aceite

- Empresa no limite de telas recebe recusa clara ao criar mais uma
- A mesma empresa, após upgrade, consegue criar
- Limite de uma empresa não interfere em outra
- Painel mostra consumo atual e limite
- Exceção comercial por empresa funciona sem alterar o plano

## Testes

Cobrir a fronteira, que é onde erro de comparação se esconde: criar até o limite
deve funcionar, e a criação seguinte deve ser recusada. Testar também que a
contagem é por empresa, não global.

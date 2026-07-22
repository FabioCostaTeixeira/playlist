# Melhorias futuras

Sete itens levantados em 22/07/2026, ao avaliar o que falta para operar o
produto comercialmente. O MVP funciona e está em produção; nada aqui é correção
de defeito. São lacunas entre "o produto funciona" e "dá para vender e sustentar".

Cada arquivo traz evidência verificada no código, não suposição. Onde há
referência a arquivo e linha, o comportamento foi confirmado em execução.

## Ordem recomendada

A ordem não é arbitrária: 1 é risco em aberto hoje, 2 é pré-requisito do segundo
cliente, 3 protege contra a perda que encerra contrato. De 4 em diante, a
sequência acompanha o crescimento da base.

| # | Item | Esforço | Bloqueia faturar? |
|---|------|---------|-------------------|
| [1](01-fechar-cadastro-publico.md) | Fechar cadastro público | < 1 hora | Sim — porta aberta hoje |
| [2](02-cadastro-e-troca-de-empresas.md) | Cadastro e troca de empresas | 2 a 4 dias | Sim — sem isso não há 2º cliente |
| [3](03-backup-e-restauracao.md) | Backup e restauração testados | 0,5 a 1 dia | Sim — perda de dado encerra contrato |
| [4](04-cobranca.md) | Cobrança | 1 dia a 2 semanas | Não no início |
| [5](05-limites-por-plano.md) | Limites por plano | 2 a 3 dias | Não |
| [6](06-lgpd.md) | LGPD e contrato | 1 a 2 dias + jurídico | Sim para cliente corporativo |
| [7](07-alerta-de-erro.md) | Alerta de erro | 2 a 4 horas | Não, mas evita descobrir falha pelo cliente |

## Mínimo para cobrar com segurança

Itens **1, 2 e 3**. Os primeiros clientes podem ser faturados manualmente, sem o
item 4. O item 6 passa a ser obrigatório assim que o cliente for pessoa jurídica
com departamento jurídico.

## O que já está resolvido

Não entra nesta lista porque foi verificado e está em produção: isolamento entre
empresas no nível do SQL, permissões por papel, trilha de auditoria, limite de
tentativas de login e pareamento, zero vulnerabilidade em dependências, e portão
de qualidade automatizado com 157 testes.

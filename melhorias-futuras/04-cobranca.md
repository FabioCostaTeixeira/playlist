# 4. Cobrança

**Esforço:** 1 dia a 2 semanas, conforme o estágio · **Bloqueia faturar:** não no início

## Problema

Não existe nada relacionado a cobrança: nem plano, nem assinatura, nem registro de
pagamento.

## Princípio

Não construir cobrança automática antes de ter clientes pagando. Os primeiros
contratos são faturados manualmente sem prejuízo, e a experiência real de venda
costuma mudar o desenho da cobrança. Automatizar cedo significa refazer.

A progressão abaixo é por estágio, não uma lista para executar de uma vez.

## Estágio 1 — manual (1 a 5 clientes)

**Esforço: 1 dia.**

Sem código de cobrança. Contrato, nota fiscal e Pix ou boleto emitidos fora do
sistema.

O único trabalho no produto é registrar, na empresa, os campos que sustentam a
operação comercial: plano contratado, valor, dia de vencimento e situação
(`ativa`, `inadimplente`, `cancelada`).

Isso já permite suspender manualmente quem não pagou, apoiado no item 2.

## Estágio 2 — cobrança recorrente assistida (5 a 30 clientes)

**Esforço: 3 a 5 dias.**

Integração com gateway brasileiro — Asaas, Pagar.me ou Iugu — para gerar cobrança
recorrente com Pix e boleto. Cartão sozinho não atende: no B2B brasileiro, boleto
e Pix predominam.

Escopo:

- criar cliente e assinatura no gateway a partir do cadastro da empresa
- webhook para registrar pagamento confirmado, atraso e cancelamento
- painel do operador mostrando situação de cada empresa

**Ponto de atenção no webhook.** Ele é uma rota pública que altera estado
financeiro. Precisa validar a assinatura do gateway e ser idempotente — gateways
reenviam o mesmo evento. Sem idempotência, uma reentrega pode duplicar registro
de pagamento ou reativar conta cancelada.

Vale notar que o proxy CSRF atual
([`src/proxy.ts`](../src/proxy.ts)) cobre `/api/admin` e `/api/upload`. Um webhook
não passa por ele, e nem deveria: a autenticação dele é por assinatura, não por
sessão. Só não pode ficar sem nenhuma verificação.

## Estágio 3 — autoatendimento (30+ clientes)

**Esforço: 2 semanas.**

Contratação sem intervenção humana: escolha de plano, pagamento, provisionamento
automático da empresa, upgrade e downgrade, cancelamento pelo próprio cliente.

Só faz sentido com volume que justifique. Antes disso, atendimento humano converte
melhor e ensina mais sobre o produto.

## Decisões a tomar antes de codificar

Estas definem o modelo de dados e não são reversíveis sem retrabalho:

1. **Unidade de cobrança** — por tela ativa, por empresa, ou por faixa de telas.
   Depende do item 5.
2. **Ciclo** — mensal, anual, ou anual com desconto
3. **Comportamento na inadimplência** — as telas param de exibir ou continuam? Do
   ponto de vista comercial, parar é alavanca de cobrança. Do ponto de vista do
   cliente final, uma tela apagada na recepção dele é constrangimento público.
   Sugestão: manter exibindo e bloquear apenas o painel administrativo, ao menos
   nos primeiros dias de atraso
4. **Teste gratuito** — existe? Por quanto tempo? Exige cartão?

## Critérios de aceite (estágio 2)

- Cadastrar empresa gera assinatura no gateway
- Pagamento confirmado atualiza a situação automaticamente
- Reenvio do mesmo evento pelo gateway não duplica registro
- Webhook com assinatura inválida é recusado
- Atraso além do prazo altera a situação para inadimplente

# 6. LGPD e contrato

**Esforço:** 1 a 2 dias de implementação, mais revisão jurídica · **Bloqueia faturar:** sim para cliente corporativo

> Este documento trata dos aspectos técnicos. As definições legais — bases legais,
> redação contratual, prazos de retenção — exigem profissional de direito. Nada
> aqui substitui essa revisão.

## Problema

O sistema trata dados pessoais e não há política de privacidade, contrato de
tratamento, nem mecanismo para atender pedidos de titulares.

## Que dados pessoais existem hoje

Levantado no schema ([`src/db/schema.ts`](../src/db/schema.ts)):

| Dado | Onde | Origem |
|------|------|--------|
| Nome e e-mail | `user` | usuários do painel |
| Senha | `account.password` | armazenada com hash pelo Better Auth |
| IP e navegador | `session` | sessões de login |
| Autor e horário de cada ação | `audit_logs` | trilha de auditoria |
| Hash de IP do dispositivo | `devices.last_ip_hash` | telas |

Dois pontos favoráveis já implementados: a senha nunca é guardada em texto, e a
auditoria passa por `redact()` ([`src/server/security.ts`](../src/server/security.ts)),
que remove campos sensíveis antes de gravar.

Um ponto de atenção: se o cliente exibir conteúdo com dados pessoais — foto de
funcionário, aniversariantes do mês — esse conteúdo passa a ser dado pessoal sob
sua guarda, mesmo sem estar previsto no schema.

## Seu papel na lei

Provavelmente **operador**, tratando dados em nome do cliente, que é o
controlador. Isso muda o que o contrato precisa dizer e reduz parte das
obrigações, mas não elimina as de segurança. Confirmar com jurídico.

## Escopo técnico

### 6.1 Documentos

- Política de privacidade acessível publicamente
- Termos de uso
- Cláusula de tratamento de dados no contrato com o cliente
- Registro das operações de tratamento

### 6.2 Direitos do titular

Procedimento para responder, dentro do prazo legal:

- **Acesso** — exportar os dados de uma pessoa
- **Correção** — já atendido pela edição de usuário
- **Exclusão** — apagar os dados de uma pessoa

A exclusão tem um conflito que precisa de decisão jurídica: apagar um usuário
remove a autoria dos registros de auditoria dele. A trilha de auditoria costuma ter
base legal própria de retenção. O caminho usual é anonimizar o autor em vez de
apagar a linha, preservando a integridade do histórico.

Vale conferir o comportamento atual: a chave estrangeira `audit_logs.actor_user_id`
aponta para `user`. Verificar se a exclusão de usuário apaga ou anula os registros,
e ajustar conforme a decisão.

### 6.3 Retenção

Definir por quanto tempo guardar auditoria, sessões expiradas e telemetria de
reprodução. Hoje nada é expurgado — a base cresce indefinidamente.

### 6.4 Incidente de segurança

Procedimento escrito: como detectar, em quanto tempo comunicar o cliente, e como
comunicar a autoridade. Depende do item 7 para a detecção.

## Critérios de aceite

- Política de privacidade e termos publicados e acessíveis
- Minuta de cláusula de tratamento revisada por jurídico
- Procedimento de exportação e exclusão documentado e testado uma vez
- Prazos de retenção definidos por tipo de dado
- Plano de resposta a incidente escrito

## Risco de não fazer

Cliente corporativo pede esses documentos na diligência de contratação. Não os ter
adia ou perde a venda. O risco de sanção existe, mas o obstáculo prático aparece
antes: na mesa de negociação.

# 7. Alerta de erro

**Esforço:** 2 a 4 horas · **Bloqueia faturar:** não

## Problema

Erros são registrados, mas ninguém é avisado. A descoberta de uma falha depende de
alguém abrir os logs por conta própria — ou do cliente ligar reclamando.

## Por que isso importa mais do que parece

Caso real, em 22/07/2026: a ativação de dispositivo falhava com erro 500 em toda
tentativa, e o player traduzia a falha para "código inválido, expirado ou já
utilizado". O pareamento **nunca havia funcionado em produção**. O defeito só foi
localizado porque o log estruturado, instalado horas antes, registrava a causa
real: `No transactions support in neon-http driver`.

Sem alerta, um defeito assim permanece invisível até um cliente reclamar — e a
mensagem que ele vê pode apontar para a direção errada, como apontou.

## O que já está pronto

[`src/server/observability.ts`](../src/server/observability.ts) implementa:

- `logEvent()` — log estruturado em JSON, indexável por campo
- `captureException()` — gera identificador de correlação, registra, e **envia
  envelope ao Sentry quando `SENTRY_DSN` estiver definida**
- redação automática de campos sensíveis antes de gravar

O handler central [`src/server/http.ts`](../src/server/http.ts) já chama
`captureException()` e devolve o identificador ao cliente nas respostas 500, o que
permite ligar a reclamação do usuário à linha exata do log.

**O envio já está implementado e testado.** Falta apenas a chave.

## Escopo

### 7.1 Ativar o Sentry

1. Criar projeto no Sentry
2. Definir `SENTRY_DSN` nas variáveis de ambiente da Vercel
3. Provocar um erro controlado e confirmar que chega

Sem nenhuma alteração de código.

### 7.2 Configurar alertas

Não alertar em tudo, ou o alerta vira ruído e passa a ser ignorado. Sugestão de
gatilhos:

- qualquer erro novo, nunca visto antes
- erro recorrente acima de um limiar por hora
- falha em rota crítica: login, ativação de dispositivo, entrega de programação

Destino: e-mail ou canal de mensagens que você realmente acompanhe.

### 7.3 Monitor de disponibilidade

Complementar ao Sentry, que só enxerga erro dentro da aplicação. Se a aplicação
inteira sair do ar, não há quem envie evento.

Verificação externa periódica em `/api/health`, com alerta se falhar. Serviços
gratuitos atendem.

### 7.4 Alerta de tela ausente

Específico do produto e o de maior valor percebido pelo cliente. As telas enviam
sinal de presença; `devices.last_seen_at` já é gravado.

Uma tela que parou de reportar por período configurável merece aviso: normalmente
significa TV desligada, sem rede ou navegador fechado. Avisar antes de o cliente
perceber transforma um problema dele em demonstração de cuidado seu.

## Critérios de aceite

- Erro em produção gera notificação em minutos
- A notificação traz identificador de correlação, rota e mensagem
- Aplicação fora do ar gera alerta sem depender dela própria
- Tela sem reportar presença por período definido gera aviso
- Nenhum dado sensível aparece no que é enviado, garantido por `redact()`

## Ordem sugerida

7.1 primeiro: custa minutos e já cobre a maior parte. 7.4 é o que o cliente
percebe como diferencial. 7.2 e 7.3 podem acompanhar o crescimento da base.

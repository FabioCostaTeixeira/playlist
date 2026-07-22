# 3. Backup e restauração testados

**Esforço:** 0,5 a 1 dia · **Bloqueia faturar:** sim

## Problema

Não há procedimento de backup documentado nem restauração testada. Perder dados de
um cliente pagante encerra o contrato e é o tipo de falha que não tem correção
posterior.

## Situação atual

O banco é Neon (`sa-east-1`). O Neon oferece recuperação a um ponto no tempo, mas:

- a retenção depende do plano contratado e **não foi verificada**
- nunca foi executada uma restauração de teste
- não existe rotina de exportação independente do provedor

Backup que nunca foi restaurado não é backup: é suposição.

## Objetivo

Conseguir responder com precisão a três perguntas:

1. Quanto dado, no máximo, se perde em um incidente?
2. Em quanto tempo o serviço volta?
3. Como se recupera a exclusão acidental de um único cliente, sem afetar os demais?

A terceira é a que a recuperação a ponto no tempo **não** resolve sozinha: voltar o
banco inteiro para reaver os dados de um cliente descartaria o trabalho de todos
os outros desde então.

## Escopo

### 3.1 Confirmar o que o provedor entrega

Registrar em [`docs/OPERATIONS.md`](../docs/OPERATIONS.md): plano contratado,
janela de retenção, e granularidade da recuperação.

### 3.2 Exportação independente

Rotina periódica de `pg_dump` para armazenamento fora do Neon. Protege contra dois
cenários que a recuperação do provedor não cobre: falha ou indisponibilidade do
próprio provedor, e encerramento de conta.

Definir: frequência, destino, retenção e criptografia em repouso.

O arquivo contém dados pessoais. Tratar o destino com o mesmo cuidado do banco.

### 3.3 Restauração de teste

Restaurar em banco separado e conferir integridade: contagem de registros por
tabela, e um login funcional na cópia. **Documentar o tempo real gasto** — é esse
número que vira compromisso com o cliente.

Repetir a cada trimestre. Restauração que funcionou uma vez, há um ano, não é
garantia.

### 3.4 Recuperação por empresa

Procedimento para restaurar dados de um cliente sem tocar nos demais: restaurar em
banco temporário, extrair apenas as linhas daquela `organization_id`, reinserir na
produção.

Merece ensaio prévio, porque as tabelas têm relacionamento entre si e a ordem de
inserção importa.

## Critérios de aceite

- `docs/OPERATIONS.md` registra retenção, frequência, destino e responsável
- Uma restauração completa foi executada e o tempo, anotado
- Uma recuperação de empresa única foi ensaiada
- Perda máxima aceitável e tempo de retorno estão declarados por escrito

## Risco de não fazer

Baixa probabilidade, impacto terminal. É o item da lista com pior relação entre
esforço e consequência: menos de um dia de trabalho contra a perda irreversível
dos dados de um cliente pagante.

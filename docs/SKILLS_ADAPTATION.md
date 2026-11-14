# Plano de adaptação das skills

Complementa `SKILLS_AUDIT.md`. Lista o que será aproveitado, o que muda e o que precisa ser feito do zero. Nada aqui está implementado ainda: a implementação é da Fase 09 em diante.

## O que será aproveitado

| Origem | O que se aproveita | Destino no projeto | Fase |
| --- | --- | --- | --- |
| trader-risk | Limites em configuração, BLOCK definitivo, verificação em lote, impressão digital da operação | Módulo de risco do paper trading | 13 |
| trader-entry | Só vela fechada conta; estados aguardando / disparou / expirou | Regra do Signal Validator | 12 |
| trader-timemachine | Reamostragem de velas reais por horário, semente fixa, comparação com o ponto de equilíbrio | Backtesting | 13 |
| trader-alerts | Regra que toca uma vez, com estado | Notificações internas | 14 |
| trader-scanner | Fórmula do RSI de Wilder | Módulo de indicadores | 09 |
| trader-exit | Fórmula do ATR | Módulo de indicadores | 09 |

## Mudanças obrigatórias para opções binárias

| Conceito nas skills | Equivalente em opções binárias |
| --- | --- |
| Entrada, stop e alvo | Entrada e expiração |
| Tamanho em ações | Valor por operação |
| Risco = ações × (entrada − stop) | Risco = valor apostado |
| Retorno em múltiplos de R | Payout fixo (por exemplo, 80%) |
| Ponto de equilíbrio = 1 / (1 + R) | Ponto de equilíbrio = 1 / (1 + payout). Com payout de 80%, é preciso acertar mais de 55,6% das vezes só para empatar |
| Só lado comprado | COMPRA, VENDA ou NEUTRO |
| Pregão da NYSE | Horário do ativo na plataforma, inclusive fim de semana em OTC |

## Mudanças obrigatórias para OTC

- A cotação OTC é gerada pela própria corretora. Não existe fonte pública independente para conferir.
- Nenhum dado de Yahoo, Binance ou mercado real pode ser usado no lugar da cotação OTC.
- Não há histórico OTC disponível. Backtesting OTC só será possível com velas coletadas pelo próprio usuário ao longo do tempo.
- Cada análise precisa registrar a origem do dado: "imagem enviada pelo usuário", nunca "cotação em tempo real".

## O que será desenvolvido do zero

| Módulo | Por que não vem das skills |
| --- | --- |
| Upload e pré-processamento de imagem | Não existe no repositório |
| Motor de visão (Claude API) | Não existe no repositório |
| Indicadores em TypeScript (RSI, MACD, EMA, SMA, Bollinger, ATR, ADX, Estocástico) com testes | O repositório só tem RSI e ATR, em Python |
| Suporte, resistência, price action e padrões de velas | Não existe no repositório |
| Motor de sinais e Signal Validator | Não existe no repositório |
| Módulo OTC (origem, integridade, separação de mercados) | Não existe no repositório |
| Seletor de expiração | Não existe no repositório |
| Paper trading de binárias (registro, expiração, resultado) | O repositório só registra ordens de ações |
| Conector Homebroker (adaptadores intercambiáveis) | Não existe no repositório |
| Autenticação, banco, painel, administração | Não existe no repositório |

## Registro de alterações em código reaproveitado

Toda função portada do repositório original terá, no cabeçalho do arquivo, a origem (arquivo e commit), a licença MIT e a descrição do que mudou. A lista consolidada fica em `REPOSITORY_CHANGES.md`.

Até esta data nenhum código do repositório original foi modificado nem portado.

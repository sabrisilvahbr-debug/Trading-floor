# Auditoria das 11 skills — day-trader-skill

- **Repositório auditado:** https://github.com/Jakeschincariol/day-trader-skill
- **Versão:** 2.0.0, commit `3d0f4ef` (20/10/2026)
- **Data da auditoria:** 14/11/2026
- **Licença:** MIT (Jake Schincariol). Permite usar, copiar, modificar e redistribuir, desde que o aviso de copyright e a licença acompanhem as cópias.

## Como a auditoria foi feita

1. Leitura integral dos 11 arquivos `SKILL.md`.
2. Varredura estática dos 11 scripts Python (8.601 linhas): imports, chamadas de rede, subprocessos, leitura de variáveis de ambiente, gravação de arquivos.
3. Execução dos 315 testes offline do repositório: todos passaram (Python 3.13).
4. Conferência de permissões de arquivo e de itens de plugin (hooks, servidores MCP).

## Resultado geral

| Item | Resultado |
| --- | --- |
| Dependências | Só biblioteca padrão do Python 3.8+. Nada via pip. Opcional: `pdftotext` (trader-pelosi). |
| Código perigoso | Nenhum `eval`, `exec`, código ofuscado ou leitura de chaves. Um único subprocesso: `pdftotext`. |
| Rede | Só leitura de dados públicos: Yahoo Finance, SEC EDGAR, Nasdaq Trader, House Clerk, Stooq. |
| Corretora | Nenhum script fala com corretora. `ticket.py` só gera texto e grava log. |
| Permissões | Nenhum arquivo executável, nenhum hook, nenhum servidor MCP. |
| Estado | Tudo é gravado em arquivos JSON numa pasta local `trader/`. |
| Mercado coberto | Ações listadas nos EUA, pregão regular da NYSE (9:30–16:00, Nova York), só lado comprado. |

## Incompatibilidades estruturais com o projeto

Estas valem para as 11 skills e não dependem de adaptação pontual:

1. **Fonte de dados.** Todas leem ações americanas. Nenhuma lê cotação de opções binárias, OTC ou Homebroker. O Master Prompt proíbe usar Yahoo como se fosse cotação OTC.
2. **Modelo de operação.** As skills planejam entrada, stop e alvo, com tamanho em ações. Opção binária não tem stop nem alvo: tem valor apostado, expiração fixa e payout fixo.
3. **Calendário.** Toda a lógica de horário é a da NYSE (abertura 9:30, feriados de 2026 e 2027). OTC de corretora funciona em outros horários, inclusive fins de semana.
4. **Execução.** São scripts de linha de comando que gravam em disco local. Funções serverless da Vercel não têm disco persistente.
5. **Linguagem.** São Python; a aplicação na Vercel será TypeScript. Reaproveitar significa portar a ideia ou o algoritmo, não importar o arquivo.

## Auditoria skill por skill

Campos: A funcionalidade original · B aproveitável · C opções binárias · D OTC · E Homebroker · F modificações · G dependências · H decisão.

### 1. trader-scanner (`scan.py`, 1083 linhas)

- **A.** Monta a lista de ~5.900 ações dos EUA (Nasdaq Trader) e procura setups em fechamentos diários (rompimento de 20 dias, bandeira de alta, retomada da média de 20, RSI 14 abaixo de 30) e rompimento da faixa de abertura em barras de 5 minutos.
- **B.** A função `rsi()` (RSI de Wilder) e a função `find_setups()` como referência de regras; a prática de relatar quantos gráficos foram lidos, quantos falharam e a hora dos dados.
- **C.** Não. Os setups são de dias ou horas; binárias expiram em minutos.
- **D.** Não. Não há universo OTC nem fonte de dados OTC.
- **E.** Não.
- **F.** Trocar universo, fonte de dados e regras. Sobra apenas o cálculo do RSI.
- **G.** Biblioteca padrão; Yahoo e Nasdaq Trader.
- **H. Substituir.** O scanner do projeto será um módulo próprio sobre lista de ativos informada pelo usuário ou fonte autorizada. O RSI será reimplementado em TypeScript com testes.

### 2. trader-news (`news.py`, 546 linhas)

- **A.** Manchetes do Yahoo por ticker e documentos 8-K da SEC, mostrando só o que é novo, com etiquetas (resultado, fusão, processo).
- **B.** O padrão "mostrar só o que é novo" com estado de itens já vistos.
- **C.** Não. Notícia de empresa americana não se aplica a par de moedas com expiração de minutos.
- **D.** Não. Cotação OTC de corretora não segue necessariamente o mercado real.
- **E.** Não.
- **F.** Seria preciso outra fonte (calendário econômico) e outra lógica.
- **G.** Biblioteca padrão; Yahoo e SEC (exige identificação por e-mail).
- **H. Descartar.** Um módulo de calendário econômico pode ser avaliado depois, se houver fonte autorizada.

### 3. trader-entry (`entry.py`, 960 linhas)

- **A.** Acompanha um ativo barra a barra e aponta a primeira barra que **fecha** acima da faixa de abertura ou de um nível. Estados: aguardando, disparou, expirou, mercado fechado.
- **B.** A regra "só vela fechada conta"; a máquina de estados (aguardando / disparou / expirou); a recusa em antecipar sinal.
- **C.** Parcial. O conceito de vela fechada serve; a faixa de abertura das 9:30 não.
- **D.** Parcial, como conceito. Depende de haver dados de velas, que hoje não existem para OTC.
- **E.** Não.
- **F.** Remover faixa de abertura e calendário da NYSE; aceitar COMPRA e VENDA (o original é só compra); usar velas vindas de fonte autorizada ou lidas da imagem.
- **G.** Biblioteca padrão; Yahoo.
- **H. Adaptar (conceito).** Vira regra do Signal Validator: não classificar com base em vela ainda em formação.

### 4. trader-exit (`exit.py`, 735 linhas)

- **A.** Define stop e alvo antes da entrada (ponto médio da faixa, percentual, múltiplo de ATR; alvo em 1R ou 2R) e o horário de saída.
- **B.** A função `atr_of()` (ATR) e a prática de recusar planos sem sentido explicando o motivo.
- **C.** Não. Binária não tem stop nem alvo.
- **D.** Não.
- **E.** Não.
- **F.** O equivalente em binárias é escolher a expiração, o que é outra lógica.
- **G.** Biblioteca padrão; Yahoo (só para ATR).
- **H. Descartar.** O ATR será reimplementado no módulo de indicadores. A escolha de expiração será módulo próprio.

### 5. trader-timemachine (`timemachine.py`, 956 linhas)

- **A.** Simula 10.000 vezes o resto do pregão sorteando barras reais dos últimos 60 dias do próprio ativo, no mesmo horário, e também reexecuta a regra em cada dia passado. Diz se o plano está perto de cara ou coroa.
- **B.** O método (reamostragem de barras reais por horário, semente fixa para repetir o resultado, comparação com o ponto de equilíbrio) e a honestidade do veredito.
- **C.** Sim, como método. Em binária, a pergunta vira: "a vela de expiração fecha acima ou abaixo da entrada?" e o ponto de equilíbrio é 1 / (1 + payout).
- **D.** Só se existir histórico OTC. Hoje não existe; o Master Prompt proíbe simular histórico inexistente.
- **E.** Não.
- **F.** Trocar stop/alvo por expiração; trocar R por payout; alimentar com velas coletadas no próprio paper trading.
- **G.** Biblioteca padrão; Yahoo.
- **H. Adaptar (método), na Fase 13.** Só entra em uso quando houver histórico real suficiente.

### 6. trader-risk (`check.py`, 819 linhas)

- **A.** Portão entre a proposta e a corretora: verifica perda por operação, perda diária, número de operações por dia, janela de horário, duplicatas. Responde PASS ou BLOCK com o motivo e grava uma impressão digital de cada ordem.
- **B.** A arquitetura: limites lidos de configuração que o agente não altera; BLOCK definitivo; verificação em lote; impressão digital que invalida ordem editada; veredito de ontem não vale hoje.
- **C.** Parcial. Os limites diários e de frequência servem. Em binária, a perda máxima é o próprio valor apostado.
- **D.** Parcial, na simulação.
- **E.** Não.
- **F.** Reescrever as regras: valor por operação, perda diária, operações por dia, pausa após sequência de perdas, bloqueio de estratégia instável, proibição de martingale por padrão.
- **G.** Biblioteca padrão.
- **H. Adaptar.** É a skill mais próxima do que o projeto precisa. Será portada para TypeScript como módulo de risco do paper trading.

### 7. trader-budget (`size.py`, 881 linhas)

- **A.** Calcula quantas ações comprar a partir da distância até o stop e de quatro limites (perda máxima, teto de posição, ordem máxima, caixa).
- **B.** A ideia de dizer qual limite decidiu o tamanho.
- **C.** Não. Em binária o tamanho é o valor apostado; não há distância até stop.
- **D.** Não.
- **E.** Não.
- **F.** Seria reescrita completa.
- **G.** Biblioteca padrão.
- **H. Substituir.** Uma regra simples de valor fixo por operação simulada fica dentro do módulo de risco.

### 8. trader-broker (`ticket.py`, 720 linhas)

- **A.** Mostra a ordem, registra o "sim" do usuário e orienta o envio para Alpaca ou Interactive Brokers.
- **B.** O registro de auditoria de cada decisão.
- **C.** Não.
- **D.** Não.
- **E.** Não. O Master Prompt proíbe automatizar operações e armazenar credenciais da corretora.
- **F.** Nenhuma faz sentido.
- **G.** Biblioteca padrão; conector de corretora externo (não incluído).
- **H. Descartar.** O projeto não envia ordens. O registro de operações simuladas será do módulo de paper trading.

### 9. trader-alerts (`alerts.py`, 787 linhas)

- **A.** Alertas de preço, de horário e de abertura da NYSE, cada um tocando uma vez; busca cotações atrasadas no Yahoo.
- **B.** O modelo de regra com estado "já tocou", que evita alerta repetido.
- **C.** Parcial. Serve para avisos de horário e de limite de risco.
- **D.** Não para preço (não há cotação OTC).
- **E.** Não.
- **F.** Remover cotações e calendário da NYSE; manter o modelo de regra para notificações internas.
- **G.** Biblioteca padrão; Yahoo e Stooq.
- **H. Adaptar (padrão).** Base do sistema de notificações internas.

### 10. trader-analyst (`facts.py`, 548 linhas)

- **A.** Lê resultados trimestrais de empresas americanas na SEC.
- **B.** Nada aplicável.
- **C / D / E.** Não.
- **F.** Nenhuma.
- **G.** Biblioteca padrão; SEC (exige identificação por e-mail).
- **H. Descartar.**

### 11. trader-pelosi (`ptr.py`, 566 linhas)

- **A.** Lê as divulgações de operações de membros do Congresso americano.
- **B.** Nada aplicável.
- **C / D / E.** Não.
- **F.** Nenhuma.
- **G.** Biblioteca padrão; `pdftotext` opcional; House Clerk.
- **H. Descartar.**

## Resumo das decisões

| Decisão | Skills |
| --- | --- |
| Reutilizar como está | nenhuma |
| Adaptar | trader-entry (conceito), trader-timemachine (método), trader-risk, trader-alerts (padrão) |
| Substituir por módulo próprio | trader-scanner, trader-budget |
| Descartar | trader-news, trader-exit, trader-broker, trader-analyst, trader-pelosi |

Nenhuma das 11 skills funciona como está para opções binárias, OTC ou Homebroker. O valor do repositório para este projeto está em quatro ideias de arquitetura e em dois cálculos (RSI e ATR), não nos scripts.

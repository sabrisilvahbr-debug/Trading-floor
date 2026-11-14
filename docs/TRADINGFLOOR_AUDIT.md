# Auditoria do repositório Tradingfloor

Auditoria somente de leitura, feita em 14/11/2026 antes de qualquer reaproveitamento. O `main` do `Tradingfloor` não foi modificado; os testes rodaram em uma cópia separada. Um branch criado por engano no `Tradingfloor` ainda existe (ver seção 1).

## 1. São dois repositórios diferentes

| | `Tradingfloor` (sem hífen) | `Trading-floor` (com hífen) |
| --- | --- | --- |
| Endereço | github.com/sabrisilvahbr-debug/Tradingfloor | github.com/sabrisilvahbr-debug/Trading-floor |
| Situação | Aplicação completa, último commit em 11/11/2026 (`ca0da80`) | **Repositório oficial.** Estava vazio até 14/11/2026 |
| Conteúdo | Backend Python, backend TypeScript, painel, testes, documentos | As 11 skills de referência e os documentos das Fases 01 e 02 |

Há também, no `Tradingfloor`, o branch `claude/install-day-trader-skills` (commit `ad618576`), criado por engano nesta sessão antes de você indicar o repositório oficial. Ele contém uma cópia das skills e não está no `main`, que não foi tocado. A sessão tentou apagá-lo e o proxy recusou a escrita; a remoção precisa ser feita manualmente no GitHub, na aba Branches.

## 2. O que existe no Tradingfloor

| Parte | Tecnologia | Tamanho | O que faz |
| --- | --- | --- | --- |
| `backend/` | Python, FastAPI | 73 arquivos, ~4.800 linhas | API REST e WebSocket, dez agentes, orquestrador, indicadores, motor de sinais, risco, paper trading, memória em PostgreSQL, modo real na Binance |
| `cloudflare/` | TypeScript, Cloudflare Worker | ~5.200 linhas | O mesmo backend reescrito em TypeScript, só simulação, com leitura de gráfico por imagem |
| `frontend/` | Next.js 16, React 19, Tailwind 4, three.js | 31 arquivos, ~2.500 linhas | Painel com 12 abas, gráficos próprios, escritório 3D |
| `tests/` | pytest | 15 arquivos | Testes do backend Python |
| `database/` | SQL | 2 migrações | Tabelas genéricas de registros operacionais e financeiros |
| `docs/` | Markdown | 6 documentos | Arquitetura, decisões, fases, modo real, Cloudflare |

## 3. O que foi verificado

| Verificação | Resultado |
| --- | --- |
| Testes do backend Python (`pytest`) | 100 aprovados, 1 pulado (precisa de PostgreSQL) |
| Testes do Worker TypeScript (`vitest`) | 39 aprovados, incluindo paridade numérica com o Python |
| Checagem de tipos do painel | Sem erros |
| Compilação do painel | Concluída (site estático) |
| Checagem de tipos do Worker (`tsc --noEmit` em `cloudflare/`) | **Falha** com TS2688: falta o arquivo gerado `worker-configuration.d.ts`. Não corrigido, para não alterar o `Tradingfloor` |
| Uso de biblioteca do TradingView ou Lightweight Charts | Nenhum; os gráficos são componentes próprios |
| Provedor de IA | Google Gemini, só na leitura de imagem; a chave nunca foi configurada |

Não verifiquei o que está publicado na Cloudflare ou na Netlify, nem executei nada contra a Binance. Na Vercel, verifiquei apenas a lista de projetos (ver `SETUP_CONTAS.md`).

## 4. Diferenças em relação ao Master Prompt 2.0

| Assunto | Tradingfloor hoje | Master Prompt 2.0 | Consequência |
| --- | --- | --- | --- |
| Mercado | Criptomoedas à vista na Binance | Opções binárias e OTC | Os dados da Binance não podem ser usados como cotação OTC |
| Operação | Posição com stop e alvo | Entrada com expiração e payout | Paper trading e risco precisam de versão para binárias |
| Hospedagem | Cloudflare Worker com processo contínuo | Vercel, sem processo contínuo | O ciclo autônomo de 5 segundos não roda na Vercel |
| IA | Google Gemini | Claude API | Trocar o provedor na leitura de imagem |
| Gráficos | Componentes próprios; decisão de 11/11 proíbe TradingView e Lightweight Charts | Lista Lightweight Charts | **Conflito: precisa de decisão sua** |
| Login | Uma senha de administrador | Usuários, planos gratuitos e pagos | Autenticação e banco novos |
| Dinheiro real | Modo real na Binance, desligado por padrão | Proibido | Não será trazido |
| Agentes | Scanner, Technical, Trend, Quant, News, Risk, Strategy Researcher, Execution, Reporting, Mohamed (diretor) | Scanner, Chart, Technical, Price Action, Trend, Volatility, Strategy, Risk, Historical, Signal Validator | Cinco correspondem diretamente (Scanner, Technical, Trend, Risk, Strategy); os outros cinco precisam ser criados ou redefinidos; Execution e News não têm lugar |
| Escritório 3D | Existe | Não é citado | **Precisa de decisão sua** |

## 5. Mapa de reaproveitamento

"Trazer" significa copiar para o `Trading-floor` registrando a origem. O `Tradingfloor` continua intacto.

| Item do Tradingfloor | Decisão | Observação |
| --- | --- | --- |
| `cloudflare/src/engine/indicators.ts` | **Trazer como está** | SMA, EMA, RSI, MACD, Bollinger, ATR, VWAP, Ichimoku, Fibonacci, suporte e resistência, estrutura de mercado, padrões de vela. Faltam ADX e Estocástico, que serão escritos |
| Testes de paridade e fixtures de velas | **Trazer** | Garantem que os números continuam idênticos |
| `cloudflare/src/vision.ts` e seus testes | **Trazer e adaptar** | Validação do arquivo, saída estruturada e tratamento de erros servem. Troca-se Gemini por Claude, acrescenta-se a classificação e remove-se a conferência com a Binance para ativos OTC |
| `cloudflare/src/engine/signals.ts` | **Trazer e adaptar** | Consolidação por votos, COMPRA / VENDA / NEUTRO, mínimo de critérios. Os limiares serão revistos |
| `cloudflare/src/engine/snapshot.ts` | **Trazer** | Recusa análise com poucas velas |
| `cloudflare/src/engine/risk.ts` | **Trazer e adaptar** | Limites imutáveis e kill switch servem; as regras passam a ser as de binárias |
| `cloudflare/src/engine/paper.ts` | **Referência** | Simula posições com stop e alvo. O paper trading de binárias é outro motor |
| `cloudflare/src/agents/` e `orchestrator/` | **Trazer e adaptar** | Base da análise profunda sob demanda; fora do fluxo rápido |
| `frontend/dashboard/*`, `components/`, `lib/format.ts` | **Trazer e adaptar** | Painéis e componentes; passam a ser mobile-first e a usar login |
| `frontend/charts/CandleChart.tsx`, `LineChart.tsx` | **Trazer** | Gráficos próprios já prontos |
| `frontend/dashboard/VisionPanel.tsx` | **Trazer e adaptar** | Vira a tela de análise rápida |
| `frontend/trading-floor-3d/Office.tsx` | **Decisão sua** | Pesado para celular; recomendo deixar fora da primeira versão |
| `cloudflare/src/engine/market.ts` (Binance) | **Não trazer agora** | Fonte de mercado real, não OTC. Pode voltar depois, rotulada como cripto |
| `cloudflare/src/floor.ts`, `store.ts`, `index.ts` | **Não trazer** | Específicos do Cloudflare (Durable Object, SQLite) |
| `backend/` (Python) | **Não trazer** | A versão TypeScript tem os mesmos cálculos, com paridade testada. O Python continua no `Tradingfloor` |
| `backend/live_trading/` (modo real) | **Não trazer** | O Master Prompt proíbe operações reais |
| `database/*.sql` | **Não trazer** | Tabelas genéricas, sem usuários. O banco novo é desenhado em `ARCHITECTURE.md` |
| `infrastructure/`, `docker-compose.yml`, `netlify.toml`, `wrangler.jsonc` | **Não trazer** | Outra hospedagem |

## 6. Funcionalidades existentes e onde ficam

Nenhuma funcionalidade é apagada: o `Tradingfloor` permanece como está. O que muda é o que entra no produto novo.

| Funcionalidade | No produto novo |
| --- | --- |
| Indicadores e padrões de vela | Sim, desde o início |
| Leitura de gráfico por imagem | Sim, é a prioridade número 1 |
| Sinais COMPRA / VENDA / NEUTRO | Sim |
| Painel e gráficos | Sim, adaptados |
| Agentes e sala de reuniões | Sim, na análise profunda |
| Risco e kill switch | Sim, adaptados |
| Paper trading de cripto com stop e alvo | Fica no `Tradingfloor`; o novo simula binárias |
| Modo autônomo contínuo com dados da Binance | Fica no `Tradingfloor` (Cloudflare) |
| Escritório 3D | Depende da sua decisão |
| Modo real na Binance | Não |

## 7. Pontos de atenção encontrados

- **Modo real.** O `Tradingfloor` tem código de ordens reais na Binance Spot, desligado por padrão e, segundo os documentos de lá, nunca executado contra a corretora de verdade. Fica fora do projeto novo.
- **Sem login.** Há uma única senha de administrador. Não serve para vários usuários.
- **Leitura de imagem nunca foi usada de verdade.** O código existe e tem testes, mas a chave do Gemini não foi configurada; não há medição de qualidade nem de tempo.
- **Estratégia não validada.** Os documentos de lá registram que a simulação ao vivo ficou levemente negativa.
- **Documentos desatualizados.** `FASES.md` cita 101 testes Python e 36 do Worker; medido hoje: 100 aprovados e 1 pulado (sem PostgreSQL), e 39 do Worker.
- **Tipos do Worker não compilam.** `tsc --noEmit` em `cloudflare/` falha por falta do arquivo gerado `worker-configuration.d.ts`. O comando `wrangler types` gera esse arquivo. Não foi corrigido nesta fase.

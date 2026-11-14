# Produto: ações dos EUA com as regras das skills

14/11/2026. Modo paper: o app não envia ordens a nenhuma corretora.

## Telas

| Tela | Skill de origem | Fonte de dados |
| --- | --- | --- |
| Início: pregão da NYSE, cotações da lista, resumo paper | trader-alerts (relógio) | Yahoo Finance |
| Scanner: até 30 tickers por vez | trader-scanner | Yahoo, fechamentos diários completos |
| Trade, passo 1: rompimento do opening range | trader-entry | Yahoo, candles de 5 min de hoje |
| Trade, passo 2: stop e alvo | trader-exit | cálculo local |
| Trade, passo 3: Time Machine | trader-timemachine | Yahoo, candles de 5 min dos últimos 60 dias |
| Trade, passo 4: tamanho e risco | trader-budget e trader-risk | regras em Ajustes |
| Carteira paper | trader-broker (só registro, sem ordens) | Yahoo para o preço atual |
| Pesquisa: notícias e 8-Ks | trader-news | Yahoo RSS e SEC EDGAR |
| Pesquisa: balanço trimestral | trader-analyst | SEC EDGAR, XBRL |
| Congresso | trader-pelosi | House Clerk |
| Imagem | — | Gemini (ou Claude) lendo a captura |

## Regras mantidas das skills

- Só compra. Stop obrigatório, sempre abaixo da entrada, arredondado para baixo, nunca mais apertado que 0,05% do preço.
- Entrada no primeiro candle de 5 min que **fecha** acima da máxima do opening range.
- Tamanho pelo menor de quatro limites: perda máxima, posição máxima, ordem máxima e caixa depois da reserva.
- Risco: o veredito é PASS ou BLOCK, e BLOCK é final. Fora do pregão ou da janela de entrada, bloqueia.
- Time Machine: stop e alvo no mesmo candle contam como stop. Exige pelo menos 20 pregões completos.

## Variáveis na Vercel

| Variável | Para quê |
| --- | --- |
| `APP_ACCESS_CODE` | Obrigatória. Protege todas as rotas que buscam dados |
| `SEC_USER_AGENT` | Notícias da SEC e balanços. Seu nome e um e-mail de contato |
| `GEMINI_API_KEY` | Análise de gráfico por imagem |

## Verificações

- 61 testes automatizados, incluindo paridade com o Python das skills.
- Testado com dados reais (14/11/2026): scanner em AAPL, NVDA e BRK.B; Time Machine em AAPL com os mesmos dados no app e no `timemachine.py`; índice real da Câmara de 2026 (468 PTRs).
- Não foi testado na Vercel com as variáveis ligadas: depende do cadastro delas.

## Limites conhecidos

- Cotação do Yahoo com atraso e sem garantia: pode falhar ou ser bloqueada.
- Trades paper e ajustes ficam no navegador até o login (Supabase) ser ligado.
- O Senado e o conteúdo dos PDFs de PTR não estão no app.

# Fase 02 — Arquitetura e planejamento

TRADING MOHAMED FLOOR · 14/11/2026

## Objetivo

Fechar tecnologias, banco, estrutura e dependências, considerando suas respostas e o código que já existe no `Tradingfloor`. Nenhum código de aplicação foi escrito.

## O que foi concluído

1. **Confirmação dos repositórios.** `Tradingfloor` e `Trading-floor` são repositórios diferentes. O oficial é o `Trading-floor`.
2. **Auditoria do `Tradingfloor`,** sem alterar nada nele: `TRADINGFLOOR_AUDIT.md`.
3. **Arquitetura** para a Vercel, com estrutura de pastas, banco, variáveis e segurança: `ARCHITECTURE.md`.
4. **Passo a passo das contas:** `SETUP_CONTAS.md`.
5. **Decisões D14 a D24:** `TECHNICAL_DECISIONS.md`.

## Como suas respostas entraram

| Sua resposta | Efeito |
| --- | --- |
| Uso próprio agora, outros usuários e planos depois | Login, dono de cada registro, planos e contador de uso desde o início; cobrança depois |
| Reaproveitar o `Tradingfloor`, auditar antes | Auditoria feita; mapa do que vem, do que é adaptado e do que fica |
| Capturas serão enviadas | Viram o conjunto de teste da Fase 06 |
| Expirações e payout a confirmar | Configuração vazia, sem valor padrão |
| Contas a confirmar | Vercel já existe e está ligada; Supabase e Anthropic com passo a passo |

## Testes realizados

| Teste | Resultado |
| --- | --- |
| Backend Python do `Tradingfloor` | 100 aprovados, 1 pulado (exige PostgreSQL) |
| Worker TypeScript do `Tradingfloor` | 39 aprovados |
| Tipos e compilação do painel do `Tradingfloor` | Sem erros |
| Tipos do Worker TypeScript do `Tradingfloor` | Falha (TS2688): falta `worker-configuration.d.ts`; `wrangler types` gera o arquivo. Não corrigido |
| Conta Vercel | Existe e está ligada a esta sessão. Projeto `trading-floorby` ligado ao `Trading-floor`, criado em 14/11/2026, sem aplicação ainda |

## O que o reaproveitamento adianta

- **Indicadores:** RSI, MACD, EMA, SMA, Bollinger, ATR, suporte e resistência e padrões de vela já existem em TypeScript, com testes. Faltam ADX e Estocástico.
- **Leitura de imagem:** validação do arquivo, saída estruturada e tratamento de erros já existem. Falta trocar o provedor, classificar e medir.
- **Painel:** telas e gráficos próprios já existem. Falta login e ajuste para celular.
- **Sinais, risco e agentes:** a base existe; as regras mudam para binárias.

## Limitações

- O ciclo autônomo contínuo do `Tradingfloor` não roda na Vercel. Ele permanece lá.
- A leitura de imagem do `Tradingfloor` nunca foi usada com chave real; não há medida de qualidade nem de tempo.
- Supabase e Anthropic não foram verificados: não há conexão com eles nesta sessão.
- Os termos de uso da Homebroker continuam sem leitura (o site recusa leitura automática).
- Não foi verificado o que está publicado hoje nos projetos `tradingfloor` da Vercel.
- O projeto `trading-floorby` não tem aplicação para publicar até a Fase 05; o endereço dele deve dar 404. Não foi confirmado pelo log do deploy.
- Um branch criado por engano continua no `Tradingfloor` (ver `TRADINGFLOOR_AUDIT.md`). A remoção precisa ser feita no GitHub.

## Cronograma revisto

O reaproveitamento encurta três fases. As demais seguem `FASE_01_RELATORIO.md`.

| Fase | Antes | Agora | Motivo |
| --- | --- | --- | --- |
| 04 Fundação | 2–3 sessões | 2–3 | Login e banco são novos |
| 06 Análise rápida | 3–4 | 2–3 | Módulo de visão já existe |
| 09 Indicadores | 2–3 | 1 | Faltam só ADX e Estocástico |
| 14 Painel e administração | 2–3 | 2 | Painéis já existem |

Estimativas, não compromisso.

## Critérios de conclusão da Fase 02

- [x] Repositórios conferidos
- [x] `Tradingfloor` auditado; o `main` não foi modificado
- [x] Arquitetura, banco e estrutura de pastas definidos
- [x] Dependências listadas
- [x] Configuração de expiração e payout prevista sem valor padrão
- [x] Passo a passo das contas escrito
- [ ] Três decisões pendentes respondidas (abaixo)

## Decisões que faltam para iniciar a Fase 03

1. **Gráficos.** Em 11/11 você decidiu não usar nada do TradingView, incluindo Lightweight Charts; o Master Prompt 2.0 pede Lightweight Charts. Mantenho os gráficos próprios que já existem (recomendado) ou troco?
2. **Escritório 3D.** Fica fora da primeira versão, continuando disponível no `Tradingfloor` (recomendado), ou entra no produto novo?
3. **Interface.** Adoto shadcn/ui nas telas novas e migro os painéis antigos aos poucos (recomendado), ou mantenho só os componentes próprios?

## Próxima fase

**Fase 03 — Design.** Telas mobile-first navegáveis: login, dashboard, análise rápida, upload, sinais, histórico, paper trading e ajustes, na identidade preto, azul escuro e ciano.

Para a Fase 06, envie quando puder as capturas da Homebroker e as expirações e payouts que a plataforma mostra.

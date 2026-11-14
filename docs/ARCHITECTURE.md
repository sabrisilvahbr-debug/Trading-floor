# Arquitetura — Fase 02

TRADING MOHAMED FLOOR · 14/11/2026 · Planejamento. Nenhum código de aplicação existe ainda neste repositório.

Itens marcados **(pendente)** dependem das suas respostas no fim de `FASE_02_RELATORIO.md`.

## 1. Visão geral

```
Celular ou computador (navegador)
  └─ Aplicação Next.js na Vercel
       ├─ Telas (React, TypeScript, Tailwind)
       ├─ /api/analyze        análise rápida de imagem (1 chamada à Claude API)
       ├─ /api/...            sinais, histórico, paper trading, configurações
       └─ Motores em TypeScript (sem IA): indicadores, validador, risco, simulação
  ├─ Supabase: login e PostgreSQL
  └─ Claude API: leitura da imagem
```

- Um único projeto. Sem servidor Python, sem Redis e sem processo contínuo no início.
- O `Tradingfloor` continua existindo à parte, com o modo autônomo de cripto na Cloudflare.

## 2. Princípios

1. **Lógica financeira em código determinístico e testado.** A IA lê a imagem; quem classifica e bloqueia é código.
2. **NEUTRO é o padrão.** Sem evidência suficiente, sem ativo e timeframe confirmados, ou com imagem ruim, não há COMPRA nem VENDA.
3. **Somente simulação.** Não existe código de ordem, de conta de corretora nem de credencial de corretora.
4. **A tela mostra só o que é verdadeiro.** Sem números de exemplo; campo sem dado aparece como "não informado".
5. **Origem sempre registrada.** Cada análise guarda de onde veio o dado: imagem do usuário, velas digitadas ou fonte autorizada.
6. **OTC separado.** Dado de mercado real nunca é usado como cotação OTC.
7. **Preparado para vários usuários.** Todo registro pertence a um usuário e o banco impede que um veja o do outro.

## 3. Fluxo da análise rápida

1. No celular: escolher a captura, conferir formato, redimensionar e comprimir, pré-visualizar.
2. Confirmar ativo, timeframe e expiração.
3. Servidor: conferir login, limite de uso do plano, tipo e tamanho do arquivo.
4. Uma chamada de visão com saída estruturada (o que é visível separado do que é inferido).
5. Signal Validator em código: regras de bloqueio e classificação.
6. Resposta na tela. Gravação e métricas depois da resposta.

Tempos gravados por análise: upload, pré-processamento, modelo, validação e total.

## 4. Estrutura de pastas

Só serão criadas as pastas que tiverem código real. A coluna "Origem" indica o que vem do `Tradingfloor`.

```
Trading-floor/
├─ app/                     telas e rotas (Next.js)
│  ├─ (auth)/               login e cadastro
│  ├─ (app)/                dashboard, análise, sinais, histórico, paper, ajustes
│  ├─ admin/                administração
│  └─ api/                  Route Handlers
├─ components/              componentes de interface         ← Tradingfloor frontend/components
├─ charts/                  gráficos próprios                ← Tradingfloor frontend/charts
├─ lib/
│  ├─ indicators/           indicadores                      ← Tradingfloor cloudflare/src/engine/indicators.ts
│  ├─ vision/               leitura da imagem                ← Tradingfloor cloudflare/src/vision.ts (adaptado)
│  ├─ signals/              motor de sinais e validador      ← Tradingfloor engine/signals.ts (adaptado)
│  ├─ risk/                 limites e bloqueios              ← Tradingfloor engine/risk.ts (adaptado)
│  ├─ paper/                simulação de binárias            novo
│  ├─ otc/                  regras de OTC                    novo
│  ├─ agents/               análise profunda                 ← Tradingfloor agents/ e orchestrator/ (adaptado)
│  ├─ integrations/         adaptadores de dados             novo
│  └─ db/                   acesso ao banco                  novo
├─ supabase/migrations/     migrações do banco               novo
├─ tests/                   testes                           ← inclui paridade e fixtures do Tradingfloor
├─ docs/
├─ .claude/skills/          as 11 skills de referência (fora da aplicação)
└─ trader/config.json       configuração das skills de referência
```

O Master Prompt sugere pastas `frontend/` e `backend/` separadas. Em um projeto Next.js na Vercel as duas partes ficam no mesmo projeto; a separação acima é por função.

## 5. Banco de dados

PostgreSQL no Supabase. Toda tabela com dados de usuário tem `user_id` e regra de acesso por linha.

| Tabela | Conteúdo |
| --- | --- |
| `profiles` | Dados do usuário e papel (usuário ou administrador) |
| `plans` | Planos e limites (por exemplo, análises por dia). Valores definidos por você |
| `user_plans` | Plano de cada usuário e validade |
| `usage_counters` | Uso por usuário e por dia, para aplicar o limite do plano |
| `market_sources` | Origem de dados: imagem do usuário, velas digitadas, fonte autorizada |
| `assets` | Ativos, com marcação OTC ou mercado real |
| `asset_settings` | Expirações e payout por ativo. **Sem valor padrão**: fica vazio até você informar |
| `candles` | Velas numéricas, quando existirem, com a origem |
| `strategies` | Estratégias e versão |
| `analyses` | Cada análise: usuário, ativo, timeframe, origem, qualidade da imagem, leitura estruturada, tempos |
| `signals` | Classificação, justificativa, estratégia e versão, bloqueios aplicados |
| `simulations` | Operações simuladas: sinal, valor, expiração, payout informado |
| `results` | Resultado observado de cada simulação e quem informou |
| `backtests` | Execuções de teste histórico |
| `alerts` | Notificações internas |
| `risk_limits` | Limites de risco; só administrador altera |
| `audit_log` | Registro de ações |
| `api_usage` | Consumo e custo estimado da Claude API |
| `settings` | Configurações gerais |

Agentes e indicadores são código, não tabela; o que eles produzem fica dentro de `analyses`.

### Expirações e payout

- Nenhum valor é assumido. `asset_settings` começa vazia.
- A tela de ajustes permite cadastrar, por ativo, as expirações disponíveis e o payout.
- Enquanto o payout não for informado, o sistema mostra "payout não informado" e não calcula ponto de equilíbrio nem expectativa.

## 6. Usuários e planos

- Login pelo Supabase Auth (e-mail e senha no início).
- Planos gratuito e pago existem no banco desde o começo, com limite de análises.
- Cobrança (meio de pagamento) **não** entra nesta etapa; será decidida quando houver outros usuários.
- Enquanto só você usar, o plano gratuito da Vercel atende. Com outros usuários ou cobrança, é preciso o plano Pro da Vercel.

## 7. Dependências

| Pacote | Para quê | Situação |
| --- | --- | --- |
| next, react, react-dom, typescript | Aplicação | Já usados no Tradingfloor |
| tailwindcss | Estilos | Já usado no Tradingfloor |
| @supabase/supabase-js, @supabase/ssr | Login e banco | Novo |
| @anthropic-ai/sdk | Claude API | Novo |
| zod | Validar entradas e a saída do modelo | Novo |
| vitest | Testes | Já usado no Tradingfloor |
| decimal.js | Contas com dinheiro sem erro de arredondamento | Já usado no Tradingfloor |
| shadcn/ui | Componentes | Master Prompt pede; o Tradingfloor tem componentes próprios **(pendente)** |
| lightweight-charts | Gráficos | Master Prompt pede; decisão de 11/11 proíbe **(pendente)** |
| three, @react-three/* | Escritório 3D | Só se o 3D entrar **(pendente)** |

As versões exatas serão fixadas na Fase 04, no momento da instalação.

## 8. Variáveis de ambiente

| Nome | Onde fica | Exposta ao navegador |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Sim (é pública por natureza) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Sim (é pública por natureza) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | **Não** |
| `GEMINI_API_KEY` | Vercel | **Não** |
| `GEMINI_MODEL` | Vercel | Não |
| `ANTHROPIC_API_KEY` | Vercel (alternativa) | **Não** |
| `VISION_MODEL` | Vercel | Não |
| `APP_ACCESS_CODE` | Vercel | **Não** (o usuário digita no app; o servidor compara) |

Nenhuma delas vai para o GitHub nem para o chat. O repositório `Trading-floor` é público, conferido pela API do GitHub em 14/11/2026.

## 9. Segurança

- Login obrigatório para analisar.
- Limite de uso por usuário, aplicado no servidor.
- Arquivo conferido pelo conteúdo real, não só pela extensão; limite de tamanho.
- Texto digitado pelo usuário vai ao modelo como contexto, nunca como instrução.
- Saída do modelo validada antes de ser usada.
- Regras de acesso por linha no banco.
- Limites de risco alteráveis só por administrador.

## 10. O que esta arquitetura não faz

- Não mantém conexão aberta nem ciclo contínuo (limite da Vercel).
- Não lê cotação da Homebroker: não há integração autorizada.
- Não calcula indicadores exatos a partir de imagem; isso exige velas numéricas.
- Não prova que os sinais funcionam: isso só o paper trading poderá medir.

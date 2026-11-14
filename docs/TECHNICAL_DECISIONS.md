# Decisões técnicas

Cada decisão tem situação **Decidida** (segue do que foi verificado) ou **Proposta** (depende de resposta do usuário na Fase 02).

## D01 — Nenhuma skill é usada como está · Decidida

As 11 skills leem ações dos EUA e planejam stop e alvo. Ver `SKILLS_AUDIT.md`. Quatro são adaptadas como ideia, duas substituídas, cinco descartadas.

## D02 — As skills ficam em `.claude/skills/`, fora da aplicação · Decidida

São referência e ferramenta do assistente de desenvolvimento. O Master Prompt pede `skills/original`, `skills/adapted` e `skills/custom`; essas pastas só serão criadas quando houver código real para colocar nelas, porque o próprio Master Prompt proíbe arquivos vazios.

## D03 — Aplicação única em Next.js na Vercel · Proposta

Frontend e backend no mesmo projeto Next.js (Route Handlers). Sem FastAPI no início: os indicadores são matemática simples e rodam em TypeScript. Um serviço Python externo só entra se o backtesting exigir.

## D04 — Análise rápida com uma única chamada de visão · Proposta

Uma chamada à Claude API por imagem, com saída estruturada. Indicadores e validação rodam em código, sem IA. Os dez agentes ficam para a análise profunda, sob demanda. Ver `FASE_01_RELATORIO.md`, seção 4.

## D05 — Imagem comprimida no celular antes do envio · Decidida

O corpo de uma requisição a uma função da Vercel é limitado a 4,5 MB. A imagem é redimensionada e comprimida no navegador e enviada direto à função, sem passar por armazenamento, o que também reduz tempo.

## D06 — Chave da Claude API só no servidor · Decidida

Variável de ambiente na Vercel. Nunca no frontend nem no GitHub. Este repositório é público.

## D07 — Sem processo contínuo na Vercel · Decidida

Funções têm duração máxima. Não haverá worker permanente nem WebSocket persistente dentro da Vercel. O modo de imagem não precisa de nenhum dos dois.

## D08 — Homebroker: somente modo de imagem · Decidida até prova em contrário

Não foi encontrada API, WebSocket ou documentação pública de integração. O conector terá a interface de adaptadores, com apenas o adaptador de imagem implementado. Os demais ficam declarados como "não disponível", sem fingir conexão.

## D09 — NEUTRO é o resultado padrão · Decidida

Imagem ilegível, ativo ou timeframe não confirmados, vela em formação sem contexto, ou evidência fraca resultam em NEUTRO. Não haverá percentual de assertividade enquanto não houver estatística própria do paper trading.

## D10 — Resultado das operações simuladas é informado pelo usuário · Proposta

Sem fonte de cotação OTC, o sistema não tem como saber sozinho se a operação simulada ganhou ou perdeu. O usuário informa o resultado (ou envia a imagem da vela de expiração). Isso é o que permitirá medir os sinais.

## D11 — Banco PostgreSQL gerenciado com autenticação · Proposta

Supabase é a opção indicada no Master Prompt. Preço e limites do plano serão conferidos na Fase 02, antes de decidir.

## D12 — Modelo de visão escolhido por medição · Proposta

Começar pelo modelo mais rápido e barato e comparar com o intermediário em um conjunto fixo de capturas reais do usuário. A escolha sai da medição de tempo e de qualidade, não de suposição.

## D13 — Martingale fora do padrão · Decidida

Não será estratégia padrão nem sugerida. Os limites de risco ficam em configuração administrativa que os agentes não alteram.

## Fase 02 — 14/11/2026

### D14 — Trading-floor é o repositório oficial; Tradingfloor fica intacto · Decidida

São repositórios diferentes. O código útil do `Tradingfloor` é copiado para cá com a origem registrada. Nada é apagado nem alterado lá. Ver `TRADINGFLOOR_AUDIT.md`.

### D15 — Reaproveitar a versão TypeScript, não a Python · Decidida

O `Tradingfloor` tem os mesmos cálculos em Python e em TypeScript, com paridade testada. A Vercel roda TypeScript no mesmo projeto do painel, então a versão TypeScript é a que entra. Isso confirma D03: sem FastAPI no início.

### D16 — Modo real da Binance não é trazido · Decidida

O Master Prompt proíbe operações reais. O código de `backend/live_trading` fica só no `Tradingfloor`.

### D17 — Dados da Binance não entram na primeira versão · Decidida

São cotações de cripto em mercado real. Não podem ser usadas como cotação OTC. Podem voltar depois como fonte separada e rotulada.

### D18 — Arquitetura preparada para vários usuários e planos · Decidida

Login, dono de cada registro, regra de acesso por linha, tabela de planos e contador de uso desde a Fase 04. Cobrança fica para depois.

### D19 — Expirações e payout sem valor padrão · Decidida

Ficam vazios até o usuário informar o que a plataforma mostra. Sem payout informado, o sistema não calcula ponto de equilíbrio nem expectativa.

### D20 — Supabase para login e banco · Decidida (substitui D11)

Plano gratuito no início. Ele pausa o projeto após 7 dias sem uso; o plano Pro parte de US$ 25 por mês.

### D21 — Claude API no lugar do Gemini · Decidida

O Master Prompt 2.0 é mais recente que a decisão de 11/11 do `Tradingfloor`. O módulo de visão terá o provedor isolado em um arquivo, para permitir troca.

### D22 — Biblioteca de gráficos · Adotada a recomendação (14/11)

A decisão de 11/11 no `Tradingfloor` proíbe TradingView e Lightweight Charts; o Master Prompt 2.0 lista Lightweight Charts. Recomendação: manter os gráficos próprios, que já existem e funcionam.

### D23 — Escritório 3D · Adotada a recomendação (14/11)

Não é citado no Master Prompt 2.0 e pesa no celular. Recomendação: fora da primeira versão; continua disponível no `Tradingfloor`.

### D24 — Componentes de interface · Adiada (14/11)

O Master Prompt pede shadcn/ui; o `Tradingfloor` tem componentes próprios. Recomendação: adotar shadcn/ui nas telas novas e migrar os painéis trazidos aos poucos.

Em 14/11, ao autorizar as Fases 03 a 05, a primeira versão foi feita com componentes próprios e CSS simples, sem shadcn/ui, para publicar mais rápido. A adoção do shadcn/ui pode ser feita depois sem mudar as regras do sistema.

### D25 — Código de acesso na análise · Decidida (14/11)

O site é público e cada análise custa dinheiro na Claude API. Até o login com Supabase existir, a rota `/api/analyze` só responde a quem envia o código definido em `APP_ACCESS_CODE`. Sem essa variável, a análise fica desligada.

### D26 — Dados no aparelho até o Supabase · Decidida (14/11)

Análises, simulações e ajustes ficam no navegador (localStorage). O esquema do banco já está em `supabase/migrations/0001_init.sql`, com regra de acesso por linha, para ser aplicado quando o projeto Supabase for criado.

### D27 — Validador determinístico do sinal · Decidida (14/11)

A IA descreve a imagem e lista critérios; o código decide. Só sai COMPRA ou VENDA com imagem legível, confiança de pelo menos 60%, pelo menos 3 critérios a favor, no máximo 1 contra e diferença de pelo menos 2. Qualquer outro caso é NEUTRO. Os números ficam em `lib/vision.ts` (`RULES`).

### D28 — Resultado da simulação marcado pelo usuário · Decidida (14/11)

Não existe cotação pública de ativos OTC. O app não busca preço em outra fonte; o usuário marca acerto, erro ou empate olhando a plataforma.

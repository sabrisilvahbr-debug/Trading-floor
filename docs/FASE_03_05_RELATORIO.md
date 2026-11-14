# Fases 03 a 05 — Telas, fundação e publicação

TRADING MOHAMED FLOOR · 14/11/2026

Feitas juntas por autorização do dono do projeto, para o app já funcionar.

## Como o app funciona

A análise é **por imagem**, não por automação:

1. Você tira uma captura de tela do gráfico de velas na plataforma.
2. Envia no app, em **Analisar**. A imagem é reduzida no aparelho e mandada ao servidor.
3. O servidor pede à Claude API que descreva só o que está visível e liste critérios (tendência, últimas velas, suporte, padrões).
4. O código do servidor aplica o validador (D27) e decide **COMPRA**, **VENDA** ou **NEUTRO**. Na dúvida, NEUTRO.
5. O resultado fica no histórico do aparelho. Se quiser, você registra uma entrada simulada e depois marca o resultado.

O app não lê cotações, não acompanha o mercado sozinho, não opera e não guarda senha de corretora.

## Telas (Fase 03)

| Tela | O que faz |
| --- | --- |
| Início | Situação do servidor, contagem de sinais, resultado da simulação, últimas análises |
| Analisar | Envio da imagem, observação opcional, resultado com motivos e critérios |
| Histórico | Análises anteriores, filtro por sinal, apagar |
| Simulação | Entradas simuladas com expiração e payout digitados; acerto, empate de equilíbrio e resultado |
| Ajustes | Código de acesso; ativos, expirações e payouts (sem valores prontos); apagar dados |

Mobile-first, navegação inferior, preto, azul escuro e ciano.

## Fundação (Fase 04)

| Item | Arquivo |
| --- | --- |
| Leitura da imagem e validador | `lib/vision.ts` (adaptado de `cloudflare/src/vision.ts` do `Tradingfloor`) |
| Rota de análise, protegida por código | `app/api/analyze/route.ts`, `lib/access.ts` |
| Situação do servidor, sem expor segredos | `app/api/status/route.ts` |
| Cálculos da simulação | `lib/stats.ts` |
| Dados no aparelho | `lib/storage.ts` |
| Compressão da imagem no navegador | `lib/image.ts` |
| Esquema do banco (preparado, não aplicado) | `supabase/migrations/0001_init.sql` |
| Testes | `tests/` |

## Publicação (Fase 05)

Projeto Vercel `tradingo-floor`, endereço https://tradingo-floor.vercel.app, publicado a partir do `main`.

## Verificações

| Verificação | Resultado |
| --- | --- |
| Testes (`vitest`) | 27 aprovados |
| Tipos (`tsc --noEmit`) | Sem erros |
| Compilação (`next build`) | Concluída |
| Teste local das rotas | Telas 200; análise sem código 401; sem chave 503 com mensagem clara |
| Pastas `docs/` e `.claude/` | Não são mais servidas pelo site (404) |

## O que ainda falta para a análise funcionar

Cadastrar `APP_ACCESS_CODE` e `ANTHROPIC_API_KEY` na Vercel (passo a passo em `SETUP_CONTAS.md`, seção 1) e digitar o código em Ajustes. Sem isso, as telas abrem e a simulação funciona, mas a análise responde que está desligada.

## Limitações

- A qualidade da leitura nunca foi medida com capturas reais. Isso depende das capturas da plataforma que você vai enviar.
- Não há login ainda: os dados ficam só no navegador do aparelho.
- Os parâmetros do validador são um ponto de partida, não foram calibrados.
- Os termos de uso da plataforma continuam sem leitura.

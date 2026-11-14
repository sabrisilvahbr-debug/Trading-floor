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

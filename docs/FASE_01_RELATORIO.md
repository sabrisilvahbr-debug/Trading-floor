# Fase 01 — Relatório de auditoria e planejamento técnico

TRADING MOHAMED FLOOR · Master Prompt Enterprise 2.0 · 14/11/2026

Nenhum código de aplicação foi escrito nesta fase. Este relatório separa o que foi **verificado** do que é **estimativa** ou **proposta**.

## 1. Resumo

1. As 11 skills foram auditadas e instaladas como referência. **Nenhuma serve como está** para opções binárias, OTC ou Homebroker. Quatro são adaptadas como ideia, duas substituídas, cinco descartadas.
2. **Não foi encontrada integração autorizada com a Homebroker.** O projeto começa só com envio manual de imagens.
3. **Cotação OTC é gerada pela própria corretora.** Não há fonte independente nem histórico. Isso limita o backtesting e a validação dos sinais mais do que qualquer questão de programação.
4. A arquitetura na Vercel é viável para análise de imagem. A meta de 5 segundos é plausível com uma única chamada de visão, mas só a medição real confirma.
5. O custo de operação estimado é baixo. O risco principal do projeto é de produto e regulatório, descrito na seção 8.

## 2. Auditoria das skills

Detalhe completo em `SKILLS_AUDIT.md`; plano de adaptação em `SKILLS_ADAPTATION.md`.

| Skill | Decisão | Motivo curto |
| --- | --- | --- |
| trader-scanner | Substituir | Universo e dados são ações dos EUA; aproveita-se a fórmula do RSI |
| trader-news | Descartar | Notícias de empresas americanas e documentos da SEC |
| trader-entry | Adaptar (conceito) | "Só vela fechada conta" vira regra do validador |
| trader-exit | Descartar | Binária não tem stop nem alvo; aproveita-se a fórmula do ATR |
| trader-timemachine | Adaptar (método) | Reamostragem serve, mas exige histórico que ainda não existe |
| trader-risk | Adaptar | Estrutura de limites e bloqueio serve ao paper trading |
| trader-budget | Substituir | Dimensiona ações pela distância do stop |
| trader-broker | Descartar | Envia ordens a corretoras; o projeto não opera |
| trader-alerts | Adaptar (padrão) | Alerta que toca uma vez, com estado |
| trader-analyst | Descartar | Balanços de empresas americanas |
| trader-pelosi | Descartar | Divulgações do Congresso americano |

Verificado: licença MIT, só biblioteca padrão do Python, 315 testes do original aprovados, nenhum script fala com corretora.

## 3. Arquitetura proposta para a Vercel

```
Celular (navegador)
  └─ Next.js (React, TypeScript, Tailwind, shadcn/ui, Lightweight Charts)
       ├─ compressão da imagem no próprio aparelho
       └─ POST /api/analyze  ──────────────►  Função da Vercel (Route Handler)
                                                ├─ valida arquivo, usuário e limite de uso
                                                ├─ 1 chamada de visão à Claude API (saída estruturada)
                                                ├─ validação determinística (Signal Validator)
                                                └─ grava análise e tempos no PostgreSQL
```

- **Um único projeto Next.js.** Sem FastAPI no início.
- **Banco e autenticação:** PostgreSQL gerenciado (Supabase proposto).
- **Sem Redis no início.** Limite de uso pode ser feito no banco; Redis entra se a medição pedir.
- **Sem armazenamento de imagem no caminho rápido.** Guardar a imagem para histórico é opcional e acontece depois da resposta.

Limites da Vercel verificados na documentação oficial em 14/11/2026:

| Item | Hobby | Pro |
| --- | --- | --- |
| Preço | Grátis | US$ 20 por usuário por mês |
| Uso comercial | **Não permitido** (só pessoal) | Permitido |
| Duração máxima de função | 300 s | 300 s, configurável até 800 s |
| Corpo da requisição | 4,5 MB | 4,5 MB |
| Incluído no mês | 1.000.000 de invocações, 4 horas de CPU ativa | uso sob demanda |

Consequências: a imagem precisa chegar abaixo de 4,5 MB (resolvido com compressão no celular); não há processo permanente; se o projeto tiver usuários pagantes, o plano Hobby deixa de valer.

## 4. Análise rápida de imagem

### Fluxo rápido (o que roda a cada captura)

1. **No celular:** conferir formato (PNG, JPEG, WebP), redimensionar o lado maior para cerca de 1.500 px, comprimir, mostrar pré-visualização.
2. **Usuário confirma** ativo, timeframe e expiração. Sem isso não há análise.
3. **Servidor:** validar tipo real do arquivo, tamanho e limite de uso.
4. **Uma chamada de visão** com saída estruturada: legibilidade, ativo e timeframe lidos (se visíveis), velas recentes, tendência, suportes e resistências visíveis, padrões, indicadores visíveis, e o que é **visível** separado do que é **inferido**.
5. **Signal Validator em código:** aplica as regras de bloqueio e devolve COMPRA, VENDA ou NEUTRO.
6. **Resposta ao usuário.** Gravação no banco e métricas não atrasam a resposta.

### O que fica fora do fluxo rápido

Dez agentes em sequência, backtesting, filas e segunda chamada de IA. Tudo isso é da análise profunda, sob demanda.

### Regras de bloqueio (resultam em NEUTRO ou em recusa)

- Imagem ilegível, cortada ou sem área de gráfico.
- Ativo ou timeframe lidos na imagem diferentes do que o usuário informou.
- Evidências visuais contraditórias ou insuficientes.
- Limite de risco do paper trading atingido.

### Limite importante

De uma captura de tela não saem valores exatos de indicadores. RSI, MACD e os demais só são **calculados** quando há velas numéricas (fonte autorizada ou digitadas). Lidos da imagem, são marcados como **estimativa visual**.

### Medição

Cada análise grava cinco tempos: upload, pré-processamento, resposta do modelo, validação e total. As metas do Master Prompt (mediana até 5 s, percentil 95 até 10 s) serão conferidas com capturas reais na Fase 06. Se não forem atingidas, o relatório dirá em qual etapa está o gargalo.

## 5. Limitações de Homebroker e OTC

**Verificado em 14/11/2026:**

- Não encontrei API, WebSocket ou documentação pública para desenvolvedores da Homebroker.
- O site `homebroker.com` recusou a leitura automática; não consegui ler os termos de uso por este meio.
- Reportagens de agosto de 2026 informam que a própria plataforma declara, na tela de login, não ter autorização da CVM para atender investidores brasileiros, e relatam reclamações de saques bloqueados ([Livecoins](https://livecoins.com.br/home-broker-e-alvo-de-reclamacoes-por-bloqueios-de-saques-e-admite-nao-ter-licenca-no-brasil/), [SpaceMoney](https://www.spacemoney.com.br/investimentos/criptomoedas/home-broker-reclamacoes-saques-licenca/)).
- A CVM já emitiu alertas e ordens de suspensão contra ofertas de opções binárias a brasileiros por plataformas sem autorização ([caso IQ Option](https://conteudo.cvm.gov.br/export/sites/cvm/decisoes/anexos/2022/20221108/2718_22.pdf)).

**Consequências para o projeto:**

- Conector Homebroker: apenas o adaptador de imagem. API, WebSocket e importação ficam declarados como indisponíveis até haver autorização por escrito da plataforma.
- OTC: a cotação é produzida pela corretora. Não há como conferir com fonte externa, e o Master Prompt proíbe substituir por Yahoo ou Binance.
- Histórico OTC: não existe. Só o que o usuário coletar daqui para frente.
- Resultado das simulações: precisa ser informado pelo usuário, porque o sistema não enxerga a cotação.

## 6. Custos estimados

### Operação mensal

| Item | Custo | Situação |
| --- | --- | --- |
| Vercel Hobby | Grátis, só uso pessoal | Verificado |
| Vercel Pro | US$ 20 por usuário por mês | Verificado |
| Claude API | Ver tabela abaixo | Preço verificado; consumo estimado |
| PostgreSQL gerenciado (Supabase) | A conferir | **Não verificado** nesta fase |
| Domínio próprio | Opcional | Não verificado |

### Claude API por análise

Preços oficiais em 14/11/2026, por milhão de tokens. Consumo **estimado** por análise: 3.100 tokens de entrada (imagem de cerca de 1.600 mais instruções) e 500 de saída. O tamanho da imagem em tokens é aproximação de terceiros e será medido na Fase 06.

| Modelo | Entrada | Saída | Por análise | Por 1.000 análises |
| --- | --- | --- | --- | --- |
| Claude Haiku 5.5 | US$ 0,10 | US$ 0,50 | ≈ US$ 0,0006 | ≈ US$ 0,56 |
| Claude Sonnet 5.5 | US$ 2 | US$ 10 | ≈ US$ 0,011 | ≈ US$ 11 |
| Claude Opus 5.5 | US$ 4 | US$ 20 | ≈ US$ 0,022 | ≈ US$ 22 |

### Desenvolvimento

Feito nestas sessões com o Claude, sem contratação de terceiros. O custo é o do seu plano do Claude e o seu tempo para testar cada fase no celular.

## 7. APIs e contas necessárias

| Necessidade | Para quê | Quando |
| --- | --- | --- |
| Conta GitHub | Código (já existe) | — |
| Conta Vercel | Hospedagem | Fase 05 |
| Chave da Claude API (console.anthropic.com) | Análise de imagem | Fase 06 |
| Projeto Supabase ou equivalente | Banco e login | Fase 04 |
| API da Homebroker | Dados de mercado | Não disponível |

A chave da Claude API será colocada por você nas variáveis de ambiente da Vercel. Ela nunca deve ser colada no chat nem no GitHub.

## 8. Riscos e limitações

| Risco | Gravidade | O que fazer |
| --- | --- | --- |
| **Validade dos sinais.** Não há evidência de que análise técnica sobre cotação OTC gerada pela corretora tenha poder de previsão. Com payout de 80%, é preciso acertar mais de 55,6% só para empatar. | Alta | NEUTRO como padrão; nenhuma porcentagem de acerto; medir no paper trading antes de qualquer conclusão |
| **Regulatório.** A plataforma de referência declara não ter autorização da CVM. | Alta | Manter o sistema educacional e de simulação; não operar a conta; consultar um advogado antes de qualquer uso comercial |
| **Sem dados OTC.** Backtesting OTC não é possível hoje. | Alta | Coletar velas e resultados no paper trading; não simular histórico |
| **Leitura de imagem.** Capturas cortadas, com zoom ou tema diferente levam a erro de leitura. | Média | Checagem de legibilidade; confirmação de ativo e timeframe; separar visível de inferido |
| **Latência.** A meta de 5 s depende do modelo e da rede do celular. | Média | Uma chamada só; imagem comprimida; medir cada etapa |
| **Vercel Hobby.** Não permite uso comercial. | Média | Pro se houver usuários pagantes |
| **Custo de API fora de controle.** | Baixa | Limite de uso por usuário; teto de gasto no console da Anthropic |
| **Repositório público.** | Baixa | Nenhum segredo no código; `.env` no `.gitignore` |

Não sou advogado nem consultor financeiro; os pontos regulatórios acima são informação para a sua decisão.

## 9. Cronograma

Estimativa em sessões de trabalho como esta. Cada fase termina com teste seu no celular antes da seguinte.

| Fase | Entrega | Sessões (estimativa) |
| --- | --- | --- |
| 01 Auditoria | Este relatório e os documentos de auditoria | concluída |
| 02 Arquitetura | Decisões fechadas, modelo do banco, estrutura de pastas | 1 |
| 03 Design | Telas mobile-first navegáveis | 1–2 |
| 04 Fundação | Projeto Next.js, login, banco, migrações | 2–3 |
| 05 Deploy Vercel | GitHub ligado à Vercel, variáveis, preview e produção | 1 |
| 06 Análise rápida de imagem | Upload, visão, validador, medição de tempos | 3–4 |
| 07 Conector Homebroker | Interface de adaptadores; adaptador de imagem | 1 |
| 08 OTC | Origem, integridade, separação de mercados | 1–2 |
| 09 Indicadores e estratégias | Indicadores em TypeScript com testes | 2–3 |
| 10 Skills adaptadas | Portar risco, vela fechada e alertas | 1 |
| 11 Agentes | Dez agentes sob demanda para análise profunda | 2–3 |
| 12 Motor de sinais | Geração e validação completas | 2 |
| 13 Backtesting e paper trading | Simulação, expirações, estatísticas | 3–4 |
| 14 Administração | Painel, custos, logs | 2–3 |
| 15 Testes e entrega | Testes, correções, documentação | 2–3 |

Total estimado: 25 a 35 sessões. A Fase 06, prioridade número 1 do Master Prompt, fica logo depois da fundação e do deploy.

## 10. Critérios de conclusão da Fase 01

- [x] Repositório das 11 skills acessado e auditado
- [x] Arquivos, dependências e licença examinados
- [x] Decisão por skill registrada
- [x] O que será feito do zero identificado
- [x] Arquitetura Vercel avaliada com limites verificados
- [x] Arquitetura de análise rápida proposta
- [x] Custos, riscos e cronograma apresentados
- [ ] Leitura dos termos de uso da Homebroker (o site recusou a leitura automática)
- [ ] Preço do banco gerenciado conferido

## 11. Perguntas para iniciar a Fase 02

1. **Uso:** o sistema é só para você ou terá outros usuários, pagantes ou não? Isso define Vercel Hobby ou Pro e o tamanho da autenticação.
2. **Código existente:** o repositório `Tradingfloor` (sem hífen) já tem backend, painel, indicadores com testes e um documento de análise por imagens. Devo reaproveitar o que servir de lá ou começar limpo neste repositório?
3. **Capturas reais:** pode enviar de 5 a 10 capturas do gráfico da Homebroker no celular (ativos e timeframes que você usa)? Elas serão o conjunto de teste da Fase 06.
4. **Expirações e payout:** quais expirações você usa (1, 5, 15 minutos) e qual payout a plataforma mostra para esses ativos?
5. **Contas:** você já tem conta na Vercel, na Anthropic (Claude API) e no Supabase?

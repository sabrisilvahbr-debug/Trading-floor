# Passo a passo das contas

Três serviços: Vercel (hospedagem), Supabase (login e banco) e Anthropic (Claude API). Nenhum precisa ser configurado agora; cada um entra na fase indicada. Os nomes dos botões podem mudar um pouco com o tempo.

**Regra para todos:** senha e chave nunca vão para o chat nem para o GitHub. Você cola a chave direto no site do serviço.

## Situação verificada em 14/11/2026

| Serviço | Situação |
| --- | --- |
| GitHub | Conta `sabrisilvahbr-debug`, repositório `Trading-floor` com acesso de escrita |
| Vercel | **Conta existe e está ligada a esta sessão.** Tem os projetos `tradingfloor` e `tradingfloor-57dr`, do outro repositório, e o projeto `trading-floorby`, ligado ao `Trading-floor` e criado em 14/11/2026 às 13:41, ainda sem aplicação |
| Supabase | Não verificado. Não há conexão nesta sessão |
| Anthropic (Claude API) | Não verificado. Ter o Claude no navegador não é o mesmo que ter conta de API |

## 1. Vercel — Fase 05

Você já tem conta. Quando chegarmos à Fase 05:

1. Entre em vercel.com com a conta do GitHub `sabrisilvahbr-debug`.
2. Se o projeto `trading-floorby` já aparecer na sua lista da Vercel, abra-o e pule para o passo 4; não importe o repositório de novo. Caso contrário, clique em **Add New** e depois em **Project**.
3. Na lista de repositórios, escolha **Trading-floor** (com hífen) e clique em **Import**.
   - Se ele não aparecer, clique em **Adjust GitHub App Permissions** e libere o repositório.
4. Antes de publicar, abra **Environment Variables** e adicione as variáveis listadas em `ARCHITECTURE.md`, seção 8.
5. Clique em **Deploy**.

Depois disso, cada envio de código para o GitHub publica uma nova versão sozinho.

**Plano:** o gratuito (Hobby) só permite uso pessoal, sem fins comerciais. Com outros usuários ou cobrança, é preciso o Pro, de US$ 20 por usuário por mês.

**Atenção:** existem dois projetos antigos com nome parecido (`tradingfloor`). Eles pertencem ao outro repositório e não devem ser apagados nem reutilizados. O projeto `trading-floorby` é o que está ligado ao `Trading-floor`. Como o repositório ainda não tem aplicação, o endereço dele deve mostrar erro 404 até a Fase 05. Ainda não foi decidido se ele continua ligado ao GitHub enquanto isso.

## 2. Supabase — Fase 04

1. Entre em supabase.com e clique em **Start your project**.
2. Entre com a conta do GitHub.
3. Clique em **New project**.
4. Preencha:
   - **Name:** `trading-mohamed-floor`
   - **Database Password:** clique em gerar e guarde a senha em um gerenciador de senhas
   - **Region:** South America (São Paulo)
5. Clique em **Create new project** e aguarde alguns minutos.
6. Abra **Project Settings** e depois **API**. Você vai precisar de três valores:
   - **Project URL**
   - chave **anon** (pública)
   - chave **service_role** (secreta: dá acesso total ao banco)
7. Esses três valores serão colados por você nas variáveis de ambiente da Vercel.

**Plano:** o gratuito custa US$ 0 e serve para começar. Segundo as páginas de preço consultadas em novembro de 2026, ele tem 500 MB de banco e **pausa o projeto depois de 7 dias sem uso**. O Pro parte de US$ 25 por mês. Confira em supabase.com/pricing antes de decidir.

## 3. Anthropic (Claude API) — Fase 06

A API é paga por uso e separada da assinatura do Claude.

1. Entre em console.anthropic.com e crie a conta (ou entre, se já tiver).
2. Abra **Billing** e adicione créditos. Um valor pequeno basta para os testes: a estimativa é de menos de US$ 0,02 por análise no modelo intermediário.
3. Em **Limits**, defina um teto de gasto mensal, para não haver surpresa.
4. Abra **API Keys** e clique em **Create Key**. Dê o nome `trading-mohamed-floor`.
5. A chave aparece **uma única vez**. Copie e cole direto na Vercel, na variável `ANTHROPIC_API_KEY`.
6. Não cole a chave no chat. Se colar por engano, apague a chave no console e crie outra.

## O que você precisa me dizer em cada fase

Só que a etapa foi feita. Eu nunca preciso ver senha nem chave: confiro o resultado pelo comportamento da aplicação publicada.

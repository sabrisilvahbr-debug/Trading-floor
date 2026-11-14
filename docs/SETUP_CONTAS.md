# Passo a passo das contas

Três serviços: Vercel (hospedagem), Supabase (login e banco) e Anthropic (Claude API). Nenhum precisa ser configurado agora; cada um entra na fase indicada. Os nomes dos botões podem mudar um pouco com o tempo.

**Regra para todos:** senha e chave nunca vão para o chat nem para o GitHub. Você cola a chave direto no site do serviço.

## Situação verificada em 14/11/2026

| Serviço | Situação |
| --- | --- |
| GitHub | Conta `sabrisilvahbr-debug`, repositório `Trading-floor` com acesso de escrita |
| Vercel | **Conta existe e está ligada a esta sessão.** Tem os projetos `tradingfloor` e `tradingfloor-57dr`, do outro repositório, e o projeto `tradingo-floor`, ligado ao `Trading-floor` e criado em 14/11/2026 por volta das 13:47, ainda sem aplicação. O projeto anterior, `trading-floorby`, foi excluído |
| Supabase | Não verificado. Não há conexão nesta sessão |
| Anthropic (Claude API) | Não verificado. Ter o Claude no navegador não é o mesmo que ter conta de API |

## 1. Vercel — ligar a análise (feito pela Fase 05)

O app já está publicado em https://tradingo-floor.vercel.app, no projeto `tradingo-floor`. Cada envio para o `main` do GitHub publica uma nova versão sozinho. Falta só você cadastrar duas variáveis:

1. Entre em vercel.com, abra o projeto **tradingo-floor**.
2. Vá em **Settings** → **Environment Variables**.
3. Adicione `APP_ACCESS_CODE` com um código que só você saiba (uma frase longa serve). Marque **Production** e **Preview**.
4. Adicione `GEMINI_API_KEY` com a chave criada no passo 3 deste guia. Marque **Production** e **Preview**.
5. Vá em **Deployments**, abra o último, clique nos três pontos e em **Redeploy**. Variáveis novas só valem depois de publicar de novo.
6. No app, abra **Ajustes** e digite o mesmo código de acesso.

`GEMINI_MODEL` é opcional (padrão `gemini-2.5-flash`).

Para notícias da SEC e balanços, adicione também `SEC_USER_AGENT` com seu nome e um e-mail de contato, por exemplo `Maria Silva maria@exemplo.com`. A SEC exige essa identificação; sem ela, essas duas funções ficam desligadas e o resto funciona.

**Plano:** o gratuito (Hobby) só permite uso pessoal, sem fins comerciais. Com outros usuários ou cobrança, é preciso o Pro, de US$ 20 por usuário por mês.

**Atenção:** os projetos `tradingfloor` e `tradingfloor-57dr` pertencem ao outro repositório e não devem ser apagados nem reutilizados. O projeto `tradingo-floor` (com "o" a mais, nome mantido de propósito) é o deste repositório; o anterior, `trading-floorby`, foi excluído.

## 2. Supabase — quando for ligar o login

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
8. Em **SQL Editor**, cole e rode o conteúdo de `supabase/migrations/0001_init.sql`. Ele cria as tabelas com regra de acesso por usuário.

O login no app ainda não está ligado; isso será feito na próxima fase de desenvolvimento.

**Plano:** o gratuito custa US$ 0 e serve para começar. Segundo as páginas de preço consultadas em novembro de 2026, ele tem 500 MB de banco e **pausa o projeto depois de 7 dias sem uso**. O Pro parte de US$ 25 por mês. Confira em supabase.com/pricing antes de decidir.

## 3. Gemini (API do Google) — necessária para a análise

1. Entre em aistudio.google.com com sua conta Google.
2. Clique em **Get API key** e depois em **Create API key**.
3. Copie a chave e cole direto na Vercel, na variável `GEMINI_API_KEY`.
4. Não cole a chave no chat. Se colar por engano, apague a chave no AI Studio e crie outra.

Confira no AI Studio os limites do plano gratuito e o preço do pago antes de usar muito.

A Claude API (console.anthropic.com, variável `ANTHROPIC_API_KEY`) continua possível como alternativa.

## O que você precisa me dizer em cada fase

Só que a etapa foi feita. Eu nunca preciso ver senha nem chave: confiro o resultado pelo comportamento da aplicação publicada.

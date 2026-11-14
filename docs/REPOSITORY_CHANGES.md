# Registro de alterações do repositório

Registra o que entrou neste repositório vindo de terceiros e toda alteração feita em código reaproveitado.

## 14/11/2026 — Instalação das skills de referência

- **Origem:** https://github.com/Jakeschincariol/day-trader-skill, commit `3d0f4ef`, versão 2.0.0, licença MIT.
- **O que entrou:** as 11 pastas `trader-*` em `.claude/skills/`, cada uma com `SKILL.md`, script Python e exemplos.
- **Alterações no código original:** nenhuma. Os arquivos são idênticos ao commit de origem (conferido por hash SHA-256).
- **Licença:** copiada para `.claude/skills/DAY-TRADER-SKILL-LICENSE`.
- **O que não entrou:** a pasta `tests/` do original (depende da estrutura de pastas de lá) e os arquivos de plugin.
- **Arquivos novos do projeto:**
  - `.claude/skills/README.md`: origem e limites das skills.
  - `trader/config.json`: configuração em modo paper, sem opções, margem ou venda a descoberto; campo `sec_user_agent` em branco.
  - `.gitignore`: ignora arquivos gerados em `trader/`, `__pycache__/` e `.env`.

## 14/11/2026 — Fase 01: documentos de auditoria

- `docs/SKILLS_AUDIT.md`, `docs/SKILLS_ADAPTATION.md`, `docs/REPOSITORY_CHANGES.md`, `docs/TECHNICAL_DECISIONS.md`, `docs/FASE_01_RELATORIO.md`.
- Nenhum código de aplicação foi criado nesta fase.

## 14/11/2026 — Fase 02: auditoria do Tradingfloor e arquitetura

- `docs/TRADINGFLOOR_AUDIT.md`, `docs/ARCHITECTURE.md`, `docs/SETUP_CONTAS.md`, `docs/FASE_02_RELATORIO.md`; decisões D14 a D24 em `docs/TECHNICAL_DECISIONS.md`.
- O repositório `Tradingfloor` foi lido e testado em uma cópia separada. O `main` dele não foi alterado.
- Um branch criado por engano, `claude/install-day-trader-skills` (commit `ad618576`), foi publicado no `Tradingfloor`. Ele não está no `main`. A sessão tentou apagá-lo e o proxy recusou a escrita; a remoção precisa ser feita manualmente no GitHub, na aba Branches.
- Os commits das Fases 01 e 02 foram feitos direto no `main` do `Trading-floor`. A partir desta correção, as alterações vão para um branch próprio.
- Nenhum código foi copiado do `Tradingfloor` ainda. A cópia começa na Fase 04 e cada arquivo trazido será listado aqui com o commit de origem (`ca0da80`).

## 14/11/2026 — Fases 03 a 05: aplicação Next.js publicada

- Aplicação em `app/`, `components/`, `lib/`, testes em `tests/`, esquema do banco em `supabase/migrations/`.
- Removido o `index.html` provisório da raiz; a página inicial agora é a do app.
- Relatório: `docs/FASE_03_05_RELATORIO.md`. Decisões D22 a D28 em `TECHNICAL_DECISIONS.md`.

## Situação das skills em relação à aplicação

As skills em `.claude/skills/` são material de referência e ferramentas do assistente de desenvolvimento. A aplicação não importa nenhuma delas. Conforme `SKILLS_AUDIT.md`, nenhuma será usada como está.

## Código portado

| Arquivo novo | Origem | Alterações |
| --- | --- | --- |
| `lib/vision.ts` | `cloudflare/src/vision.ts` do `Tradingfloor`, commit `ca0da80` | Mantidos a validação da entrada e o tratamento de erros. Trocado Gemini por Claude API; removida a conferência com a Binance; acrescentados critérios, sinal sugerido e o validador `decideSignal`; limite de imagem reduzido para 3 MB |

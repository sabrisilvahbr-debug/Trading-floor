# Skills de trading (day-trader-skill v2.0.0)

As 11 pastas `trader-*` vêm de https://github.com/Jakeschincariol/day-trader-skill
(commit `3d0f4ef`, licença MIT em `DAY-TRADER-SKILL-LICENSE`), copiadas sem alteração.

- Só biblioteca padrão do Python (3.8+). Nada para instalar.
- Leem dados públicos de ações dos EUA (Yahoo, SEC, Nasdaq Trader, House Clerk).
  Não cobrem opções binárias, OTC, cripto nem o Homebroker.
- Nenhum script fala com corretora. Não há conector de corretora neste projeto.
- Configuração em `trader/config.json`: `"paper": true`, sem opções, margem ou venda a descoberto.
- São módulos de análise independentes: nenhum outro código do projeto depende delas.

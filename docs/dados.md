# Governança de dados

O painel apresenta dados sobre população, território, PIB, educação, finanças públicas e desenvolvimento humano. Ele menciona IBGE, INEP/MEC, SEFAZ-PI, SEDUC-PI, SEMEC-Teresina, PNUD, Seplan-PI e Tesouro Nacional. Essas menções **não comprovam**, por si só, que cada valor esteja correto ou tenha sido auditado. Os dados e gráficos atuais estão incorporados ao `index.html`; não há rotina de coleta automática no repositório.

## Checklist por indicador

Antes de usar ou atualizar um número, registre e revise:

- Nome, definição e abrangência geográfica (estado ou município).
- Valor, unidade, período de referência e situação: observado, estimado ou projetado.
- Instituição responsável e link para a tabela, relatório ou conjunto de dados específico, não apenas a página inicial.
- Data de publicação e data de consulta; versão da fonte quando disponível.
- Método de cálculo ou transformação, inclusive arredondamentos e comparações.
- Responsável pela conferência e eventuais ressalvas ou diferenças entre fontes.

Separe claramente indicadores estaduais e municipais, assim como séries com anos, metodologias ou unidades diferentes. Não confunda o ano de publicação com o ano de referência. Caso não seja possível confirmar um valor, marque-o como pendente e não o apresente como auditado.

## Processo sugerido

1. Fazer um inventário dos valores e gráficos existentes, incluindo textos interpretativos.
2. Localizar fontes primárias específicas e conferir cada número e série.
3. Registrar divergências e decidir correções com quem mantém o projeto.
4. Atualizar conteúdo, períodos e ressalvas na interface em mudança revisada separadamente.
5. Definir uma periodicidade de revisão compatível com cada fonte; não prometer atualização em tempo real sem uma integração real.

Este documento é um guia de verificação, não um atestado da precisão do conteúdo atual. Nenhuma fonte ou indicador foi auditado nesta etapa.

## Curadoria de notícias

A seleção inicial de `assets/news.js` reúne 50 publicações com links, títulos resumidos, datas, fontes e categorias, consultadas em 30/10/2026. É estática: não existe ingestão automática. A interface usa uma janela móvel de 12 meses na abertura; entradas antigas saem da exibição, portanto a manutenção precisa acrescentar novas publicações para manter 50 itens. Ao atualizar, verifique cada URL, data, conteúdo, relação com o Piauí e evite duplicatas. A seleção pode conter comunicados oficiais além de reportagens; uma fonte pode alterar ou remover páginas após a consulta.

A aba SPIA é ilustrativa e não fornece dados de câmeras. As notas nos gráficos explicam unidades e limitações conhecidas; os links de referência não são prova de cada valor já incorporado ao projeto.

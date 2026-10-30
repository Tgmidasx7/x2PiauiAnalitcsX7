# Relatório de entendimento do projeto

**Projeto:** Piauí Teresina Analytics

**Data da análise:** 30 de outubro de 2026

**Escopo:** análise histórica da versão inicial, anterior à expansão da interface. Para o estado técnico atual, consulte [arquitetura.md](arquitetura.md) e o [README](../README.md). Leitura dos arquivos do repositório e da configuração de publicação consultada no GitHub. Este relatório descreve o estado observado, não é auditoria dos dados, avaliação completa de segurança ou teste visual em navegadores.

## 1. Resumo executivo

O projeto é um painel estático em português sobre Piauí e Teresina. Sua proposta é apresentar um dossiê visual com indicadores e análises sobre o território, a população, a economia, a educação e o desenvolvimento humano. A página também inclui análises geopolíticas e uma matriz SWOT.

Hoje, a aplicação está concentrada em um único `index.html`. A navegação e os gráficos são executados no navegador, sem servidor de aplicação nem banco de dados no repositório. O site está configurado no GitHub Pages para publicar gratuitamente a raiz da branch `main`.

A principal questão para uso público confiável é a **governança dos dados**: valores e narrativas estão inseridos no código, sem referências específicas por indicador que permitam verificar sua origem e metodologia. A interface afirma que os dados são auditados e atualizados em tempo real, mas a implementação observada não comprova essas afirmações. A prioridade é revisar esses textos e validar os indicadores antes de tratar o painel como fonte oficial.

## 2. Objetivo e público provável

A partir do conteúdo e da organização da página, o objetivo aparente é sintetizar dados e tendências do estado e da capital em um painel de consulta. O público provável inclui cidadãos, estudantes, pesquisadores, profissionais de gestão e pessoas interessadas em desenvolvimento regional. O repositório não documenta requisitos formais, público-alvo validado ou casos de uso definidos pelo responsável; estas são interpretações da implementação.

O painel pode apoiar a exploração inicial dos temas, mas não deve substituir consulta às fontes primárias sem uma verificação individual dos números e suas condições de comparação.

## 3. Mapa funcional

| Aba | Conteúdo observado | Componentes visuais principais |
| --- | --- | --- |
| Visão Geral | Resumo de indicadores do estado e da capital | Cartões e gráficos de composição do PIB e evolução do IDH |
| Geográfica | Localização, dimensões, relevo, clima, hidrografia, vegetação e Teresina | Cartões e gráfico de relevo |
| Demográfica | Dados do Piauí e de Teresina, população e concentração | Cartões e gráficos populacionais |
| Geopolítica | Papel nacional, infraestrutura, geopolítica interna e desafios | Cartões e textos |
| Econômica | PIB, finanças públicas, dívida, LRF e investimentos | Cartões e gráficos de finanças e PIB |
| Educacional | Indicadores educacionais, ações estaduais e municipais | Cartões e gráficos comparativos e de posição nacional |
| Desenvolvimento Humano | Série de IDH, componentes e desigualdades | Cartões e gráfico de IDH |
| SWOT | Forças, fraquezas, oportunidades, ameaças e conclusão | Quatro quadrantes e texto |
| Terminal | Mensagens visuais, resumo e instituições citadas | Terminal animado e cartões |

O código inicializa dez gráficos Chart.js, incluindo repetições de PIB e IDH em diferentes abas. Os dados dos gráficos e os textos dos cartões estão embutidos no arquivo; não há, no código analisado, busca periódica das fontes.

## 4. Arquitetura e fluxo de funcionamento

1. O navegador recebe `index.html`, com estilos e scripts embutidos. Chart.js é solicitado ao jsDelivr e as fontes ao Google Fonts.
2. Uma tela inicial exibe animação em canvas, mensagens pré-definidas e progresso visual. Após cerca de 6,2 segundos, a página principal é exibida.
3. O JavaScript inicializa os gráficos e, em seguida, começa as atualizações visuais do relógio e do terminal. Os botões alteram a aba ativa sem troca de página.
4. O relógio é formatado no fuso `America/Fortaleza`. As mensagens periódicas do terminal são textos locais; os hashes são gerados com números aleatórios.

O CSS inclui regras responsivas para larguras de até 768 e 480 pixels. Isso indica intenção de adaptação, mas não substitui testes em dispositivos reais. A página depende de JavaScript para a experiência atual. Se Chart.js não carregar, `initCharts()` pode falhar e impedir também a chamada posterior que inicia relógio e mensagens periódicas; a experiência sob falha precisa ser melhorada e testada.

Não foram identificados no repositório backend, autenticação, banco de dados, coleta por API, processo de compilação ou configurações de análise de tráfego. Ausência no repositório não permite concluir se existem sistemas externos independentes.

## 5. Dados e rastreabilidade

A interface cita instituições como IBGE, INEP/MEC, SEFAZ-PI, SEDUC-PI, SEMEC-Teresina, PNUD, Seplan-PI e Tesouro Nacional. Essas citações são pontos de partida para pesquisa, não comprovação da origem de cada valor. O painel menciona informações de vários anos e estimativas; é necessário preservar a distinção entre período de referência, publicação e consulta.

**Pontos concretos a investigar:**

- Associar cada cartão, série e afirmação a uma tabela ou publicação específica, incluindo unidade, abrangência territorial, ano, método e data de consulta.
- Rever os rótulos educacionais: a página usa IDEB, IDEF e IDEM em diferentes trechos; identificar o indicador e a abrangência efetivos antes de padronizá-los.
- Verificar a comparabilidade da série de IDH e do ponto municipal IDHM de Teresina no mesmo gráfico, incluindo metodologia e períodos.
- Rever o gráfico de finanças: apresenta receitas e despesas de naturezas e anos diferentes; é preciso confirmar definições e evitar interpretação como série diretamente comparável sem ressalvas.
- Revisar a conclusão SWOT e outras afirmações interpretativas junto às evidências que as sustentam.

Esses itens são **questões de revisão**, não uma afirmação de que os valores estejam corretos ou incorretos. Não houve conferência externa indicador por indicador. O procedimento sugerido está em [dados.md](dados.md).

## 6. Publicação e operação

Na consulta feita durante esta análise, o GitHub Pages estava habilitado para a raiz da branch `main`, com HTTPS e último build registrado como concluído. A URL configurada é <https://tgmidasx7.github.io/APP-PIAUI-THE/>. Essa verificação é um retrato do momento, não garantia de disponibilidade contínua.

A publicação usa o mecanismo existente do GitHub Pages. O workflow `.github/workflows/checks.yml` é destinado a testes e **não** faz deploy. Alterações em branches de trabalho só chegam ao site quando integradas à `main` e publicadas. O projeto depende das condições e limites do GitHub Pages e dos serviços externos; não há garantia de funcionamento offline ou disponibilidade permanente.

## 7. Qualidade e riscos

| Tema | Situação observada | Risco ou necessidade |
| --- | --- | --- |
| Dados | Valores e textos locais; fontes citadas genericamente | Falta de rastreabilidade e possível desatualização |
| Comunicação | Interface menciona tempo real, auditoria e verificação de hash | Confusão sobre a origem e a confiabilidade do conteúdo |
| Manutenção | Página, estilos, dados e lógica em um arquivo grande | Mudanças mais difíceis de revisar e testar isoladamente |
| Dependências | Chart.js e fontes de serviços externos | Falha de rede ou CDN pode afetar a experiência |
| Inicialização | Animação com espera fixa antes do conteúdo principal | Acesso mais lento; necessidade de avaliar opção de pular e movimento reduzido |
| Acessibilidade | Há regras responsivas, mas não há comprovação de avaliação específica | Testar teclado, foco, contraste, leitores de tela e alternativas para gráficos |
| Testes | Verificações estruturais e sintaxe JavaScript em `tests/` | Ainda não cobrem dados, renderização, interação ou acessibilidade |
| Licença | Nenhum arquivo de licença identificado | Condições de reutilização não estão explicitadas |

## 8. Recomendações priorizadas

1. **Confiança:** inventariar e validar os indicadores nas fontes primárias; sinalizar o que não puder ser comprovado e corrigir as promessas de tempo real e auditoria.
2. **Experiência:** testar a interface em celular e computador, revisar acessibilidade e oferecer uma experiência adequada quando bibliotecas externas falharem.
3. **Manutenibilidade:** separar gradualmente dados, estilos e scripts, com revisão em pequenas etapas e testes para não alterar inadvertidamente a apresentação.
4. **Operação:** manter o fluxo de publicação documentado, acompanhar o resultado do Pages e definir responsáveis e periodicidade de atualização.
5. **Governança:** definir licença, processo de revisão e uma metodologia clara para dados e análises.

O [roteiro de evolução](roteiro.md) detalha esses próximos passos. Nenhuma dessas recomendações significa que os dados ou a interface já foram corrigidos.

## 9. Evidências consultadas

- [`index.html`](../index.html): marcação, abas, textos, estilos responsivos, dados, animações e gráficos.
- [`tests/test_site.py`](../tests/test_site.py): testes estruturais e verificação de sintaxe.
- [`.github/workflows/checks.yml`](../.github/workflows/checks.yml): execução das verificações no GitHub Actions.
- Configuração e histórico de build do GitHub Pages do repositório, consultados pela API do GitHub na data da análise.

Este relatório não altera o `index.html` e não garante exatidão, atualidade ou auditoria dos dados exibidos.

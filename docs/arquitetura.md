# Arquitetura e limitações

## Estado atual

O projeto é um site estático, sem backend, banco de dados, processo de build ou integração de indicadores identificados no repositório. `index.html` reúne a marcação, os dados, os gráficos e parte dos estilos e scripts. `assets/enhancements.css` e `assets/dashboard.js` complementam a interface e suas interações.

O navegador controla as abas, a busca em indicadores e detalhes, os favoritos locais, a exportação CSV e a impressão. Chart.js está incluído localmente; as fontes são carregadas do Google Fonts com alternativas locais. Se o arquivo local do Chart.js estiver indisponível, tabelas com os valores das configurações dos gráficos ficam acessíveis; o relógio continua funcionando. O relógio usa o fuso `America/Fortaleza` e o terminal tenta consultar feeds de notícias a cada cinco minutos por meio de RSS2JSON, com alternativa local estática. O SPIA mostra vídeos públicos do YouTube e simulação textual sem análise real. O painel não comprova atualização automática ou auditoria dos números.

## Evolução recomendada

1. Validar os indicadores com fonte específica, período e metodologia.
2. Centralizar os dados em uma estrutura documentada e separar gradualmente a lógica restante.
3. Adicionar testes em navegadores reais e uma revisão completa de acessibilidade e responsividade.
4. Avaliar uma estratégia para indisponibilidade das fontes externas e acompanhar condições de uso de serviços.

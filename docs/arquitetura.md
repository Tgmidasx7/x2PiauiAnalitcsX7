# Arquitetura e limitações

## Estado atual

O projeto é um site estático, sem backend, banco de dados ou integração automática de indicadores oficiais no repositório. `index.html` reúne a marcação principal, 14 abas temáticas, 12 gráficos e a paleta de comandos. Os módulos em `assets/` (`enhancements.css`, `dashboard.js`, `territories.js`, `news.js`, `cameras.js`, `eye-of-god.css`, `eye-of-god.js` e `icon.svg`) complementam a interface, os dados territoriais, a simulação e as interações, além de `404.html` e `manifest.webmanifest`.

O navegador controla as abas, a busca (`/`), a paleta global (`Ctrl+K`), o cartograma esquemático dos 12 Territórios de Desenvolvimento, o comparador municipal, o simulador pedagógico de cenários, a matriz de rastreabilidade de fontes, o modo de alto contraste, os favoritos locais, as exportações CSV/JSON e a impressão. Chart.js está incluído localmente; as fontes são carregadas do Google Fonts com alternativas locais. Se o arquivo local do Chart.js estiver indisponível, tabelas com os valores das configurações dos gráficos ficam acessíveis; o relógio continua funcionando. O relógio usa o fuso `America/Fortaleza` e o terminal tenta consultar feeds de notícias a cada cinco minutos por meio de RSS2JSON, com alternativa local estática. O SPIA e o Eye of God são módulos demonstrativos sem análise real ou conexão com câmeras oficiais. O painel não comprova atualização automática ou auditoria dos números.

## Evolução recomendada

1. Validar os indicadores com fonte específica, período e metodologia.
2. Centralizar os dados em uma estrutura documentada e separar gradualmente a lógica restante.
3. Adicionar testes em navegadores reais e uma revisão completa de acessibilidade e responsividade.
4. Avaliar uma estratégia para indisponibilidade das fontes externas e acompanhar condições de uso de serviços.

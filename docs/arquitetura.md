# Arquitetura e limitações

## Estado atual

O projeto é uma aplicação web estática de execução local no navegador (sem backend próprio ou chaves de API privadas). `index.html` reúne a marcação principal, **15 abas temáticas**, 12 gráficos em Chart.js, o Co-Piloto flutuante (`Alt+U`) e a paleta global de comandos (`Ctrl+K`). Os módulos em `assets/` (`enhancements.css`, `dashboard.js`, `territories.js`, `news.js`, `cameras.js`, `eye-of-god.css`, `eye-of-god.js`, `ultron.css`, `ultron.js` e `icon.svg`) estruturam os dados territoriais (com códigos oficiais IBGE de 7 dígitos e coordenadas geográficas reais nos 20 polos), as simulações e a inteligência analítica local, complementados pelas rotas autônomas `ultron/index.html` e `eyeofgod/index.html`, `404.html`, `manifest.webmanifest` e o Service Worker offline `sw.js`.

O módulo **ULTRON // X7-OMEGA v2.0** (`assets/ultron.js`) orquestra 6 sub-agentes determinísticos em JavaScript puro (Macro-Fiscal, Geo-Territorial/TOPSIS, Transição Verde, Capital Humano, OSINT Notícias e Ultron-Prime), calculadora geodésica Haversine combinada ao algoritmo **Dijkstra de menor rota rodoviária multi-saltos** (`BR-343`, `BR-316`, `BR-135`, `BR-230`, `BR-020`, `BR-407`, `PI-140`, `PI-247`) em mapa vetorial projetado em Canvas, motor estocástico Monte Carlo reprodutível (Mulberry32 + Box-Muller, 250 a 1.000 trajetórias para 2025–2035 com bandas P10/P50/P90), **Otimizador Multi-Objetivo de Alocação de Investimentos (Fronteira de Pareto + Gráfico Radar Pentagonal 5D)**, exportação executiva em Markdown (`.md`), JSON (`.json`) e Snapshot visual (`.png`), além do conector sob demanda à API pública oficial do IBGE (`servicodados.ibge.gov.br` — 224 municípios da UF 22 + população Censo 2022 no agregado SIDRA `4714` + PIB Municipal no agregado `5938` + cálculo do índice de Gini municipal) com fallback offline automático.

O SPIA e o Eye of God permanecem módulos demonstrativos sem análise real de imagens ou conexão com câmeras oficiais, e as bandas estocásticas do Monte Carlo constituem simulações matemáticas exploratórias — não projeções oficiais.

## Evolução recomendada

1. Validar individualmente cada indicador estático remanescente com tabela primária, período e metodologia.
2. Expandir gradualmente o conector SIDRA/IBGE para outras variáveis municipais oficiais (PIB municipal e área territorial das 224 cidades).
3. Adicionar testes automatizados ponta a ponta em navegadores reais (Playwright) além da suíte atual em Python + Node/JSDOM.

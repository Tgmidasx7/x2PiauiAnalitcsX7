# Roteiro de evolução

Este roteiro distingue itens entregues dos próximos passos. Os itens marcados são melhorias implementadas, não uma auditoria dos dados.

## Prioridade 1 — confiança

- [ ] Inventariar todos os indicadores e textos da página e verificar cada um em fonte primária específica, com período e metodologia.
- [ ] Corrigir ou retirar números sem comprovação e rotular estimativas e projeções.
- [x] Substituir afirmações de dados em tempo real e auditoria por avisos de conteúdo estático e não verificado.
- [x] Identificar claramente o ano de referência de cada gráfico e a data da última revisão documental (`13/11/2026`).

## Prioridade 2 — experiência e qualidade

- [x] Revisar hierarquia visual, textos, legibilidade, comportamento em dispositivos móveis, folha de impressão (`@media print`) e tempo de carregamento imediato.
- [x] Avaliar navegação por teclado, foco visível, semântica das abas, modo de alto contraste e alternativas textuais em tabela para todos os gráficos.
- [x] Separar módulos complementares (`dashboard.js`, `territories.js`, `news.js`, `cameras.js`, `eye-of-god.js`, `ultron.js`) e introduzir suíte automatizada de testes estruturais e de interface.
- [x] Oferecer tabelas quando a biblioteca de gráficos não estiver disponível.
- [x] Implementar Service Worker offline (`sw.js`), comparador geodésico Haversine + menor rota rodoviária Dijkstra, otimizador multi-objetivo Pareto (radar 5D), simulação estocástica Monte Carlo com tabela acessível e conector opcional à API pública oficial do IBGE (224 municípios + Censo 2022 + PIB Municipal SIDRA) no módulo Ultron-X7 v2.0.
- [ ] Avaliar tratamento adicional para falhas de carregamento de fontes externas.

## Prioridade 3 — manutenção e publicação

- [ ] Estabelecer responsáveis, calendário de revisão e política para correções de dados.
- [ ] Registrar uma licença escolhida pelo responsável pelo projeto.
- [ ] Verificar periodicamente o GitHub Pages e suas condições de uso; planejar contingência antes de depender dele para um serviço crítico.
- [ ] Avaliar somente quando necessário integrações reais de dados, seus limites, custos e necessidades de proteção de credenciais.

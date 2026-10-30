# Arquitetura e limitações

## Estado atual

O projeto é uma página estática (`index.html`) que reúne marcação, estilos, indicadores e JavaScript no mesmo arquivo. O navegador renderiza as abas e os gráficos; Chart.js e fontes são carregados de serviços externos. Não há backend, banco de dados, processo de build ou integração de dados identificados no repositório.

O relógio usa a hora do navegador com o fuso `America/Fortaleza`. Já as mensagens periódicas do terminal são pré-definidas e os hashes exibidos são gerados aleatoriamente: eles não comprovam atualização, integridade ou auditoria dos dados. A animação inicial também é visual, não representa o carregamento efetivo de bases oficiais.

## Melhorias recomendadas para uma próxima etapa

1. Corrigir na interface as afirmações de atualização em tempo real e auditoria, após validação do conteúdo.
2. Separar conteúdo, estilos e scripts gradualmente, preservando a aparência e testando cada alteração.
3. Centralizar indicadores em uma estrutura documentada, com fonte específica e período para cada valor.
4. Adicionar testes de navegador, acessibilidade e responsividade, além das verificações estruturais atuais.
5. Avaliar uma estratégia de contingência para os recursos externos e acompanhar custos e limites antes de adicionar serviços.

Essas melhorias da interface não foram aplicadas nesta etapa para preservar o `index.html` existente.

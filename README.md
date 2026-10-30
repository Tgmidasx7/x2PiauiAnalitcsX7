# Piauí Teresina Analytics

Painel web que reúne indicadores e análises sobre o estado do Piauí e sua capital, Teresina. A proposta é facilitar a consulta de informações territoriais, sociais e econômicas em uma interface visual com gráficos e seções temáticas.

**Site público:** [tgmidasx7.github.io/APP-PIAUI-THE/](https://tgmidasx7.github.io/APP-PIAUI-THE/)

**Relatório de entendimento:** [docs/relatorio-entendimento.md](docs/relatorio-entendimento.md)

> **Importante:** o painel contém números inseridos manualmente no código. Não foi identificada coleta automática das fontes nem documentação que comprove auditoria dos indicadores. As menções a “tempo real”, “dados auditados” e “hash verificado” na interface não devem ser tomadas como comprovação. Consulte e valide as fontes antes de usar os dados em decisões ou publicações.

## O que o painel apresenta

| Seção | Conteúdo exibido |
| --- | --- |
| Visão Geral | Indicadores resumidos e gráficos de PIB e IDH |
| Geográfica | Território, relevo, clima, hidrografia e recursos |
| Demográfica | População estadual e municipal, estimativas e concentração |
| Geopolítica | Papel regional, infraestrutura, desafios e oportunidades |
| Econômica | PIB, finanças públicas, dívida e investimentos |
| Educacional | Indicadores educacionais estaduais e municipais |
| Desenvolvimento Humano | IDH, componentes e desigualdades |
| SWOT | Forças, fraquezas, oportunidades e ameaças |
| Terminal | Mensagens visuais, resumo executivo e instituições citadas |

Os temas e indicadores acima descrevem o que a interface **apresenta**, não uma validação de sua precisão. O painel se apresenta como um dossiê de 2025 e reúne referências a diferentes anos; não se deve presumir que os valores estejam atualizados.

## Como funciona

A aplicação é um site estático: o navegador abre `index.html`, que contém a estrutura, os estilos, os dados e o JavaScript. As abas são controladas no navegador e os gráficos são desenhados com [Chart.js 4.4.7](https://www.chartjs.org/), carregado por CDN. As fontes visuais são carregadas do Google Fonts. Não há backend, banco de dados ou integração com APIs de indicadores no código atual.

A abertura inclui uma animação de aproximadamente 6,2 segundos. O relógio usa o fuso `America/Fortaleza`, enquanto as mensagens do terminal são predefinidas e os hashes são gerados aleatoriamente. Eles não indicam conexão com fontes oficiais ou integridade dos dados.

## Executar localmente

**Requisito:** navegador moderno; Python 3 é opcional para executar um servidor local. Para carregar Chart.js e as fontes externas, é necessária conexão com esses serviços.

Na raiz do projeto, execute:

```bash
python3 -m http.server 8000
```

Acesse <http://localhost:8000/>. Para encerrar o servidor, use `Ctrl+C`. Também é possível abrir `index.html` diretamente no navegador. Se a CDN do Chart.js estiver indisponível, os gráficos não serão renderizados; o funcionamento do relógio também pode ser afetado pela ordem de inicialização atual.

## Testes e verificação

Com Python 3 e Node.js instalados, execute:

```bash
python3 -m unittest discover -s tests -v
```

Os testes usam a biblioteca padrão do Python e o Node.js para verificar a sintaxe do JavaScript embutido. Eles conferem a estrutura básica do documento, IDs duplicados, correspondência de abas e alvos dos gráficos. O GitHub Actions executa essas verificações em pushes e pull requests.

Esses testes **não** verificam a veracidade dos dados, a renderização em navegadores, a acessibilidade nem a disponibilidade de serviços externos. Mudanças visuais ou de conteúdo devem receber revisão manual adicional.

## Hospedagem e atualização

O repositório está configurado para publicar gratuitamente a raiz da branch `main` no GitHub Pages. Mudanças em uma branch de trabalho não aparecem no endereço público até serem integradas à `main` e a publicação terminar. O serviço está sujeito às condições e limites do GitHub; disponibilidade permanente não é garantida.

Veja [publicação e manutenção](docs/publicacao.md) para o fluxo de atualização e diagnóstico.

## Estrutura do repositório

```text
index.html                      Página atual: HTML, CSS, dados e JavaScript
README.md                       Visão geral e instruções de uso
CONTRIBUTING.md                 Orientações de contribuição
docs/relatorio-entendimento.md  Análise do funcionamento e do estado do projeto
docs/arquitetura.md             Arquitetura e limitações
docs/dados.md                   Orientações para verificar indicadores
docs/publicacao.md              GitHub Pages e manutenção
docs/roteiro.md                 Prioridades para evolução
tests/test_site.py              Testes estruturais e de sintaxe
.github/workflows/checks.yml    Verificações no GitHub Actions
```

## Como contribuir

Leia [CONTRIBUTING.md](CONTRIBUTING.md), faça alterações focadas, execute os testes e revise a aplicação no navegador. Para alterar um indicador, registre a fonte primária específica, o período, a unidade, a data de consulta e eventuais cálculos, conforme [governança de dados](docs/dados.md).

O repositório não especifica uma licença de uso. Consulte o responsável antes de reutilizar ou redistribuir o projeto.

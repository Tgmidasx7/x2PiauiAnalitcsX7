# Piauí Teresina Analytics

Painel web que reúne indicadores e análises sobre o estado do Piauí e sua capital, Teresina. A proposta é facilitar a consulta de informações territoriais, sociais e econômicas em uma interface visual com gráficos e seções temáticas.

**Site público:** [tgmidasx7.github.io/APP-PIAUI-THE/](https://tgmidasx7.github.io/APP-PIAUI-THE/)

**Relatório de entendimento:** [docs/relatorio-entendimento.md](docs/relatorio-entendimento.md)

> **Importante:** o painel contém números inseridos manualmente no código. Não foi identificada coleta automática das fontes nem documentação que comprove auditoria dos indicadores. A interface identifica os dados como estáticos e sujeitos a verificação. Consulte e valide as fontes antes de usar os dados em decisões ou publicações.

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
| Terminal | Notícias em rolagem, feeds e arquivo de notícias locais |
| SPIA | Catálogo de 30 vídeos públicos e cenários fictícios para Teresina |
| Fontes & método | Portais institucionais, orientações de leitura e limitações |

Os temas e indicadores acima descrevem o que a interface **apresenta**, não uma validação de sua precisão. O painel se apresenta como um dossiê de 2025 e reúne referências a diferentes anos; não se deve presumir que os valores estejam atualizados.

## Como funciona

A aplicação é um site estático: o navegador abre `index.html`, que contém a estrutura, os dados e parte dos estilos e scripts. Os recursos complementares ficam em `assets/`. As abas são controladas no navegador e os gráficos são desenhados com [Chart.js 4.4.7](https://www.chartjs.org/), incluído localmente no projeto. As fontes visuais são carregadas do Google Fonts. Não há backend, banco de dados ou integração com APIs de indicadores no código atual.

O conteúdo principal aparece imediatamente, sem uma tela de carregamento obrigatória. O relógio usa o fuso `America/Fortaleza`; os indicadores são estáticos e o terminal também tenta consultar feeds de notícias. A busca pesquisa indicadores, detalhes e itens SWOT, e os favoritos são armazenados somente no navegador. O CSV exporta os valores exibidos nos cartões, não uma base oficial. Cada gráfico oferece uma tabela com seus dados, inclusive quando a biblioteca de gráficos não estiver disponível. As abas suportam navegação pelo teclado e links diretos por `#nome-da-aba`.

## Executar localmente

**Requisito:** navegador moderno; Python 3 é opcional para executar um servidor local. O Chart.js está incluído no projeto; as fontes externas são opcionais e usam fontes de reserva quando não houver conexão.

Na raiz do projeto, execute:

```bash
python3 -m http.server 8000
```

Acesse <http://localhost:8000/>. Para encerrar o servidor, use `Ctrl+C`. Também é possível abrir `index.html` diretamente no navegador. Se o arquivo local do Chart.js falhar, os gráficos são substituídos por uma mensagem e os valores continuam disponíveis em tabelas.

## Testes e verificação

Para executar todos os testes, instale Python 3 e Node.js 22 e rode:

```bash
npm ci
npm test
```

Os testes verificam estrutura, sintaxe e interações em um DOM simulado, incluindo navegação, busca, favoritos e a falha do Chart.js. O GitHub Actions executa essas verificações em pushes e pull requests. Para executar apenas os testes estruturais sem instalar pacotes, use `python3 -m unittest discover -s tests -v`.

Os testes **não** verificam a veracidade dos dados, a renderização real em todos os navegadores nem a acessibilidade completa. Mudanças devem receber revisão manual adicional.

## Terminal de notícias e SPIA

O terminal mostra as notícias uma a uma em uma janela com histórico rolável. Ao abrir a aba, tenta consultar os feeds RSS do [g1 Piauí](https://g1.globo.com/rss/g1/pi/piaui/) e do [Governo do Piauí](https://www.pi.gov.br/feed/) por meio do serviço externo RSS2JSON; enquanto a página estiver aberta, repete a tentativa a cada cinco minutos. O serviço e os feeds podem estar fora do ar, impor limites, atrasar ou bloquear acesso. A interface informa o resultado, preserva a última consulta da sessão e usa como alternativa a curadoria estática de 50 links em `assets/news.js`, consultada em 30/10/2026. A seleção respeita uma janela móvel de 12 meses; a quantidade pode diminuir e fontes podem modificar ou retirar notícias. A rotação pode ser pausada e o arquivo filtrado por assunto ou busca.

A aba SPIA é uma **demonstração**, sem acesso a câmeras oficiais de Teresina nem análise real por IA. O mural oferece 30 vídeos públicos do YouTube identificados pelo local verdadeiro; são fontes de terceiros, não necessariamente câmeras de segurança e não necessariamente ao vivo. As miniaturas e vídeos dependem do YouTube e podem estar indisponíveis, gravados, sujeitos a anúncios ou bloqueados para incorporação; cada tela oferece um link ao original. O laboratório de interpretação gera apenas exemplos fictícios, sem examinar vídeos. Ao abrir o mural, o navegador acessa as miniaturas do YouTube; ao abrir um vídeo, acessa o reprodutor do YouTube. Os gráficos incluem limitações e portais de referência, que não substituem a conferência individual dos indicadores existentes.

## Hospedagem e atualização

O repositório está configurado para publicar gratuitamente a raiz da branch `main` no GitHub Pages. Mudanças em uma branch de trabalho não aparecem no endereço público até serem integradas à `main` e a publicação terminar. O serviço está sujeito às condições e limites do GitHub; disponibilidade permanente não é garantida.

Veja [publicação e manutenção](docs/publicacao.md) para o fluxo de atualização e diagnóstico.

## Estrutura do repositório

```text
index.html                      Página principal, dados e gráficos
assets/                         Recursos de interface (CSS e JavaScript)
README.md                       Visão geral e instruções de uso
CONTRIBUTING.md                 Orientações de contribuição
docs/relatorio-entendimento.md  Análise do funcionamento e do estado do projeto
docs/arquitetura.md             Arquitetura e limitações
docs/dados.md                   Orientações para verificar indicadores
docs/publicacao.md              GitHub Pages e manutenção
docs/roteiro.md                 Prioridades para evolução
tests/                          Testes estruturais e de interação
package.json / package-lock.json Dependências usadas apenas nos testes
.github/workflows/checks.yml    Verificações no GitHub Actions
```

## Como contribuir

Leia [CONTRIBUTING.md](CONTRIBUTING.md), faça alterações focadas, execute os testes e revise a aplicação no navegador. Para alterar um indicador, registre a fonte primária específica, o período, a unidade, a data de consulta e eventuais cálculos, conforme [governança de dados](docs/dados.md).

O repositório não especifica uma licença de uso. Consulte o responsável antes de reutilizar ou redistribuir o projeto.

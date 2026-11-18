# x2PiauiAnalitcsX7 — Piauí Teresina Analytics

Análise do Piauí Integral: painel web que reúne indicadores e análises sobre o estado do Piauí e sua capital, Teresina. A proposta é facilitar a consulta de informações territoriais, sociais e econômicas em uma interface visual com 15 abas temáticas, gráficos interativos, terminal de notícias, módulos demonstrativos (`SPIA` e `Eye of God`) e o motor estratégico multi-agente **ULTRON // X7-OMEGA** (geodésia Haversine, simulação estocástica Monte Carlo 2025–2035, Co-Piloto flutuante e conector oficial da API do IBGE).

**Site público (GitHub Pages):** [tgmidasx7.github.io/x2PiauiAnalitcsX7/](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/)  
**Cockpit Autônomo Ultron IA:** [tgmidasx7.github.io/x2PiauiAnalitcsX7/ultron/](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/ultron/)  
**Rota dedicada Eye of God:** [tgmidasx7.github.io/x2PiauiAnalitcsX7/eyeofgod/](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/eyeofgod/)  
**Repositório oficial:** [github.com/Tgmidasx7/x2PiauiAnalitcsX7](https://github.com/Tgmidasx7/x2PiauiAnalitcsX7)  
**Projetos relacionados:** [APP-PIAUI-THE](https://tgmidasx7.github.io/APP-PIAUI-THE/) · [SPIA-PIAUIANALITCS](https://tgmidasx7.github.io/SPIA-PIAUIANALITCS/)

**Relatório de entendimento:** [docs/relatorio-entendimento.md](docs/relatorio-entendimento.md)

> **Importante:** o painel contém números inseridos manualmente no código. Não foi identificada coleta automática das fontes nem documentação que comprove auditoria dos indicadores. A interface identifica os dados como estáticos e sujeitos a verificação. Consulte e valide as fontes antes de usar os dados em decisões ou publicações.

## O que o painel apresenta

| Seção | Conteúdo exibido | Link direto |
| --- | --- | --- |
| Visão Geral | Indicadores resumidos, quadro comparativo multi-escala, atalhos e gráficos de PIB e IDH | [`#overview`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/#overview) |
| Geográfica | Território, relevo, clima, hidrografia e recursos | [`#geo`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/#geo) |
| Demográfica | População estadual e municipal, estimativas e concentração | [`#demo`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/#demo) |
| Municípios & Territórios | Cartograma interativo dos 12 Territórios de Desenvolvimento, diretório de 20 polos e comparador municipal lado a lado | [`#territorios`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/#territorios) |
| Geopolítica | Papel regional, infraestrutura, desafios e oportunidades | [`#geo-pol`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/#geo-pol) |
| Econômica | PIB, finanças públicas, dívida e investimentos | [`#eco`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/#eco) |
| Energia & Simulador | Matriz elétrica renovável, H₂ verde, logística, Piauí Digital e simulador pedagógico de cenários | [`#energia`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/#energia) |
| Educacional | Indicadores educacionais estaduais e municipais | [`#edu`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/#edu) |
| Desenvolvimento Humano | IDH, componentes e desigualdades | [`#idh`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/#idh) |
| SWOT | Forças, fraquezas, oportunidades e ameaças | [`#swot`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/#swot) |
| SPIA | Catálogo de 30 vídeos públicos e cenários fictícios para Teresina | [`#spia`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/#spia) |
| Eye of God | Simulação tática e visual em Canvas: 6 modos de câmera, radar, grafo, captura de HUD, CLI (com ponte `ultron`) e áudio sintetizado | [`#eye-of-god`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/#eye-of-god) · [`/eyeofgod/`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/eyeofgod/) |
| Ultron IA | Orquestrador multi-agente determinístico (6 sub-agentes), malha geodésica Haversine + menor rota rodoviária **Dijkstra**, simulação Monte Carlo (500 trajetórias, 2025–2035), otimizador multi-objetivo **Pareto Capex** (radar 5D), auditoria opcional na API oficial do IBGE (224 municípios + Censo 2022 + PIB Municipal SIDRA + Gini) e exportação `.md` / `.json` / `.png` | [`#ultron`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/#ultron) · [`/ultron/`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/ultron/) |
| Terminal | Notícias em rolagem, feeds e arquivo de notícias locais (atualizado em 13/11/2026) | [`#terminal`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/#terminal) |
| Fontes & método | 8 portais institucionais, matriz filtrável de rastreabilidade de indicadores e limitações | [`#fontes`](https://tgmidasx7.github.io/x2PiauiAnalitcsX7/#fontes) |

Os temas e indicadores acima descrevem o que a interface **apresenta**, não uma validação de sua precisão. O painel se apresenta como um dossiê de 2025 e reúne referências a diferentes anos; não se deve presumir que os valores estáticos estejam atualizados, exceto quando sincronizada sob demanda a malha oficial pública do IBGE no módulo Ultron.

## Como funciona

A aplicação é um site estático executado integralmente no navegador: `index.html` contém a estrutura principal e parte dos estilos e scripts, enquanto `assets/` concentra os módulos JavaScript, CSS, bases territoriais e o motor **Ultron-X7**. As abas são controladas no cliente e os gráficos são desenhados com [Chart.js 4.4.7](https://www.chartjs.org/), incluído localmente no projeto, além de visualizações vetoriais e estocásticas em HTML5 Canvas. Um Service Worker (`sw.js`) provê cache offline para os recursos principais quando servido em HTTPS ou `localhost`.

O conteúdo principal aparece imediatamente, sem tela de carregamento obrigatória. O relógio usa o fuso `America/Fortaleza`. A busca (`/`), a paleta global de comandos (`Ctrl+K` / `⌘K`), o Co-Piloto flutuante Ultron (`Alt+U`), o modo de alto contraste e os favoritos funcionam localmente no navegador. As exportações em CSV, JSON e Dossiê Executivo Markdown (`.md`) reúnem os valores e simulações exibidos no painel. Cada um dos 12 gráficos do Chart.js e o simulador Monte Carlo oferecem tabelas acessíveis com seus dados. As 15 abas suportam navegação pelo teclado e links diretos por `#nome-da-aba`.

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

O terminal mostra as notícias uma a uma em uma janela com histórico rolável. Ao abrir a aba, tenta consultar os feeds RSS do [g1 Piauí](https://g1.globo.com/rss/g1/pi/piaui/) e do [Governo do Piauí](https://www.pi.gov.br/feed/) por meio do serviço externo RSS2JSON; enquanto a página estiver aberta, repete a tentativa a cada cinco minutos. O serviço e os feeds podem estar fora do ar, impor limites, atrasar ou bloquear acesso. A interface informa o resultado, preserva a última consulta da sessão e usa como alternativa a curadoria estática de 50 links em `assets/news.js`, atualizada em 13/11/2026. A seleção respeita uma janela móvel de 12 meses; a quantidade pode diminuir e fontes podem modificar ou retirar notícias. A rotação pode ser pausada e o arquivo filtrado por assunto ou busca.

A aba SPIA é uma **demonstração**, sem acesso a câmeras oficiais de Teresina nem análise real por IA. O mural oferece 30 vídeos públicos do YouTube identificados pelo local verdadeiro; são fontes de terceiros, não necessariamente câmeras de segurança e não necessariamente ao vivo. As miniaturas e vídeos dependem do YouTube e podem estar indisponíveis, gravados, sujeitos a anúncios ou bloqueados para incorporação; cada tela oferece um link ao original. O laboratório de interpretação gera apenas exemplos fictícios, sem examinar vídeos. Ao abrir o mural, o navegador acessa as miniaturas do YouTube; ao abrir um vídeo, acessa o reprodutor do YouTube. Os gráficos incluem limitações e portais de referência, que não substituem a conferência individual dos indicadores existentes.

## Hospedagem e atualização

O repositório está pronto para publicar gratuitamente a raiz da branch `main` no GitHub Pages (**Settings → Pages**). Mudanças em uma branch de trabalho não aparecem no endereço público até serem integradas à `main` e a publicação terminar. O serviço está sujeito às condições e limites do GitHub; disponibilidade permanente não é garantida.

Veja [publicação e manutenção](docs/publicacao.md) para o fluxo de atualização e diagnóstico.

## Estrutura do repositório

```text
index.html                      Página principal (15 abas), gráficos, Co-Piloto Ultron e paleta Ctrl+K
ultron/index.html               Rota dedicada em tela cheia para o Agente Autônomo Ultron-X7
eyeofgod/index.html             Rota dedicada para a simulação tática Eye of God
404.html                        Página de retorno personalizada para rotas inexistentes
manifest.webmanifest            Metadados e atalhos de instalação Web App (PWA)
sw.js                           Service Worker offline-first para cache local de recursos
assets/                         CSS, JavaScript (dashboard, ultron, eye-of-god), bases territoriais, notícias e Chart.js
README.md                       Visão geral e instruções de uso
CONTRIBUTING.md                 Orientações de contribuição
docs/relatorio-entendimento.md  Análise do funcionamento e do estado do projeto
docs/arquitetura.md             Arquitetura e limitações
docs/dados.md                   Orientações para verificar indicadores
docs/publicacao.md              GitHub Pages e manutenção
docs/roteiro.md                 Prioridades para evolução
tests/                          Testes estruturais (Python) e de interação (Node.js/JSDOM)
package.json / package-lock.json Dependências usadas apenas nos testes
.github/workflows/checks.yml    Verificações automatizadas no GitHub Actions
.github/workflows/pages.yml     Workflow opcional de publicação no GitHub Pages
```

## Como contribuir

Leia [CONTRIBUTING.md](CONTRIBUTING.md), faça alterações focadas, execute os testes e revise a aplicação no navegador. Para alterar um indicador, registre a fonte primária específica, o período, a unidade, a data de consulta e eventuais cálculos, conforme [governança de dados](docs/dados.md).

O repositório não especifica uma licença de uso. Consulte o responsável antes de reutilizar ou redistribuir o projeto.

# Publicação e manutenção

## GitHub Pages

O repositório está configurado no GitHub Pages para publicar a raiz (`/`) da branch `main` em:

<https://tgmidasx7.github.io/APP-PIAUI-THE/>

O Pages hospeda arquivos estáticos sem custo no contexto atual do repositório público, sujeito às [condições e limites do GitHub Pages](https://docs.github.com/pt/pages/getting-started-with-github-pages/github-pages-limits). Serviços externos usados pela página têm suas próprias condições. A disponibilidade permanente não é garantida.

## Fluxo de atualização

1. Faça as alterações em uma branch de trabalho e execute os testes do README.
2. Revise as mudanças e integre-as à `main` por pull request conforme o fluxo da equipe.
3. Confira em **Settings → Pages** e na área de Actions se a publicação terminou; depois visite a URL pública e valide a página.

Uma alteração que existe apenas em uma branch de trabalho **não** atualiza o site público. O workflow de verificação deste projeto não publica o site nem muda a configuração do Pages.

## Se o site não atualizar

- Confira se a alteração foi integrada à `main` e se **Settings → Pages** continua apontando para a raiz dessa branch.
- Consulte o estado da publicação e os logs no GitHub; aguarde a conclusão da atualização.
- Recarregue sem cache e verifique a disponibilidade da CDN do Chart.js e das fontes caso gráficos ou fontes não apareçam.
- Se houver falha persistente, consulte a documentação e o status do GitHub. Não armazene credenciais no repositório.

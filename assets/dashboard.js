/* Funcionalidades locais do painel. Nenhuma consulta de indicadores é feita à rede. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const clean = text => text.replace(/\s+/g, ' ').trim();
  const storageKey = 'pi-analytics-favorites-v1';
  let favorites = new Set();
  let cards = [];
  let searchEntries = [];
  let tabs = [];
  let initialized = false;

  function readFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(stored)) favorites = new Set(stored.filter(item => typeof item === 'string'));
    } catch (_) { favorites = new Set(); }
  }

  function writeFavorites() {
    try { localStorage.setItem(storageKey, JSON.stringify([...favorites])); return true; }
    catch (_) { return false; }
  }

  function selectTab(name, focus = false, updateUrl = true) {
    const button = tabs.find(tab => tab.dataset.tab === name);
    if (!button) return false;
    tabs.forEach(tab => {
      const active = tab === button;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById('tab-' + tab.dataset.tab).classList.toggle('active', active);
    });
    if (focus) button.focus();
    if (updateUrl) {
      try { history.replaceState(null, '', '#' + name); } catch (_) { /* file:// or restricted browser */ }
    }
    requestAnimationFrame(() => {
      (window.chartRecords || []).forEach(record => {
        if (record.chart && record.canvas.closest('.tab-content.active')) record.chart.resize();
      });
    });
    return true;
  }

  function goToCard(card) {
    selectTab(card.tab);
    requestAnimationFrame(() => {
      card.element.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      const button = $('.favorite-toggle', card.element);
      if (button) button.focus({ preventScroll: true });
    });
  }

  function setupTabs() {
    tabs = $$('.tab-btn');
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => selectTab(tab.dataset.tab));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        selectTab(tabs[next].dataset.tab, true);
      });
    });
    $$('[data-open-tab]').forEach(button => button.addEventListener('click', () => {
      selectTab(button.dataset.openTab);
      $('#tabNav').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    const hash = location.hash.slice(1);
    if (hash) selectTab(hash, false, false);
    window.addEventListener('hashchange', () => selectTab(location.hash.slice(1), false, false));
  }

  function setupCards() {
    cards = $$('.tab-content .kpi-card').map((element, index) => {
      const panel = element.closest('.tab-content');
      const tab = panel.id.slice(4);
      const label = clean($('.kpi-label', element)?.textContent || 'Indicador');
      const value = clean($('.kpi-value', element)?.textContent || '');
      const context = clean($('.kpi-sub', element)?.textContent || '');
      const tabName = clean(tabs.find(item => item.dataset.tab === tab)?.textContent || tab);
      const id = tab + ':' + label;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'favorite-toggle';
      button.addEventListener('click', () => {
        if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
        const saved = writeFavorites();
        renderFavorites();
        if (!saved) $('#favoritesStatus').textContent = 'Não foi possível salvar neste navegador; os favoritos valem apenas nesta sessão.';
      });
      element.append(button);
      return { id, element, tab, tabName, label, value, context, button, index };
    });
  }

  function renderFavorites() {
    const list = $('#favoritesList');
    list.replaceChildren();
    cards.forEach(card => {
      const isSaved = favorites.has(card.id);
      card.button.textContent = isSaved ? '★' : '☆';
      card.button.setAttribute('aria-pressed', String(isSaved));
      card.button.setAttribute('aria-label', (isSaved ? 'Remover dos favoritos: ' : 'Adicionar aos favoritos: ') + card.label);
    });
    const savedCards = cards.filter(card => favorites.has(card.id));
    if (!savedCards.length) {
      const empty = document.createElement('span'); empty.className = 'empty-favorites';
      empty.textContent = 'Marque uma estrela nos indicadores para acompanhar aqui.'; list.append(empty);
      return;
    }
    savedCards.forEach(card => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'favorite-link';
      button.textContent = '★ ' + card.label + ' · ' + card.value;
      button.addEventListener('click', () => goToCard(card)); list.append(button);
    });
  }

  function setupSearch() {
    // Além dos cartões, indexa os detalhes e itens SWOT já presentes no painel.
    const details = $$('.tab-content .data-row, .tab-content .swot-item').map(element => {
      const tab = element.closest('.tab-content').id.slice(4);
      const tabName = clean(tabs.find(item => item.dataset.tab === tab)?.textContent || tab);
      const label = clean($('.data-label', element)?.textContent || element.textContent);
      const value = clean($('.data-value', element)?.textContent || '');
      const context = clean(element.closest('.detail-card, .swot-card')?.querySelector('h3, h4')?.textContent || '');
      return { element, tab, tabName, label, value, context };
    });
    searchEntries = [...cards, ...details];
    const input = $('#dashboardSearch'), results = $('#searchResults');
    input.addEventListener('input', () => {
      const query = normalize(input.value.trim()); results.replaceChildren();
      results.hidden = !query;
      if (!query) return;
      const words = query.split(/\s+/);
      const matches = searchEntries.filter(card => words.every(word => normalize([card.label, card.value, card.context, card.tabName].join(' ')).includes(word)));
      const status = document.createElement('p');
      status.textContent = matches.length ? `${matches.length} indicador(es) encontrado(s)` : 'Nenhum indicador encontrado. Tente outro termo.';
      results.append(status);
      matches.forEach(card => {
        const button = document.createElement('button'); button.type = 'button';
        button.textContent = card.label + (card.value ? ' — ' + card.value : '');
        const detail = document.createElement('small'); detail.textContent = card.tabName + (card.context ? ' · ' + card.context : '');
        button.append(detail); button.addEventListener('click', () => goToCard(card)); results.append(button);
      });
    });
    document.addEventListener('keydown', event => {
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) {
        event.preventDefault(); input.focus();
      }
      if (event.key === 'Escape' && document.activeElement === input) { input.value = ''; input.dispatchEvent(new Event('input')); }
    });
  }

  function setupExport() {
    $('#exportCsv').addEventListener('click', () => {
      // Prefixa fórmulas para que valores abertos em planilhas sejam tratados como texto.
      const quote = value => {
        let text = String(value ?? '');
        if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
      };
      const rows = [['Seção', 'Indicador', 'Valor exibido', 'Contexto exibido', 'Observação'], ...cards.map(card => [card.tabName, card.label, card.value, card.context, 'Valor estático; fonte e período devem ser conferidos'])];
      const content = '\ufeff' + rows.map(row => row.map(quote).join(';')).join('\r\n');
      const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'indicadores-piaui-teresina.csv';
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    $('#printPage').addEventListener('click', () => window.print());
  }

  function setupCharts() {
    (window.chartRecords || []).forEach(({ canvas, config, chart }) => {
      const container = canvas.closest('.chart-container');
      const title = clean($('h3', container)?.textContent || 'Gráfico');
      canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', title + '. Dados disponíveis na tabela abaixo.');
      if (!chart) {
        const fallback = document.createElement('p'); fallback.className = 'chart-fallback';
        fallback.textContent = 'Gráfico indisponível. Consulte os valores na tabela abaixo.';
        canvas.parentElement.replaceChildren(fallback);
      }
      const details = document.createElement('details'); details.className = 'chart-data';
      if (!chart) details.open = true;
      const summary = document.createElement('summary'); summary.textContent = 'Ver dados do gráfico em tabela'; details.append(summary);
      const wrapper = document.createElement('div'); wrapper.className = 'chart-table-wrap';
      const table = document.createElement('table');
      const caption = document.createElement('caption'); caption.textContent = title + ' — valores presentes no painel, sujeitos a verificação'; table.append(caption);
      const head = document.createElement('thead'), headerRow = document.createElement('tr');
      ['Categoria', ...config.data.datasets.map((dataset, index) => dataset.label || `Série ${index + 1}`)].forEach(value => {
        const th = document.createElement('th'); th.scope = 'col'; th.textContent = value; headerRow.append(th);
      });
      head.append(headerRow); table.append(head);
      const body = document.createElement('tbody');
      (config.data.labels || []).forEach((label, index) => {
        const row = document.createElement('tr'); const heading = document.createElement('th'); heading.scope = 'row'; heading.textContent = label; row.append(heading);
        config.data.datasets.forEach(dataset => { const td = document.createElement('td'); td.textContent = dataset.data[index] == null ? '—' : String(dataset.data[index]); row.append(td); });
        body.append(row);
      });
      table.append(body); wrapper.append(table); details.append(wrapper); container.append(details);
      const note = chartNotes[canvas.id];
      if (note) {
        const context = document.createElement('p'); context.className = 'chart-context';
        const label = document.createElement('strong'); label.textContent = 'Como ler: ';
        const source = document.createElement('a'); source.href = note[1]; source.target = '_blank'; source.rel = 'noopener noreferrer'; source.textContent = 'Consultar portal de referência ↗';
        context.append(label, document.createTextNode(note[0] + ' '), source); container.append(context);
      }
    });
  }

  function setupSpia() {
    const buttons = $$('[data-spia-zone]');
    buttons.forEach(button => button.addEventListener('click', () => {
      const selected = button.dataset.spiaZone;
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      $$('.spia-camera').forEach(card => { card.hidden = selected !== 'todas' && card.dataset.zone !== selected; });
    }));
  }

  function setupNews() {
    const input = $('#newsSearch'), category = $('#newsCategory'), list = $('#newsList');
    const terminal = $('#terminalBox'), counter = $('#newsCounter'), pause = $('#newsPause');
    const today = new Date();
    const end = today.toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
    // O filtro é móvel; uma curadoria estática pode ter menos de 50 itens conforme envelhece.
    const startDate = new Date(today.getTime());
    startDate.setUTCFullYear(startDate.getUTCFullYear() - 1);
    const start = startDate.toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
    const items = (window.PIAUI_NEWS || []).filter(item => item.date >= start && item.date <= end && /^https:\/\//.test(item.url));
    const categories = [...new Set(items.map(item => item.category))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    categories.forEach(name => { const option = document.createElement('option'); option.value = name; option.textContent = name; category.append(option); });
    let filtered = items, index = 0;
    let paused = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const updatePause = () => { pause.setAttribute('aria-pressed', String(paused)); pause.textContent = paused ? '▶ Retomar' : 'Ⅱ Pausar'; };
    const fmt = date => { const [y,m,d] = date.split('-'); return `${d}/${m}/${y}`; };
    function renderTerminal() {
      terminal.replaceChildren();
      if (!filtered.length) {
        terminal.textContent = 'Nenhuma notícia nesta seleção. Altere os filtros ou consulte as fontes originais.';
        counter.textContent = '0 resultados'; return;
      }
      const item = filtered[index];
      const prompt = document.createElement('span'); prompt.className = 'news-prompt'; prompt.textContent = 'piaui@noticias:~$ ';
      const link = document.createElement('a'); link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = item.title + ' ↗';
      const meta = document.createElement('span'); meta.className = 'news-meta'; meta.textContent = `[ ${fmt(item.date)} ]  ${item.source} · ${item.category}`;
      terminal.append(prompt, link, meta); counter.textContent = `${index + 1} / ${filtered.length} · SELEÇÃO ESTÁTICA`;
    }
    function renderList() {
      list.replaceChildren();
      $('#archiveCount').textContent = `${filtered.length} notícia${filtered.length === 1 ? '' : 's'}`;
      if (!filtered.length) { const empty = document.createElement('p'); empty.className = 'news-note'; empty.textContent = 'Nenhuma notícia encontrada para os filtros selecionados.'; list.append(empty); return; }
      filtered.forEach(item => {
        const row = document.createElement('article'); row.className = 'news-item';
        const wrap = document.createElement('div');
        const link = document.createElement('a'); link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = item.title;
        const meta = document.createElement('small'); meta.textContent = `${fmt(item.date)} · ${item.source} · ${item.category}`;
        const arrow = document.createElement('span'); arrow.className = 'news-arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '↗';
        wrap.append(link, meta); row.append(wrap, arrow); list.append(row);
      });
    }
    function filter() {
      const query = normalize(input.value.trim());
      filtered = items.filter(item => (!category.value || item.category === category.value) && normalize([item.title,item.source,item.category].join(' ')).includes(query));
      index = 0; renderList(); renderTerminal();
    }
    input.addEventListener('input', filter); category.addEventListener('change', filter);
    $('#newsNext').addEventListener('click', () => { if (filtered.length) { index = (index + 1) % filtered.length; renderTerminal(); } });
    $('#newsPrev').addEventListener('click', () => { if (filtered.length) { index = (index - 1 + filtered.length) % filtered.length; renderTerminal(); } });
    pause.addEventListener('click', () => { paused = !paused; updatePause(); });
    setInterval(() => { if (!paused && filtered.length && !document.hidden && $('#tab-terminal').classList.contains('active')) { index = (index + 1) % filtered.length; renderTerminal(); } }, 6000);
    updatePause(); filter();
  }

  const chartNotes = {
    chartPIBSetores: ['Participação setorial em percentuais, conforme os valores já incorporados ao painel. A soma é 100%; a origem e a definição de cada setor precisam ser conferidas.', 'https://www.ibge.gov.br/explica/pib.php'],
    chartPIBSetores2: ['Os mesmos percentuais do gráfico de visão geral aparecem aqui em formato polar. Áreas do gráfico não devem ser lidas como valores adicionais.', 'https://www.ibge.gov.br/explica/pib.php'],
    chartIDH: ['Série apresentada para 2000, 2010, 2020 e 2021. Antes de comparar os anos, confira fonte, metodologia e abrangência estadual de cada ponto.', 'https://www.undp.org/pt/brazil'],
    chartIDH2: ['O gráfico inclui uma série atribuída ao Piauí e um ponto de IDHM para Teresina em 2010. IDH e IDHM podem ter metodologias distintas; a comparação requer confirmação.', 'https://www.undp.org/pt/brazil'],
    chartRelevo: ['Percentuais de relevo presentes no painel, sem metodologia documentada. Categorias e limites de altitude devem ser validados em uma fonte geográfica.', 'https://www.ibge.gov.br/geociencias.html'],
    chartPopulacao: ['Contagens em habitantes: Censo 2022 e estimativas para 2023–2025 conforme o painel. Não confunda estimativas com recenseamento; verifique cada ano no IBGE.', 'https://www.ibge.gov.br/cidades-e-estados/pi.html'],
    chartConcentracao: ['Percentuais atribuídos à concentração da população em 14 municípios e nos demais. O ano e a lista dos municípios não estão documentados e precisam de revisão.', 'https://www.ibge.gov.br/cidades-e-estados/pi.html'],
    chartFinancas: ['Valores em bilhões de reais. A figura mistura receitas brutas e despesas empenhadas de 2024 com valores correntes de 2025; não é uma série diretamente comparável.', 'https://www.gov.br/tesouronacional/pt-br'],
    chartIDEB: ['Notas atribuídas a Piauí, Brasil e Nordeste nos níveis do ensino básico. Confirme o ano, a rede de ensino e os rótulos do indicador antes de comparar.', 'https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/ideb'],
    chartPosicaoEM: ['Posições de 2021 e 2023 conforme o painel; a escala é invertida porque uma posição menor representa colocação melhor. O critério e a rede devem ser confirmados.', 'https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/ideb']
  };

  function setupClock() {
    const update = () => {
      const now = new Date(), options = { timeZone: 'America/Fortaleza' };
      $('#clockDate').textContent = now.toLocaleDateString('pt-BR', options);
      const time = now.toLocaleTimeString('pt-BR', options);
      $('#clockTime').textContent = time; $('#navTime').textContent = time;
      $('#clockTimestamp').textContent = String(Math.floor(now.getTime() / 1000));
    };
    update(); setInterval(update, 1000);
  }

  window.initDashboard = function () {
    if (initialized) return; initialized = true;
    setupTabs(); readFavorites(); setupCards(); renderFavorites(); setupSearch(); setupExport(); setupCharts(); setupClock(); setupSpia(); setupNews();
  };
})();

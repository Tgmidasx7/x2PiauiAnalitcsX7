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
    });
  }

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
    setupTabs(); readFavorites(); setupCards(); renderFavorites(); setupSearch(); setupExport(); setupCharts(); setupClock();
  };
})();

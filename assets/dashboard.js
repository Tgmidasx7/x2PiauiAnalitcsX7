/* Indicadores locais; notícias consultam RSS por serviço externo e vídeos usam YouTube. */
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
    document.dispatchEvent(new CustomEvent('dashboard:tabchange', { detail: name }));
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
    const clearBtn = $('#clearFavorites');
    list.replaceChildren();
    cards.forEach(card => {
      const isSaved = favorites.has(card.id);
      card.button.textContent = isSaved ? '★' : '☆';
      card.button.setAttribute('aria-pressed', String(isSaved));
      card.button.setAttribute('aria-label', (isSaved ? 'Remover dos favoritos: ' : 'Adicionar aos favoritos: ') + card.label);
    });
    const savedCards = cards.filter(card => favorites.has(card.id));
    if (clearBtn) clearBtn.hidden = savedCards.length === 0;
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

  function downloadBlob(content, filename, mime) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function flashQuickStatus(message) {
    const el = $('#quickActionStatus');
    if (!el) return;
    el.textContent = message;
    setTimeout(() => { if (el.textContent === message) el.textContent = ''; }, 3500);
  }

  function setupExport() {
    const contrastKey = 'pi-analytics-contrast-v1';
    $('#exportCsv').addEventListener('click', () => {
      // Prefixa fórmulas para que valores abertos em planilhas sejam tratados como texto.
      const quote = value => {
        let text = String(value ?? '');
        if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
      };
      const rows = [['Seção', 'Indicador', 'Valor exibido', 'Contexto exibido', 'Observação'], ...cards.map(card => [card.tabName, card.label, card.value, card.context, 'Valor estático; fonte e período devem ser conferidos'])];
      const content = '\ufeff' + rows.map(row => row.map(quote).join(';')).join('\r\n');
      downloadBlob(content, 'indicadores-piaui-teresina.csv', 'text/csv;charset=utf-8');
      flashQuickStatus('CSV exportado.');
    });

    const jsonBtn = $('#exportJson');
    if (jsonBtn) {
      jsonBtn.addEventListener('click', () => {
        const payload = {
          projeto: 'x2PiauiAnalitcsX7 — Piauí Teresina Analytics',
          aviso: 'Valores estáticos incorporados ao painel; conferir fontes primárias antes de uso decisório.',
          exportadoEm: new Date().toISOString(),
          indicadores: cards.map(card => ({ secao: card.tabName, indicador: card.label, valor: card.value, contexto: card.context })),
          territorios: (window.PIAUI_TERRITORIES || []).map(({ code, name, polo, municipalitiesCount, biome }) => ({ codigo: code, territorio: name, polo, municipios: municipalitiesCount, bioma: biome })),
          municipiosReferencia: window.PIAUI_MUNICIPALITIES || []
        };
        downloadBlob(JSON.stringify(payload, null, 2), 'indicadores-piaui-teresina.json', 'application/json;charset=utf-8');
        flashQuickStatus('JSON exportado.');
      });
    }

    const copyBtn = $('#copyTabLink');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const activeTab = tabs.find(tab => tab.classList.contains('active'))?.dataset.tab || 'overview';
        const shareUrl = location.href.split('#')[0] + '#' + activeTab;
        try {
          if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(shareUrl);
            flashQuickStatus('Link copiado: #' + activeTab);
          } else {
            flashQuickStatus('Aba atual: #' + activeTab);
          }
        } catch (_) {
          flashQuickStatus('Aba atual: #' + activeTab);
        }
      });
    }

    const contrastBtn = $('#toggleContrast');
    if (contrastBtn) {
      const applyContrast = enabled => {
        document.body.classList.toggle('high-contrast', enabled);
        contrastBtn.setAttribute('aria-pressed', String(enabled));
      };
      try { if (localStorage.getItem(contrastKey) === '1') applyContrast(true); } catch (_) {}
      contrastBtn.addEventListener('click', () => {
        const next = !document.body.classList.contains('high-contrast');
        applyContrast(next);
        try { localStorage.setItem(contrastKey, next ? '1' : '0'); } catch (_) {}
      });
    }

    const clearFavBtn = $('#clearFavorites');
    if (clearFavBtn) {
      clearFavBtn.addEventListener('click', () => {
        favorites.clear();
        writeFavorites();
        renderFavorites();
      });
    }

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
    const grid = $('#spiaGrid'), search = $('#spiaSearch'), count = $('#spiaCount');
    const buttons = $$('[data-spia-filter]');
    let filterType = 'todas';
    let activeCard = null;
    const records = (window.SPIA_CAMERAS || []).filter(item => /^[A-Za-z0-9_-]{11}$/.test(item.id));
    const cards = records.map((item, i) => {
      const card = document.createElement('article'); card.className = 'spia-camera';
      const screen = document.createElement('div'); screen.className = 'camera-screen';
      const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'camera-trigger';
      trigger.setAttribute('aria-label', `Reproduzir vídeo público: ${item.title}, ${item.place}`);
      const image = document.createElement('img'); image.src = `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`; image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'; image.addEventListener('error', () => image.remove());
      const overlay = document.createElement('span'); overlay.className = 'camera-play'; overlay.textContent = '▶'; overlay.setAttribute('aria-hidden', 'true');
      const screenLabel = document.createElement('span'); screenLabel.className = 'camera-screen-label'; screenLabel.textContent = 'VÍDEO PÚBLICO • ABRIR';
      trigger.append(image, overlay, screenLabel); screen.append(trigger);
      const caption = document.createElement('div'); caption.className = 'camera-caption';
      const wrap = document.createElement('div'); const h = document.createElement('h4'); h.textContent = item.title;
      const loc = document.createElement('p'); loc.textContent = item.place + ' • ' + (item.type === 'aeroporto' ? 'Aeroporto' : 'Cidade');
      const link = document.createElement('a'); link.href = `https://www.youtube.com/watch?v=${item.id}`; link.textContent = 'Canal / vídeo original ↗'; link.target = '_blank'; link.rel = 'noopener noreferrer';
      const serial = document.createElement('span'); serial.textContent = String(i + 1).padStart(2, '0');
      wrap.append(h, loc, link); caption.append(wrap, serial); card.append(screen, caption); grid.append(card);
      function stop() { screen.replaceChildren(trigger); }
      trigger.addEventListener('click', () => {
        if (activeCard) activeCard.stop();
        const frame = document.createElement('iframe'); frame.src = `https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&mute=1&playsinline=1`;
        frame.title = `Vídeo público: ${item.title}, ${item.place}`; frame.allow = 'autoplay; encrypted-media; picture-in-picture'; frame.allowFullscreen = true;
        const close = document.createElement('button'); close.type = 'button'; close.className = 'camera-close'; close.textContent = 'Fechar vídeo';
        close.addEventListener('click', () => { stop(); activeCard = null; trigger.focus(); });
        screen.replaceChildren(frame, close); activeCard = {stop, card};
      });
      return { item, card };
    });
    function filter() {
      let visible = 0; const query = normalize(search.value.trim());
      cards.forEach(({ item, card }) => {
        const show = (filterType === 'todas' || filterType === item.type) && normalize(`${item.title} ${item.place}`).includes(query);
        card.hidden = !show; if (show) visible++;
      });
      if (activeCard && activeCard.card.hidden) { activeCard.stop(); activeCard = null; }
      count.textContent = `${visible} de ${cards.length} telas`;
    }
    buttons.forEach(button => button.addEventListener('click', () => {
      filterType = button.dataset.spiaFilter; buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button))); filter();
    }));
    search.addEventListener('input', filter); filter();
    document.addEventListener('dashboard:tabchange', event => { if (event.detail !== 'spia' && activeCard) { activeCard.stop(); activeCard = null; } });
    const scenarios = {
      norte: ['Exemplo fictício: uma via da Zona Norte apresenta movimento de veículos. Um operador poderia conferir a situação antes de qualquer decisão.', 'Exemplo fictício: uma imagem hipotética da Zona Norte está com visibilidade reduzida. Seria necessário verificar a fonte original.'],
      sul: ['Exemplo fictício: na Zona Sul, uma via imaginária mostra fluxo alternado. Não há dados reais sendo observados.', 'Exemplo fictício: a simulação sugere revisar uma imagem hipotética da Zona Sul. Nenhuma ocorrência foi detectada.'],
      leste: ['Exemplo fictício: na Zona Leste, uma central poderia registrar a condição geral de uma via, sempre mediante conferência humana.', 'Exemplo fictício: o exemplo representa uma tela hipotética da Zona Leste sem identificar pessoas ou veículos.'],
      sudeste: ['Exemplo fictício: no Sudeste de Teresina, uma via imaginária é descrita como movimentada. Isso não é uma medição.', 'Exemplo fictício: uma central poderia revisar uma tela hipotética na região Sudeste. Não há vídeo real associado.'],
      centro: ['Exemplo fictício: no Centro, uma observação hipotética mencionaria circulação em uma via. O exemplo não descreve o momento atual.', 'Exemplo fictício: para o Centro, o sistema sugere uma verificação humana de uma imagem imaginária. Não é um alerta real.']
    };
    let scenarioIndex = 0;
    $('#spiaSimulate').addEventListener('click', () => { const choices = scenarios[$('#spiaScenario').value]; $('#spiaOutput').textContent = choices[scenarioIndex++ % choices.length]; });
  }

  function setupNews() {
    const input = $('#newsSearch'), category = $('#newsCategory'), list = $('#newsList');
    const terminal = $('#terminalBox'), counter = $('#newsCounter'), pause = $('#newsPause'), status = $('#newsStatus');
    const sources = [
      {name:'g1 Piauí', feed:'https://g1.globo.com/rss/g1/pi/piaui/', host:'g1.globo.com'},
      {name:'Governo do Piauí', feed:'https://www.pi.gov.br/feed/', host:'www.pi.gov.br'}
    ];
    const local = window.PIAUI_NEWS || [];
    const fetched = new Map();
    let items = [], filtered = [], index = 0, refreshing = false, started = false;
    let paused = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const updatePause = () => { pause.setAttribute('aria-pressed', String(paused)); pause.textContent = paused ? '▶ Retomar' : 'Ⅱ Pausar'; };
    const fmt = date => { const [y,m,d] = date.split('-'); return `${d}/${m}/${y}`; };
    const dateKey = date => {
      const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/Fortaleza', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(date);
      const get = type => parts.find(part => part.type === type).value;
      return `${get('year')}-${get('month')}-${get('day')}`;
    };
    function rebuild() {
      const now = new Date(), startDate = new Date(now.getTime()); startDate.setUTCFullYear(startDate.getUTCFullYear() - 1);
      const start = dateKey(startDate), end = dateKey(now), unique = new Map();
      [...fetched.values()].flat().concat(local).forEach(item => {
        if (item.date >= start && item.date <= end && /^https:\/\//.test(item.url) && !unique.has(item.url)) unique.set(item.url, item);
      });
      items = [...unique.values()].sort((a, b) => b.date.localeCompare(a.date));
      const selected = category.value;
      category.replaceChildren(new Option('Todos os assuntos', ''));
      [...new Set(items.map(item => item.category))].sort((a, b) => a.localeCompare(b, 'pt-BR')).forEach(name => category.add(new Option(name, name)));
      if ([...category.options].some(option => option.value === selected)) category.value = selected;
      filter(false);
    }
    function writeLine() {
      if (!filtered.length) { terminal.textContent = 'Nenhuma notícia nesta seleção. Altere os filtros ou consulte as fontes originais.'; counter.textContent = '0 resultados'; return; }
      if (!terminal.querySelector('.cmd-line')) terminal.replaceChildren();
      const item = filtered[index];
      const atBottom = terminal.scrollHeight - terminal.clientHeight - terminal.scrollTop < 45;
      const line = document.createElement('div'); line.className = 'cmd-line';
      const prompt = document.createElement('span'); prompt.className = 'news-prompt'; prompt.textContent = `piaui@noticias:~$ [${String(index + 1).padStart(2, '0')}] `;
      const link = document.createElement('a'); link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = item.title + ' ↗';
      const meta = document.createElement('span'); meta.className = 'news-meta'; meta.textContent = `    └─ ${fmt(item.date)} · ${item.source} · ${item.category}${item.feed ? ' · FEED' : ' · ARQUIVO'}`;
      line.append(prompt, link, meta); terminal.append(line);
      while (terminal.children.length > 120) terminal.firstElementChild.remove();
      if (atBottom) terminal.scrollTop = terminal.scrollHeight;
      counter.textContent = `${index + 1} / ${filtered.length} · ROTACIONANDO`;
    }
    function renderList() {
      list.replaceChildren(); $('#archiveCount').textContent = `${filtered.length} notícia${filtered.length === 1 ? '' : 's'}`;
      if (!filtered.length) { const empty = document.createElement('p'); empty.className = 'news-note'; empty.textContent = 'Nenhuma notícia encontrada para os filtros selecionados.'; list.append(empty); return; }
      filtered.forEach(item => {
        const row = document.createElement('article'); row.className = 'news-item';
        const wrap = document.createElement('div'); const link = document.createElement('a'); link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = item.title;
        const meta = document.createElement('small'); meta.textContent = `${fmt(item.date)} · ${item.source} · ${item.category}${item.feed ? ' · Feed' : ' · Arquivo'}`;
        const arrow = document.createElement('span'); arrow.className = 'news-arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '↗';
        wrap.append(link, meta); row.append(wrap, arrow); list.append(row);
      });
    }
    function filter(clear = true) {
      const query = normalize(input.value.trim());
      filtered = items.filter(item => (!category.value || item.category === category.value) && normalize([item.title,item.source,item.category].join(' ')).includes(query));
      index = 0; renderList(); if (clear) terminal.replaceChildren(); writeLine();
    }
    async function fetchSource(source) {
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const endpoint = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(source.feed);
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json(); if (data.status !== 'ok' || !Array.isArray(data.items)) throw new Error('Feed indisponível');
        return data.items.flatMap(item => {
          try {
            const url = new URL(item.link); const published = new Date(item.pubDate.replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(item.pubDate) ? '' : 'Z'));
            if (url.protocol !== 'https:' || url.hostname !== source.host || !Number.isFinite(published.getTime()) || typeof item.title !== 'string') return [];
            const title = new DOMParser().parseFromString(item.title, 'text/html').body.textContent.trim();
            return title ? [{date:dateKey(published), title, url:url.href, source:source.name, category:'Atualidades', feed:true}] : [];
          } catch (_) { return []; }
        });
      } finally { clearTimeout(timeout); }
    }
    async function refresh() {
      if (refreshing) return; started = true;
      if (typeof fetch !== 'function') { status.textContent = 'Consulta indisponível neste navegador. Mantendo curadoria local.'; return; }
      refreshing = true; status.textContent = 'Consultando os feeds via RSS2JSON…';
      const results = await Promise.allSettled(sources.map(fetchSource));
      const failed = [];
      results.forEach((result, i) => { if (result.status === 'fulfilled') fetched.set(sources[i].name, result.value); else failed.push(sources[i].name); });
      rebuild();
      const time = new Date().toLocaleTimeString('pt-BR', {timeZone:'America/Fortaleza', hour:'2-digit', minute:'2-digit'});
      status.textContent = failed.length === sources.length ? `Consulta às ${time}: feeds indisponíveis. Mantendo arquivo e última consulta bem-sucedida da sessão.` : failed.length ? `Consulta às ${time}: sem resposta de ${failed.join(', ')}. Outros feeds atualizados; mantendo dados anteriores quando houver.` : `Feeds consultados às ${time} (hora de Teresina). Próxima tentativa em 5 minutos.`;
      refreshing = false;
    }
    input.addEventListener('input', () => filter()); category.addEventListener('change', () => filter());
    $('#newsNext').addEventListener('click', () => { if (filtered.length) { index = (index + 1) % filtered.length; writeLine(); } });
    $('#newsPrev').addEventListener('click', () => { if (filtered.length) { index = (index - 1 + filtered.length) % filtered.length; writeLine(); } });
    $('#newsClear').addEventListener('click', () => { terminal.replaceChildren(); writeLine(); });
    $('#newsRefresh').addEventListener('click', refresh);
    pause.addEventListener('click', () => { paused = !paused; updatePause(); });
    setInterval(() => { if (!paused && filtered.length && !document.hidden && $('#tab-terminal').classList.contains('active')) { index = (index + 1) % filtered.length; writeLine(); } }, 5000);
    setInterval(() => { if (started) refresh(); }, 300000);
    document.addEventListener('dashboard:tabchange', event => { if (event.detail === 'terminal' && !started) refresh(); });
    updatePause(); rebuild();
    if ($('#tab-terminal').classList.contains('active')) refresh();
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
    chartPosicaoEM: ['Posições de 2021 e 2023 conforme o painel; a escala é invertida porque uma posição menor representa colocação melhor. O critério e a rede devem ser confirmados.', 'https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/ideb'],
    chartMunicipios: ['População residente dos dez municípios mais populosos conforme referência do Censo 2022 no painel. Confira cada município na tabela oficial do IBGE.', 'https://www.ibge.gov.br/cidades-e-estados/pi.html'],
    chartMatrizEletrica: ['Distribuição percentual indicativa das fontes de geração elétrica no estado. Consulte potência outorgada e geração efetiva na ANEEL e no Balanço Energético.', 'https://www.gov.br/aneel/pt-br']
  };

  let selectTerritoryExternal = null;
  let focusMunicipalityExternal = null;

  function setupTerritories() {
    const territories = window.PIAUI_TERRITORIES || [];
    const municipalities = window.PIAUI_MUNICIPALITIES || [];
    const svg = $('#piauiSchematicSvg');
    const pillsWrap = $('#territoryPills');
    const munBody = $('#munTableBody');
    if (!territories.length || !municipalities.length || !svg || !munBody) return;

    const svgNS = 'http://www.w3.org/2000/svg';
    const tdSelect = $('#munTerritorySelect');
    const biomeSelect = $('#munBiomeSelect');
    const sortSelect = $('#munSortSelect');
    const searchInput = $('#munSearch');
    const resetBtn = $('#resetTerritoryFilter');
    const selA = $('#compareMunA');
    const selB = $('#compareMunB');
    const swapBtn = $('#swapCompareMun');
    const compareOut = $('#munCompareResult');

    let selectedTerritoryId = '';
    const regionNodes = new Map();
    const pillNodes = new Map();

    // Preenche seletores
    territories.forEach(td => {
      tdSelect.add(new Option(`${td.code} · ${td.name}`, td.id));
    });
    [...new Set(municipalities.map(m => m.biome))].sort((a, b) => a.localeCompare(b, 'pt-BR')).forEach(biome => {
      biomeSelect.add(new Option(biome, biome));
    });
    municipalities.forEach(m => {
      selA.add(new Option(`${m.name} (${m.territoryName})`, m.name));
      selB.add(new Option(`${m.name} (${m.territoryName})`, m.name));
    });
    selA.value = municipalities[0]?.name || '';
    selB.value = municipalities[1]?.name || municipalities[0]?.name || '';

    function appendMetaRow(container, label, value) {
      const row = document.createElement('div'); row.className = 'data-row';
      const l = document.createElement('span'); l.className = 'data-label'; l.textContent = label;
      const v = document.createElement('span'); v.className = 'data-value info'; v.textContent = value;
      row.append(l, v); container.append(row);
    }

    function renderTerritoryDetail() {
      const codeEl = $('#tdDetailCode');
      const nameEl = $('#tdDetailName');
      const vocEl = $('#tdDetailVocation');
      const metaEl = $('#tdDetailMeta');
      metaEl.replaceChildren();

      const td = territories.find(item => item.id === selectedTerritoryId);
      if (!td) {
        const totalMun = territories.reduce((sum, item) => sum + item.municipalitiesCount, 0);
        codeEl.textContent = '// PANORAMA ESTADUAL • 12 TERRITÓRIOS';
        nameEl.textContent = 'Todos os Territórios do Piauí';
        vocEl.textContent = 'Selecione qualquer território no mapa esquemático ou nos botões ao lado para examinar seu município-polo, bioma predominante, vocação produtiva, eixos logísticos e desafios estruturais.';
        appendMetaRow(metaEl, 'Municípios abrangidos', `${totalMun} municípios em 12 TDs`);
        appendMetaRow(metaEl, 'Biomas e zonas', 'Caatinga, Cerrado, Mata dos Cocais e Zona Costeira');
        appendMetaRow(metaEl, 'Polos na amostra', `${municipalities.length} municípios de referência catalogados`);
        appendMetaRow(metaEl, 'Órgão de planejamento', 'SEPLAN-PI / CEPRO');
        return;
      }

      codeEl.textContent = `// ${td.code} • POLO: ${td.polo.toUpperCase()}`;
      nameEl.textContent = td.name;
      vocEl.textContent = td.vocation;
      appendMetaRow(metaEl, 'Município-polo', td.polo);
      appendMetaRow(metaEl, 'Municípios no território', `${td.municipalitiesCount} municípios`);
      appendMetaRow(metaEl, 'Bioma / Zona dominante', td.biome);
      appendMetaRow(metaEl, 'Eixos logísticos', td.logistics);
      appendMetaRow(metaEl, 'Desafio prioritário', td.challenge);
    }

    function renderDirectory() {
      const query = normalize(searchInput.value.trim());
      const biome = biomeSelect.value;
      const sortBy = sortSelect.value;
      const filtered = municipalities
        .filter(m => (!selectedTerritoryId || m.territory === selectedTerritoryId)
          && (!biome || m.biome === biome)
          && (!query || normalize(`${m.name} ${m.territoryName} ${m.biome} ${m.profile}`).includes(query)))
        .slice()
        .sort((a, b) => {
          if (sortBy === 'density') return (b.pop2022 / b.areaKm2) - (a.pop2022 / a.areaKm2);
          if (sortBy === 'area') return b.areaKm2 - a.areaKm2;
          if (sortBy === 'name') return a.name.localeCompare(b.name, 'pt-BR');
          return b.pop2022 - a.pop2022;
        });

      munBody.replaceChildren();
      $('#munCount').textContent = `${filtered.length} de ${municipalities.length} municípios`;

      if (!filtered.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 7;
        td.textContent = 'Nenhum município encontrado para os filtros selecionados.';
        tr.append(td);
        munBody.append(tr);
        return;
      }

      filtered.forEach(m => {
        const density = (m.pop2022 / m.areaKm2).toFixed(1).replace('.', ',');
        const tr = document.createElement('tr');
        const nameTd = document.createElement('td');
        const pickBtn = document.createElement('button');
        pickBtn.type = 'button';
        pickBtn.className = 'text-link';
        pickBtn.textContent = m.name;
        pickBtn.title = 'Carregar no comparador municipal';
        pickBtn.addEventListener('click', () => {
          if (selA.value !== m.name) selA.value = m.name;
          renderComparison();
          compareOut.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        nameTd.append(pickBtn);

        const cells = [
          m.territoryName,
          m.biome,
          m.pop2022.toLocaleString('pt-BR'),
          m.areaKm2.toLocaleString('pt-BR'),
          `${density} hab/km²`,
          m.profile
        ];
        tr.append(nameTd, ...cells.map(val => {
          const td = document.createElement('td');
          td.textContent = val;
          return td;
        }));
        munBody.append(tr);
      });
    }

    function selectTerritory(id) {
      selectedTerritoryId = id || '';
      tdSelect.value = selectedTerritoryId;
      regionNodes.forEach((group, key) => {
        const active = key === selectedTerritoryId;
        group.classList.toggle('active', active);
        group.setAttribute('aria-pressed', String(active));
      });
      pillNodes.forEach((btn, key) => {
        btn.setAttribute('aria-pressed', String(key === selectedTerritoryId));
      });
      renderTerritoryDetail();
      renderDirectory();
    }

    // Constrói SVG e pílulas
    territories.forEach(td => {
      const g = document.createElementNS(svgNS, 'g');
      g.setAttribute('class', 'td-region');
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-pressed', 'false');
      g.setAttribute('aria-label', `${td.code} ${td.name}, polo ${td.polo}`);
      g.dataset.tdId = td.id;

      const poly = document.createElementNS(svgNS, 'polygon');
      poly.setAttribute('points', td.points);
      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('x', String(td.labelX));
      label.setAttribute('y', String(td.labelY));
      label.textContent = td.code.replace(' ', '');
      g.append(poly, label);

      if (td.capital) {
        const star = document.createElementNS(svgNS, 'text');
        star.setAttribute('x', String(td.labelX));
        star.setAttribute('y', String(td.labelY - 12));
        star.setAttribute('class', 'td-capital-mark');
        star.textContent = '★ THE';
        g.append(star);
      }

      const toggle = () => selectTerritory(selectedTerritoryId === td.id ? '' : td.id);
      g.addEventListener('click', toggle);
      g.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
      });
      svg.append(g);
      regionNodes.set(td.id, g);

      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'territory-pill';
      pill.setAttribute('aria-pressed', 'false');
      pill.dataset.territoryPill = td.id;
      pill.textContent = `${td.code} · ${td.name}`;
      pill.addEventListener('click', toggle);
      pillsWrap.append(pill);
      pillNodes.set(td.id, pill);
    });

    function buildCompareCard(mun, other) {
      const box = document.createElement('div'); box.className = 'compare-city-box';
      const h4 = document.createElement('h4'); h4.textContent = mun.name;
      const sub = document.createElement('small'); sub.textContent = `${mun.territoryName} • ${mun.biome} • ${mun.distCapitalKm === 0 ? 'Capital estadual' : mun.distCapitalKm + ' km de Teresina'}`;
      box.append(h4, sub);

      const statePop = 3271199;
      const density = mun.pop2022 / mun.areaKm2;
      const otherDensity = other.pop2022 / other.areaKm2;
      const metrics = [
        { label: 'População (Censo 2022)', text: `${mun.pop2022.toLocaleString('pt-BR')} hab. (${((mun.pop2022 / statePop) * 100).toFixed(1).replace('.', ',')}% PI)`, ratio: mun.pop2022 / Math.max(mun.pop2022, other.pop2022) },
        { label: 'Área territorial', text: `${mun.areaKm2.toLocaleString('pt-BR')} km²`, ratio: mun.areaKm2 / Math.max(mun.areaKm2, other.areaKm2) },
        { label: 'Densidade demográfica', text: `${density.toFixed(1).replace('.', ',')} hab/km²`, ratio: density / Math.max(density, otherDensity) }
      ];

      metrics.forEach(metric => {
        const wrap = document.createElement('div'); wrap.className = 'compare-metric';
        const top = document.createElement('div'); top.className = 'compare-metric-top';
        const s1 = document.createElement('span'); s1.textContent = metric.label;
        const s2 = document.createElement('span'); s2.textContent = metric.text;
        top.append(s1, s2);
        const track = document.createElement('div'); track.className = 'compare-bar-track';
        const fill = document.createElement('div'); fill.className = 'compare-bar-fill';
        fill.style.width = `${Math.max(6, Math.round(metric.ratio * 100))}%`;
        track.append(fill);
        wrap.append(top, track);
        box.append(wrap);
      });

      const prof = document.createElement('p');
      prof.className = 'news-note';
      prof.textContent = mun.profile;
      box.append(prof);
      return box;
    }

    function renderComparison() {
      const munA = municipalities.find(m => m.name === selA.value) || municipalities[0];
      const munB = municipalities.find(m => m.name === selB.value) || municipalities[1] || municipalities[0];
      const grid = document.createElement('div'); grid.className = 'compare-vs-grid';
      grid.append(buildCompareCard(munA, munB), buildCompareCard(munB, munA));
      compareOut.replaceChildren(grid);
    }

    tdSelect.addEventListener('change', () => selectTerritory(tdSelect.value));
    biomeSelect.addEventListener('change', renderDirectory);
    sortSelect.addEventListener('change', renderDirectory);
    searchInput.addEventListener('input', renderDirectory);
    resetBtn.addEventListener('click', () => selectTerritory(''));
    selA.addEventListener('change', renderComparison);
    selB.addEventListener('change', renderComparison);
    swapBtn.addEventListener('click', () => {
      const tmp = selA.value; selA.value = selB.value; selB.value = tmp;
      renderComparison();
    });

    selectTerritoryExternal = id => {
      selectTab('territorios');
      selectTerritory(id);
    };
    focusMunicipalityExternal = name => {
      selectTab('territorios');
      selectTerritory('');
      searchInput.value = name;
      renderDirectory();
      selA.value = name;
      renderComparison();
    };

    selectTerritory('');
    renderComparison();
  }

  function setupSimulator() {
    const rEl = $('#simRenovavel'), lEl = $('#simLogistica'), eEl = $('#simEducacao'), hEl = $('#simHidrica');
    if (!rEl || !lEl || !eEl || !hEl) return;

    const presets = {
      base: [70, 55, 75, 60],
      verde: [95, 75, 80, 65],
      interior: [75, 95, 85, 90],
      conservador: [40, 35, 50, 45]
    };

    function evaluate() {
      const r = Number(rEl.value), l = Number(lEl.value), e = Number(eEl.value), h = Number(hEl.value);
      $('#simRenovavelVal').textContent = `${r}%`;
      $('#simLogisticaVal').textContent = `${l}%`;
      $('#simEducacaoVal').textContent = `${e}%`;
      $('#simHidricaVal').textContent = `${h}%`;

      const total = Math.round((r + l + e + h) / 4);
      const interior = Math.round(l * 0.45 + h * 0.25 + r * 0.15 + e * 0.15);
      const clima = Math.round(h * 0.50 + r * 0.30 + e * 0.20);
      const produtivo = Math.round(e * 0.40 + r * 0.35 + l * 0.25);

      $('#simScoreTotal').textContent = `${total} / 100`;
      $('#simBarTotal').style.width = `${total}%`;
      $('#simScoreInterior').textContent = String(interior);
      $('#simScoreClima').textContent = String(clima);
      $('#simScoreProdutivo').textContent = String(produtivo);

      const axes = [
        { name: 'energia limpa e industrialização verde', val: r },
        { name: 'logística e conectividade no interior', val: l },
        { name: 'educação técnica e capital humano', val: e },
        { name: 'segurança hídrica no semiárido', val: h }
      ].sort((a, b) => b.val - a.val);

      $('#simDiagnosis').textContent = `Leitura ilustrativa (índice ${total}/100): o maior vetor selecionado é ${axes[0].name} (${axes[0].val}%), enquanto o principal gargalo relativo está em ${axes[3].name} (${axes[3].val}%). O equilíbrio entre infraestrutura interiorana e formação profissional condiciona a desconcentração além de Teresina.`;
    }

    [rEl, lEl, eEl, hEl].forEach(slider => slider.addEventListener('input', evaluate));
    $$('[data-sim-preset]').forEach(btn => btn.addEventListener('click', () => {
      const vals = presets[btn.dataset.simPreset];
      if (!vals) return;
      [rEl.value, lEl.value, eEl.value, hEl.value] = vals.map(String);
      evaluate();
    }));
    evaluate();
  }

  function setupAuditTable() {
    const catalog = window.PIAUI_AUDIT_CATALOG || [];
    const body = $('#auditTableBody');
    if (!catalog.length || !body) return;
    const buttons = $$('[data-audit-filter]');
    let activeFilter = 'todos';

    function render() {
      body.replaceChildren();
      const rows = catalog.filter(item => activeFilter === 'todos' || item.status === activeFilter);
      rows.forEach(item => {
        const tr = document.createElement('tr');
        const tdInd = document.createElement('td'); tdInd.textContent = item.indicator;
        const tdPer = document.createElement('td'); tdPer.textContent = item.period;
        const tdUnit = document.createElement('td'); tdUnit.textContent = item.unit;
        const tdStatus = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `audit-badge ${item.status}`;
        badge.textContent = item.statusLabel;
        tdStatus.append(badge);
        const tdLink = document.createElement('td');
        const link = document.createElement('a');
        link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.textContent = item.source + ' ↗';
        tdLink.append(link);
        tr.append(tdInd, tdPer, tdUnit, tdStatus, tdLink);
        body.append(tr);
      });
    }

    buttons.forEach(btn => btn.addEventListener('click', () => {
      activeFilter = btn.dataset.auditFilter;
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      render();
    }));
    render();
  }

  function setupPalette() {
    const modal = $('#cmdPalette');
    const openBtn = $('#openPalette');
    const closeBtn = $('#closePalette');
    const input = $('#cmdPaletteInput');
    const list = $('#cmdPaletteList');
    if (!modal || !input || !list) return;

    let commands = [];
    let filtered = [];
    let activeIdx = 0;
    let lastFocused = null;

    function buildCommands() {
      const tabCmds = tabs.map(tab => ({
        title: `Ir para aba: ${clean(tab.textContent)}`,
        type: 'ABA',
        keywords: `${tab.dataset.tab} ${clean(tab.textContent)}`,
        run: () => selectTab(tab.dataset.tab, true)
      }));
      const actionCmds = [
        { title: 'Exportar indicadores em CSV', type: 'AÇÃO', keywords: 'csv baixar planilha', run: () => $('#exportCsv')?.click() },
        { title: 'Exportar dados estruturados em JSON', type: 'AÇÃO', keywords: 'json exportar api dados', run: () => $('#exportJson')?.click() },
        { title: 'Alternar modo de alto contraste', type: 'ACESSIBILIDADE', keywords: 'contraste tema leitura', run: () => $('#toggleContrast')?.click() },
        { title: 'Imprimir seção atual', type: 'AÇÃO', keywords: 'imprimir pdf relatorio', run: () => window.print() }
      ];
      const tdCmds = (window.PIAUI_TERRITORIES || []).map(td => ({
        title: `${td.code} · Território ${td.name} (Polo: ${td.polo})`,
        type: 'TERRITÓRIO',
        keywords: `${td.code} ${td.name} ${td.polo} ${td.biome}`,
        run: () => { if (selectTerritoryExternal) selectTerritoryExternal(td.id); }
      }));
      const munCmds = (window.PIAUI_MUNICIPALITIES || []).map(m => ({
        title: `Município: ${m.name} — ${m.pop2022.toLocaleString('pt-BR')} hab.`,
        type: 'MUNICÍPIO',
        keywords: `${m.name} ${m.territoryName} ${m.biome} ${m.profile}`,
        run: () => { if (focusMunicipalityExternal) focusMunicipalityExternal(m.name); }
      }));
      const cardCmds = cards.map(c => ({
        title: `${c.label}: ${c.value}`,
        type: c.tabName,
        keywords: `${c.label} ${c.value} ${c.context} ${c.tabName}`,
        run: () => goToCard(c)
      }));
      commands = [...tabCmds, ...actionCmds, ...tdCmds, ...munCmds, ...cardCmds];
    }

    function renderList() {
      const q = normalize(input.value.trim());
      const terms = q ? q.split(/\s+/) : [];
      filtered = commands.filter(cmd => terms.every(t => normalize(`${cmd.title} ${cmd.keywords} ${cmd.type}`).includes(t))).slice(0, 30);
      activeIdx = 0;
      list.replaceChildren();
      if (!filtered.length) {
        const empty = document.createElement('p');
        empty.className = 'news-note';
        empty.style.padding = '.8rem';
        empty.textContent = 'Nenhum comando ou indicador correspondente.';
        list.append(empty);
        return;
      }
      filtered.forEach((cmd, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cmd-palette-item' + (idx === activeIdx ? ' active' : '');
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-selected', String(idx === activeIdx));
        const span = document.createElement('span'); span.textContent = cmd.title;
        const small = document.createElement('small'); small.textContent = cmd.type;
        btn.append(span, small);
        btn.addEventListener('click', () => { closePalette(); cmd.run(); });
        list.append(btn);
      });
    }

    function updateHighlight() {
      $$('.cmd-palette-item', list).forEach((el, idx) => {
        const active = idx === activeIdx;
        el.classList.toggle('active', active);
        el.setAttribute('aria-selected', String(active));
        if (active) el.scrollIntoView({ block: 'nearest' });
      });
    }

    function openPalette() {
      if (!commands.length) buildCommands();
      lastFocused = document.activeElement;
      modal.hidden = false;
      input.value = '';
      renderList();
      input.focus();
    }

    function closePalette() {
      if (modal.hidden) return;
      modal.hidden = true;
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    if (openBtn) openBtn.addEventListener('click', openPalette);
    if (closeBtn) closeBtn.addEventListener('click', closePalette);
    modal.addEventListener('click', event => { if (event.target === modal) closePalette(); });
    input.addEventListener('input', renderList);
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' && filtered.length) {
        event.preventDefault(); activeIdx = (activeIdx + 1) % filtered.length; updateHighlight();
      } else if (event.key === 'ArrowUp' && filtered.length) {
        event.preventDefault(); activeIdx = (activeIdx - 1 + filtered.length) % filtered.length; updateHighlight();
      } else if (event.key === 'Enter' && filtered[activeIdx]) {
        event.preventDefault(); const chosen = filtered[activeIdx]; closePalette(); chosen.run();
      }
    });
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (modal.hidden) openPalette(); else closePalette();
      } else if (event.key === 'Escape' && !modal.hidden) {
        event.preventDefault();
        closePalette();
      }
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
    setupTabs(); readFavorites(); setupCards(); renderFavorites(); setupTerritories(); setupSimulator(); setupAuditTable(); setupSearch(); setupExport(); setupCharts(); setupClock(); setupSpia(); setupNews(); setupPalette();
  };
})();

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'assets/dashboard.js'), 'utf8');
const news = fs.readFileSync(path.join(root, 'assets/news.js'), 'utf8');
const cameras = fs.readFileSync(path.join(root, 'assets/cameras.js'), 'utf8');
const territories = fs.readFileSync(path.join(root, 'assets/territories.js'), 'utf8');
const eyeOfGod = fs.readFileSync(path.join(root, 'assets/eye-of-god.js'), 'utf8');
const ultron = fs.readFileSync(path.join(root, 'assets/ultron.js'), 'utf8');

function createApp({ chart = true, hash = '', timerSpy = null, canvasMock = false } = {}) {
  const dom = new JSDOM(html, { url: 'https://example.test/' + hash, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  if (timerSpy) { const interval = window.setInterval.bind(window); window.setInterval = (fn, delay) => { timerSpy.push({fn, delay}); return interval(fn, delay); }; }
  const RealDate = window.Date;
  window.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : ['2026-11-13T15:00:00-03:00'])); } static now() { return new RealDate('2026-11-13T15:00:00-03:00').getTime(); } };
  window.HTMLElement.prototype.scrollIntoView = function () {};
  if (canvasMock) {
    window.HTMLCanvasElement.prototype.getContext = function () {
      return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        fillRect() {},
        clearRect() {},
        strokeRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        arc() {},
        stroke() {},
        fill() {},
        fillText() {},
        setLineDash() {},
        closePath() {},
        createRadialGradient() { return { addColorStop() {} }; }
      };
    };
  } else {
    window.HTMLCanvasElement.prototype.getContext = () => null;
  }
  if (chart) {
    window.Chart = class {
      static defaults = { font: {} };
      constructor(canvas, config) { this.canvas = canvas; this.config = config; }
      resize() { this.resized = true; }
    };
  }
  // Executa os scripts locais como o navegador, sem carregar CDNs.
  const script = [...window.document.querySelectorAll('script')].find(item => !item.src);
  window.eval(script.textContent);
  window.eval(news);
  window.eval(cameras);
  window.eval(territories);
  window.eval(dashboard);
  window.eval(eyeOfGod);
  window.eval(ultron);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return dom;
}

test('abre o painel e permite navegar pelas abas com teclado', () => {
  const dom = createApp(); const { document, KeyboardEvent } = dom.window;
  assert.ok(document.getElementById('mainApp'));
  assert.equal(document.getElementById('loadingScreen'), null);
  const overview = document.getElementById('btn-overview');
  overview.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(document.getElementById('btn-geo').getAttribute('aria-selected'), 'true');
  assert.ok(document.getElementById('tab-geo').classList.contains('active'));
  assert.equal(dom.window.location.hash, '#geo');
  dom.window.close();
});

test('busca sem acentos e favoritos persistem ao reiniciar', () => {
  const dom = createApp(); const { document, Event } = dom.window;
  const search = document.getElementById('dashboardSearch');
  search.value = 'populacao'; search.dispatchEvent(new Event('input', { bubbles: true }));
  assert.match(document.getElementById('searchResults').textContent, /População/);
  search.value = 'hidrogênio verde'; search.dispatchEvent(new Event('input', { bubbles: true }));
  assert.match(document.getElementById('searchResults').textContent, /Hidrogênio verde/i);
  const first = document.querySelector('#tab-overview .favorite-toggle'); first.click();
  assert.equal(first.getAttribute('aria-pressed'), 'true');
  assert.match(document.getElementById('favoritesList').textContent, /Área do Estado/);
  assert.ok(dom.window.localStorage.getItem('pi-analytics-favorites-v1'));
  const saved = dom.window.localStorage.getItem('pi-analytics-favorites-v1');
  dom.window.close();
  // Simula carregamento de outra página com os favoritos já presentes.
  const reload = new JSDOM(html, { url: 'https://example.test/', runScripts: 'outside-only', pretendToBeVisual: true });
  reload.window.matchMedia = () => ({ matches: false });
  reload.window.HTMLElement.prototype.scrollIntoView = function () {};
  reload.window.localStorage.setItem('pi-analytics-favorites-v1', saved);
  reload.window.eval([...reload.window.document.querySelectorAll('script')].find(item => !item.src).textContent);
  reload.window.eval(dashboard);
  reload.window.document.dispatchEvent(new reload.window.Event('DOMContentLoaded'));
  assert.equal(reload.window.document.querySelector('#tab-overview .favorite-toggle').getAttribute('aria-pressed'), 'true');
  reload.window.close();
});

test('gráficos oferecem tabelas e a falha da biblioteca não bloqueia o relógio', () => {
  const dom = createApp({ chart: false }); const { document } = dom.window;
  assert.equal(document.querySelectorAll('.chart-data').length, 12);
  assert.equal(document.querySelectorAll('.chart-fallback').length, 12);
  assert.match(document.getElementById('clockTime').textContent, /^\d\d:\d\d:\d\d$/);
  assert.ok(document.querySelector('.chart-data[open] table tbody tr'));
  document.getElementById('btn-eco').click();
  assert.ok(document.getElementById('tab-eco').classList.contains('active'));
  dom.window.close();
});

test('endereço com hash abre a aba correta e os controles de método funcionam', () => {
  const dom = createApp({ hash: '#edu' }); const { document } = dom.window;
  assert.equal(document.getElementById('btn-edu').getAttribute('aria-selected'), 'true');
  document.querySelector('[data-open-tab="fontes"]').click();
  assert.equal(document.getElementById('btn-fontes').getAttribute('aria-selected'), 'true');
  assert.ok(document.querySelectorAll('#tab-fontes .source-card').length >= 5);
  dom.window.close();
});


test('SPIA possui 30 vídeos identificados, filtra e oferece simulação explícita', t => {
  const dom = createApp(); t.after(() => dom.window.close());
  const { document, Event } = dom.window;
  document.getElementById('btn-spia').click();
  assert.equal(document.getElementById('btn-spia').getAttribute('aria-selected'), 'true');
  assert.match(document.getElementById('tab-spia').textContent, /não analisa os vídeos e não usa IA/);
  assert.equal(document.querySelectorAll('.spia-camera').length, 30);
  assert.equal(new Set(Array.from(dom.window.SPIA_CAMERAS, x => x.id)).size, 30);
  document.querySelector('[data-spia-filter="cidade"]').click();
  assert.equal(document.querySelectorAll('.spia-camera:not([hidden])').length, 14);
  document.querySelector('[data-spia-filter="todas"]').click();
  const search = document.getElementById('spiaSearch'); search.value = 'recife'; search.dispatchEvent(new Event('input'));
  assert.equal(document.querySelectorAll('.spia-camera:not([hidden])').length, 1);
  document.querySelector('.spia-camera:not([hidden]) .camera-trigger').click();
  assert.match(document.querySelector('.spia-camera iframe').src, /youtube-nocookie/);
  document.querySelector('.camera-close').click();
  assert.equal(document.querySelectorAll('.spia-camera iframe').length, 0);
  document.getElementById('spiaSimulate').click();
  assert.match(document.getElementById('spiaOutput').textContent, /Exemplo fictício/);
});

test('notícias têm links, filtro, navegação, pausa e janela móvel', t => {
  const dom = createApp(); t.after(() => dom.window.close());
  const { document, Event } = dom.window;
  assert.equal(dom.window.PIAUI_NEWS.length, 50);
  assert.equal(new Set(Array.from(dom.window.PIAUI_NEWS, x => x.url)).size, 50);
  assert.equal(document.querySelectorAll('.news-item').length, 50);
  const first = document.querySelector('#terminalBox a').href;
  document.getElementById('newsNext').click();
  assert.notEqual(document.querySelector('#terminalBox .cmd-line:last-child a').href, first);
  document.getElementById('newsPause').click();
  assert.equal(document.getElementById('newsPause').getAttribute('aria-pressed'), 'true');
  const search = document.getElementById('newsSearch');
  search.value = 'nao existe esta noticia'; search.dispatchEvent(new Event('input'));
  assert.equal(document.querySelectorAll('.news-item').length, 0);
  assert.match(document.getElementById('terminalBox').textContent, /Nenhuma notícia/);
  search.value = 'teresina'; search.dispatchEvent(new Event('input'));
  assert.ok(document.querySelectorAll('.news-item').length > 0);
  assert.equal(document.querySelectorAll('.chart-context').length, 12);
});


test('atualizador de feeds mescla dados válidos, rejeita URL inválida e agenda 5 minutos', async t => {
  const intervals = [];
  const dom = createApp({timerSpy: intervals}); t.after(() => dom.window.close());
  const { window } = dom;
  const refreshTimer = intervals.find(timer => timer.delay === 300000); assert.ok(refreshTimer);
  let requests = 0;
  window.fetch = async url => { requests++; return ({ ok: true, json: async () => ({status: 'ok', items: [
    {title: 'Nova notícia de Teresina', link: url.includes('pi.gov.br') ? 'https://www.pi.gov.br/noticia-nova/' : 'https://g1.globo.com/pi/piaui/noticia/nova.ghtml', pubDate: '2026-11-13 15:00:00'},
    {title: 'Malicioso', link:'https://example.com/fora', pubDate:'2026-11-13 15:00:00'}
  ]}) }); };
  window.document.getElementById('btn-terminal').click();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.match(window.document.getElementById('newsStatus').textContent, /Feeds consultados/);
  assert.equal(window.document.querySelectorAll('.news-item').length, 52);
  assert.doesNotMatch(window.document.getElementById('newsList').textContent, /Malicioso/);
  assert.match(window.document.getElementById('newsList').textContent, /Nova notícia de Teresina/);
  assert.equal(requests, 2); refreshTimer.fn();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(requests, 4);
});

test('falha dos feeds preserva arquivo local e avisa o usuário', async t => {
  const dom = createApp(); t.after(() => dom.window.close());
  dom.window.fetch = async () => { throw new Error('offline'); };
  dom.window.document.getElementById('btn-terminal').click();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.match(dom.window.document.getElementById('newsStatus').textContent, /feeds indisponíveis/i);
  assert.equal(dom.window.document.querySelectorAll('.news-item').length, 50);
});

test('aba Eye of God funciona isolada sem afetar as demais abas', t => {
  const dom = createApp({ hash: '#eye-of-god', canvasMock: true }); t.after(() => dom.window.close());
  const { document, KeyboardEvent } = dom.window;

  assert.equal(document.querySelectorAll('.tab-btn').length, 15);
  assert.equal(document.getElementById('btn-eye-of-god').getAttribute('aria-selected'), 'true');
  assert.ok(document.getElementById('tab-eye-of-god').classList.contains('active'));
  assert.equal(document.querySelectorAll('#eog-cctv-grid .eog-cam-cell').length, 6);
  assert.match(document.getElementById('eog-tactical-clock').textContent, /^\d\d:\d\d:\d\d\.\d{3}$/);

  // Modos de câmera (incluindo OPTICAL e NEURAL cujos rótulos são ÓPTICA HUD e FLUXO IA)
  ['FLIR', 'NVG', 'LIDAR', 'NEURAL', 'SAR', 'OPTICAL'].forEach(mode => {
    const btn = document.querySelector(`[data-eog-mode="${mode}"]`);
    btn.click();
    assert.equal(btn.getAttribute('aria-pressed'), 'true');
    assert.ok(btn.classList.contains('active'));
    assert.match(document.getElementById('eog-terminal-body').textContent, new RegExp(mode));
  });

  // Seleção de câmera e atualização do cartão de alvo
  const cam3 = document.querySelector('#eog-cctv-grid [data-cam-idx="2"]');
  cam3.click();
  assert.ok(cam3.classList.contains('focus'));
  assert.match(document.getElementById('eog-target-details-label').textContent, /QRT-9A71/);

  // Botões táticos: cravar mira, drone, áudio e lockdown
  document.getElementById('eog-lock-target-btn').click();
  assert.match(document.getElementById('eog-terminal-body').textContent, /MIRA CRAVADA/);
  document.getElementById('eog-dispatch-drone-btn').click();
  assert.match(document.getElementById('eog-terminal-body').textContent, /DRONE DE INTERCEPTAÇÃO DESPACHADO/);

  const audioBtn = document.getElementById('eog-audio-toggle');
  audioBtn.click();
  assert.equal(audioBtn.getAttribute('aria-pressed'), 'false');
  assert.match(audioBtn.textContent, /AUDIO: OFF/);

  const lockdownBtn = document.getElementById('eog-lockdown-btn');
  lockdownBtn.click();
  assert.equal(document.getElementById('eog-defcon-status').textContent, 'NÍVEL 1 - CRÍTICO');
  assert.ok(document.getElementById('eog-hud-shell').classList.contains('lockdown-active'));
  lockdownBtn.click();
  assert.equal(document.getElementById('eog-defcon-status').textContent, 'NÍVEL 2 - ELEVADO');
  assert.ok(!document.getElementById('eog-hud-shell').classList.contains('lockdown-active'));

  // Terminal CLI interativo e segurança contra injeção HTML
  const input = document.getElementById('eog-terminal-input');
  const runCmd = cmd => {
    input.value = cmd;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  };
  runCmd('help');
  assert.match(document.getElementById('eog-terminal-body').textContent, /COMANDOS:/);
  runCmd('thermal');
  assert.equal(document.querySelector('[data-eog-mode="FLIR"]').getAttribute('aria-pressed'), 'true');
  runCmd('target <img src=x onerror=alert(1)>');
  assert.equal(document.querySelectorAll('#eog-terminal-body img').length, 0);
  runCmd('target PIU-8B42');
  assert.match(document.getElementById('eog-target-details-label').textContent, /PIU-8B42/);
  runCmd('scan');
  assert.match(document.getElementById('eog-terminal-body').textContent, /VARREDURA MULTI-SETORIAL/);
  runCmd('radar');
  assert.match(document.getElementById('eog-terminal-body').textContent, /RADAR C4ISR/);
  runCmd('intercept');
  assert.match(document.getElementById('eog-terminal-body').textContent, /DRONE DE INTERCEPTAÇÃO/);
  runCmd('status');
  assert.match(document.getElementById('eog-terminal-body').textContent, /SISTEMA ESTÁVEL/);
  runCmd('lockdown');
  assert.equal(document.getElementById('eog-defcon-status').textContent, 'NÍVEL 1 - CRÍTICO');
  runCmd('standdown');
  assert.equal(document.getElementById('eog-defcon-status').textContent, 'NÍVEL 2 - ELEVADO');
  runCmd('invalido');
  assert.match(document.getElementById('eog-terminal-body').textContent, /Comando desconhecido/);
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  assert.equal(input.value, 'invalido');
  runCmd('clear');
  assert.equal(document.getElementById('eog-terminal-body').children.length, 0);

  // Não polui os cartões de KPI nem a busca principal
  assert.equal(document.querySelectorAll('#tab-eye-of-god .kpi-card').length, 0);
  assert.equal(document.querySelectorAll('.tab-content .kpi-card').length, 34);
  document.getElementById('btn-overview').click();
  assert.ok(document.getElementById('tab-overview').classList.contains('active'));
});

test('aba Municípios & Territórios filtra cartograma, diretório e comparador municipal', t => {
  const dom = createApp({ hash: '#territorios' }); t.after(() => dom.window.close());
  const { document, Event } = dom.window;

  assert.equal(document.getElementById('btn-territorios').getAttribute('aria-selected'), 'true');
  assert.equal(dom.window.PIAUI_TERRITORIES.length, 12);
  assert.equal(dom.window.PIAUI_TERRITORIES.reduce((s, td) => s + td.municipalitiesCount, 0), 224);
  assert.equal(document.querySelectorAll('#piauiSchematicSvg .td-region').length, 12);
  assert.equal(document.querySelectorAll('#munTableBody tr').length, 20);

  // Selecionar território no cartograma (SVGElement usa dispatchEvent em JSDOM)
  const litoranea = document.querySelector('#piauiSchematicSvg [data-td-id="planicie-litoranea"]');
  litoranea.dispatchEvent(new Event('click', { bubbles: true }));
  assert.equal(litoranea.getAttribute('aria-pressed'), 'true');
  assert.match(document.getElementById('tdDetailName').textContent, /Planície Litorânea/);
  assert.equal(document.querySelectorAll('#munTableBody tr').length, 2);

  document.getElementById('resetTerritoryFilter').click();
  assert.equal(document.querySelectorAll('#munTableBody tr').length, 20);

  // Busca e ordenação no diretório
  const munSearch = document.getElementById('munSearch');
  munSearch.value = 'soja';
  munSearch.dispatchEvent(new Event('input'));
  assert.equal(document.querySelectorAll('#munTableBody tr').length, 1);
  assert.match(document.getElementById('munTableBody').textContent, /Uruçuí/);

  // Comparador lado a lado e inversão
  assert.match(document.getElementById('munCompareResult').textContent, /Teresina/);
  assert.match(document.getElementById('munCompareResult').textContent, /Parnaíba/);
  document.getElementById('swapCompareMun').click();
  assert.equal(document.getElementById('compareMunA').value, 'Parnaíba');
  assert.equal(document.getElementById('compareMunB').value, 'Teresina');
});

test('simulador exploratório, matriz de auditoria, paleta Ctrl+K e alto contraste funcionam', t => {
  const dom = createApp({ hash: '#energia' }); t.after(() => dom.window.close());
  const { document, Event, KeyboardEvent } = dom.window;

  assert.equal(document.getElementById('btn-energia').getAttribute('aria-selected'), 'true');
  assert.equal(document.getElementById('simScoreTotal').textContent, '65 / 100');

  document.querySelector('[data-sim-preset="verde"]').click();
  assert.equal(document.getElementById('simRenovavel').value, '95');
  assert.match(document.getElementById('simDiagnosis').textContent, /energia limpa/);

  const slider = document.getElementById('simHidrica');
  slider.value = '100';
  slider.dispatchEvent(new Event('input'));
  assert.equal(document.getElementById('simHidricaVal').textContent, '100%');

  // Matriz de auditoria na aba Fontes
  document.getElementById('btn-fontes').click();
  assert.equal(document.querySelectorAll('#tab-fontes .source-card').length, 8);
  assert.equal(document.querySelectorAll('#auditTableBody tr').length, 11);
  document.querySelector('[data-audit-filter="simulacao"]').click();
  assert.equal(document.querySelectorAll('#auditTableBody tr').length, 1);

  // Alto contraste e limpeza de favoritos
  const contrast = document.getElementById('toggleContrast');
  contrast.click();
  assert.ok(document.body.classList.contains('high-contrast'));
  assert.equal(dom.window.localStorage.getItem('pi-analytics-contrast-v1'), '1');

  const favBtn = document.querySelector('#tab-overview .favorite-toggle');
  favBtn.click();
  assert.equal(document.getElementById('clearFavorites').hidden, false);
  document.getElementById('clearFavorites').click();
  assert.equal(document.getElementById('clearFavorites').hidden, true);

  // Paleta de comandos Ctrl+K
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  assert.equal(document.getElementById('cmdPalette').hidden, false);
  const cmdInput = document.getElementById('cmdPaletteInput');
  cmdInput.value = 'Picos';
  cmdInput.dispatchEvent(new Event('input'));
  assert.match(document.getElementById('cmdPaletteList').textContent, /Picos/);
  // Primeiro resultado é o território TD 06 (Polo: Picos); segundo é o município Picos
  cmdInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  cmdInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(document.getElementById('cmdPalette').hidden, true);
  assert.equal(document.getElementById('btn-territorios').getAttribute('aria-selected'), 'true');
  assert.equal(document.getElementById('compareMunA').value, 'Picos');
});

test('aba Eye of God tolera ausência de contexto 2D do canvas', t => {
  const dom = createApp({ hash: '#eye-of-god', canvasMock: false }); t.after(() => dom.window.close());
  const { document } = dom.window;
  assert.ok(document.getElementById('tab-eye-of-god').classList.contains('active'));
  document.querySelector('[data-eog-mode="FLIR"]').click();
  document.getElementById('eog-lock-target-btn').click();
  assert.match(document.getElementById('eog-terminal-body').textContent, /MIRA CRAVADA/);
});

test('página dedicada /eyeofgod/ funciona de forma autônoma', t => {
  const eogHtml = fs.readFileSync(path.join(root, 'eyeofgod/index.html'), 'utf8');
  const dom = new JSDOM(eogHtml, { url: 'https://example.test/eyeofgod/', runScripts: 'outside-only', pretendToBeVisual: true });
  t.after(() => dom.window.close());
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  window.HTMLCanvasElement.prototype.getContext = () => null;
  window.eval(eyeOfGod);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  assert.equal(window.document.querySelectorAll('#eog-cctv-grid .eog-cam-cell').length, 6);
  window.document.querySelector('[data-eog-mode="SAR"]').click();
  assert.equal(window.document.querySelector('[data-eog-mode="SAR"]').getAttribute('aria-pressed'), 'true');
  assert.match(window.document.getElementById('eog-terminal-body').textContent, /SAR/);
});

test('Agente Autônomo Ultron-X7 opera raciocínio multi-agente, Haversine, Monte Carlo e Co-Piloto', t => {
  const dom = createApp({ hash: '#ultron', canvasMock: true }); t.after(() => dom.window.close());
  const { document, Event, KeyboardEvent } = dom.window;

  assert.equal(document.getElementById('btn-ultron').getAttribute('aria-selected'), 'true');
  assert.ok(document.getElementById('tab-ultron').classList.contains('active'));
  assert.equal(document.querySelectorAll('.ult-agent-node').length, 6);

  // Coordenadas IBGE reais presentes nos 20 municípios e cálculo Haversine preciso
  assert.equal(dom.window.PIAUI_MUNICIPALITIES.every(m => m.ibgeCode && typeof m.lat === 'number' && typeof m.lon === 'number'), true);
  const the = dom.window.PIAUI_MUNICIPALITIES.find(m => m.name === 'Teresina');
  const phb = dom.window.PIAUI_MUNICIPALITIES.find(m => m.name === 'Parnaíba');
  const distKm = dom.window.ultronHaversineKm(the.lat, the.lon, phb.lat, phb.lon);
  assert.ok(distKm > 265 && distKm < 295, `Distância Haversine inesperada: ${distKm}`);
  assert.match(document.getElementById('ultDistanceReadout').textContent, /km geodésicos/);
  const initialCityB = document.getElementById('ultCityB').value;
  document.getElementById('ultSwapCities').click();
  assert.equal(document.getElementById('ultCityA').value, initialCityB);

  // Simulação estocástica Monte Carlo (2025–2035) com bandas ordenadas P10 < P50 < P90
  const mcSeries = dom.window.ultronRunMonteCarlo({ startVal: 80.9, years: 10, driftPct: 4.5, volPct: 2.8, paths: 500, seed: 42 });
  assert.equal(mcSeries.length, 11);
  const y2035 = mcSeries[mcSeries.length - 1];
  assert.equal(y2035.year, 2035);
  assert.ok(y2035.p10 < y2035.p50 && y2035.p50 < y2035.p90);
  assert.equal(document.querySelectorAll('#ultMcTableBody tr').length, 11);
  document.getElementById('ultMcDrift').value = '6.5';
  document.getElementById('ultMcDrift').dispatchEvent(new Event('change'));
  assert.match(document.getElementById('ultMcP50').textContent, /R\$/);

  // Console cognitivo multi-agente por chips e formulário
  document.querySelector('[data-ult-prompt="Compare Teresina e Uruçuí"]').click();
  assert.match(document.getElementById('ultChatLog').textContent, /Teresina × Uruçuí/);
  assert.match(document.getElementById('ultChatLog').textContent, /Haversine/);

  const chatInput = document.getElementById('ultChatInput');
  chatInput.value = 'Qual o risco fiscal da dívida e limites da LRF?';
  document.getElementById('ultChatForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  assert.match(document.getElementById('ultChatLog').textContent, /LRF/);

  // Modo Sentinela autônomo e exportação de Dossiê Executivo (.md)
  let exportedBlob = null;
  dom.window.URL.createObjectURL = blob => { exportedBlob = blob; return 'blob:ultron-dossier'; };
  dom.window.URL.revokeObjectURL = () => {};
  document.getElementById('ultExportDossierBtn').click();
  assert.ok(exportedBlob);

  const sentinelBtn = document.getElementById('ultSentinelBtn');
  sentinelBtn.click();
  assert.equal(sentinelBtn.getAttribute('aria-pressed'), 'true');
  sentinelBtn.click();
  assert.equal(sentinelBtn.getAttribute('aria-pressed'), 'false');

  // Co-Piloto Flutuante Global (FAB + Alt+U) e ponte CLI no Eye of God
  document.getElementById('btn-eco').click();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'u', altKey: true, bubbles: true }));
  assert.equal(document.getElementById('ultronCopilotDrawer').hidden, false);
  const drawerInput = document.getElementById('ultDrawerInput');
  drawerInput.value = 'Ranking multicritério dos territórios';
  document.getElementById('ultDrawerForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  assert.match(document.getElementById('ultDrawerLog').textContent, /Ranking Multicritério/i);
  document.getElementById('ultCloseDrawer').click();
  assert.equal(document.getElementById('ultronCopilotDrawer').hidden, true);

  document.getElementById('btn-eye-of-god').click();
  const eogInput = document.getElementById('eog-terminal-input');
  eogInput.value = 'ultron energia limpa e H2 verde';
  eogInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(document.getElementById('btn-ultron').getAttribute('aria-selected'), 'true');
  assert.match(document.getElementById('ultChatLog').textContent, /Transição Verde/i);
});

test('conector IBGE do Ultron sincroniza 224 municípios + SIDRA e possui fallback offline', async t => {
  const dom = createApp({ hash: '#ultron' }); t.after(() => dom.window.close());
  const { window } = dom;
  const { document, Event } = window;

  // 1) Simula falha de rede: preserva os 20 polos locais sem quebrar a interface
  window.fetch = async () => { throw new Error('offline'); };
  document.getElementById('ultSyncIbgeBtn').click();
  await new Promise(r => setTimeout(r, 15));
  assert.match(document.getElementById('ultIbgeStatus').textContent, /Sem conexão direta à API do IBGE/);
  assert.equal(document.querySelectorAll('#ultIbgeResults .ult-ibge-row').length, 20);

  // 2) Simula resposta oficial da API IBGE Localidades (224 municípios) + SIDRA Censo 2022
  const fake224 = Array.from({ length: 224 }, (_, idx) => ({
    id: idx === 0 ? 2211001 : 2200000 + idx,
    nome: idx === 0 ? 'Teresina' : `Município Piauiense ${idx}`,
    microrregiao: { mesorregiao: { nome: 'Centro-Norte Piauiense' } }
  }));
  window.fetch = async url => {
    if (String(url).includes('/v1/localidades/')) {
      return { ok: true, json: async () => fake224 };
    }
    return {
      ok: true,
      json: async () => ([{ resultados: [{ series: [
        { localidade: { id: '22' }, serie: { '2022': '3271199' } },
        { localidade: { id: '2211001' }, serie: { '2022': '866300' } }
      ] }] }])
    };
  };
  document.getElementById('ultSyncIbgeBtn').click();
  await new Promise(r => setTimeout(r, 15));
  assert.match(document.getElementById('ultIbgeBadge').textContent, /224 MUN\. AO VIVO/);
  assert.match(document.getElementById('ultIbgeStatus').textContent, /3\.271\.199/);
  const search = document.getElementById('ultIbgeSearchInput');
  search.value = '2211001';
  search.dispatchEvent(new Event('input'));
  assert.equal(document.querySelectorAll('#ultIbgeResults .ult-ibge-row').length, 1);
  assert.match(document.getElementById('ultIbgeResults').textContent, /Teresina/);
});

test('página dedicada /ultron/ funciona de forma autônoma', t => {
  const ultHtml = fs.readFileSync(path.join(root, 'ultron/index.html'), 'utf8');
  const dom = new JSDOM(ultHtml, { url: 'https://example.test/ultron/', runScripts: 'outside-only', pretendToBeVisual: true });
  t.after(() => dom.window.close());
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.HTMLCanvasElement.prototype.getContext = () => null;
  window.eval(news);
  window.eval(territories);
  window.eval(ultron);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  assert.equal(window.document.querySelectorAll('.ult-agent-node').length, 6);
  assert.equal(window.document.querySelectorAll('#ultMcTableBody tr').length, 11);
  window.document.querySelector('[data-ult-prompt="Ranking multicritério dos territórios"]').click();
  assert.match(window.document.getElementById('ultChatLog').textContent, /Ranking Multicritério/i);
});

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

function createApp({ chart = true, hash = '', timerSpy = null } = {}) {
  const dom = new JSDOM(html, { url: 'https://example.test/' + hash, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  if (timerSpy) { const interval = window.setInterval.bind(window); window.setInterval = (fn, delay) => { timerSpy.push({fn, delay}); return interval(fn, delay); }; }
  const RealDate = window.Date;
  window.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : ['2026-10-30T15:00:00-03:00'])); } static now() { return new RealDate('2026-10-30T15:00:00-03:00').getTime(); } };
  window.HTMLElement.prototype.scrollIntoView = function () {};
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
  window.eval(dashboard);
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
  assert.equal(document.querySelectorAll('.chart-data').length, 10);
  assert.equal(document.querySelectorAll('.chart-fallback').length, 10);
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
  assert.equal(document.querySelectorAll('.chart-context').length, 10);
});


test('atualizador de feeds mescla dados válidos, rejeita URL inválida e agenda 5 minutos', async t => {
  const intervals = [];
  const dom = createApp({timerSpy: intervals}); t.after(() => dom.window.close());
  const { window } = dom;
  const refreshTimer = intervals.find(timer => timer.delay === 300000); assert.ok(refreshTimer);
  let requests = 0;
  window.fetch = async url => { requests++; return ({ ok: true, json: async () => ({status: 'ok', items: [
    {title: 'Nova notícia de Teresina', link: url.includes('pi.gov.br') ? 'https://www.pi.gov.br/noticia-nova/' : 'https://g1.globo.com/pi/piaui/noticia/nova.ghtml', pubDate: '2026-10-30 15:00:00'},
    {title: 'Malicioso', link:'https://example.com/fora', pubDate:'2026-10-30 15:00:00'}
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

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'assets/dashboard.js'), 'utf8');

function createApp({ chart = true, hash = '' } = {}) {
  const dom = new JSDOM(html, { url: 'https://example.test/' + hash, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
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

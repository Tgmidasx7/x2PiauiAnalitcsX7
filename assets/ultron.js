/**
 * ULTRON // X7-OMEGA — MOTOR MULTI-AGENTE DE INTELIGÊNCIA ESTRATÉGICA
 * Execução 100% cliente: raciocínio determinístico sobre indicadores locais,
 * cálculo geodésico Haversine, simulação estocástica Monte Carlo (500 trajetórias),
 * auditoria opcional ao vivo na API pública do IBGE e geração de dossiê executivo.
 */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function safeCtx(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') return null;
    try { return canvas.getContext('2d'); } catch (_) { return null; }
  }

  // Fórmula geodésica de Haversine (distância em linha reta em km)
  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371.0088;
    const toRad = deg => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  window.ultronHaversineKm = haversineKm;

  // PRNG determinístico Mulberry32 + Box-Muller para simulação estocástica reprodutível
  function createRng(seed = 20261113) {
    let s = seed >>> 0;
    return () => {
      s += 0x6D2B79F5;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function percentile(sortedArr, p) {
    if (!sortedArr.length) return 0;
    const idx = (sortedArr.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sortedArr[lo];
    return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
  }

  function computeMonteCarloSeries({ startVal = 89.8, years = 10, driftPct = 4.5, volPct = 2.8, paths = 500, seed = null } = {}) {
    const drift = Number(driftPct) / 100;
    const vol = Number(volPct) / 100;
    const nPaths = Math.max(10, Number(paths) || 500);
    const yearList = Array.from({ length: years + 1 }, (_, i) => 2025 + i);
    const actualSeed = seed !== null ? seed : (Math.round(drift * 10000) * 31 + Math.round(vol * 10000) * 17 + nPaths);
    const rng = createRng(actualSeed);
    const matrix = yearList.map(() => []);

    for (let p = 0; p < nPaths; p++) {
      let val = startVal;
      matrix[0].push(val);
      for (let y = 1; y < yearList.length; y++) {
        const u1 = Math.max(1e-7, rng());
        const u2 = rng();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        val = val * Math.exp((drift - 0.5 * vol * vol) + vol * z);
        matrix[y].push(val);
      }
    }

    return yearList.map((year, idx) => {
      const sorted = matrix[idx].slice().sort((a, b) => a - b);
      return {
        year,
        p10: percentile(sorted, 0.10),
        p50: percentile(sorted, 0.50),
        p90: percentile(sorted, 0.90)
      };
    });
  }

  window.ultronRunMonteCarlo = computeMonteCarloSeries;

  // Malha rodoviária federal e estadual estruturante conectando os 20 polos do Piauí
  const PIAUI_HIGHWAY_EDGES = [
    ['Luís Correia', 'Parnaíba', 18, 'BR-343'],
    ['Parnaíba', 'Esperantina', 155, 'BR-222 / PI-214'],
    ['Parnaíba', 'Piripiri', 162, 'BR-343'],
    ['Esperantina', 'Piripiri', 84, 'BR-222'],
    ['Esperantina', 'Barras', 62, 'PI-113'],
    ['Piripiri', 'Pedro II', 52, 'BR-404'],
    ['Piripiri', 'Campo Maior', 82, 'BR-343'],
    ['Pedro II', 'Campo Maior', 122, 'PI-215'],
    ['Barras', 'Campo Maior', 68, 'PI-110'],
    ['Barras', 'José de Freitas', 79, 'PI-113'],
    ['União', 'Teresina', 59, 'PI-112'],
    ['União', 'José de Freitas', 49, 'PI-367'],
    ['José de Freitas', 'Teresina', 48, 'PI-113'],
    ['José de Freitas', 'Altos', 28, 'PI-366'],
    ['Campo Maior', 'Altos', 43, 'BR-343'],
    ['Altos', 'Teresina', 41, 'BR-343'],
    ['Teresina', 'Valença do Piauí', 216, 'BR-316'],
    ['Teresina', 'Floriano', 244, 'BR-343'],
    ['Valença do Piauí', 'Picos', 98, 'BR-316'],
    ['Valença do Piauí', 'Oeiras', 102, 'BR-230 / PI-120'],
    ['Oeiras', 'Picos', 90, 'BR-230'],
    ['Oeiras', 'Floriano', 112, 'BR-230'],
    ['Picos', 'Paulistana', 154, 'BR-407'],
    ['Picos', 'São Raimundo Nonato', 276, 'BR-020'],
    ['Paulistana', 'São Raimundo Nonato', 246, 'PI-459 / BR-020'],
    ['Oeiras', 'São Raimundo Nonato', 252, 'PI-143'],
    ['Floriano', 'São Raimundo Nonato', 282, 'PI-140'],
    ['Floriano', 'Uruçuí', 209, 'PI-247'],
    ['Floriano', 'Bom Jesus', 364, 'BR-135'],
    ['Uruçuí', 'Bom Jesus', 228, 'PI-247 / Transcerrados'],
    ['São Raimundo Nonato', 'Bom Jesus', 265, 'BR-324 / PI-140'],
    ['Bom Jesus', 'Corrente', 237, 'BR-135']
  ];

  // Algoritmo de Dijkstra para menor rota rodoviária multi-polos no Piauí
  function dijkstraCorridor(origin, dest) {
    if (!origin || !dest) return null;
    if (origin === dest) return { path: [origin], segments: [], totalKm: 0, roads: [] };
    const adj = new Map();
    PIAUI_HIGHWAY_EDGES.forEach(([a, b, km, road]) => {
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a).push({ to: b, km, road });
      adj.get(b).push({ to: a, km, road });
    });
    if (!adj.has(origin) || !adj.has(dest)) return null;

    const dist = new Map();
    const prev = new Map();
    const visited = new Set();
    adj.forEach((_, node) => dist.set(node, Infinity));
    dist.set(origin, 0);

    while (visited.size < adj.size) {
      let current = null;
      let best = Infinity;
      dist.forEach((d, node) => {
        if (!visited.has(node) && d < best) {
          best = d;
          current = node;
        }
      });
      if (!current || current === dest || best === Infinity) break;
      visited.add(current);
      (adj.get(current) || []).forEach(edge => {
        if (visited.has(edge.to)) return;
        const alt = best + edge.km;
        if (alt < dist.get(edge.to)) {
          dist.set(edge.to, alt);
          prev.set(edge.to, { from: current, km: edge.km, road: edge.road });
        }
      });
    }

    if (!Number.isFinite(dist.get(dest))) return null;
    const path = [dest];
    const segments = [];
    let step = dest;
    while (step !== origin) {
      const info = prev.get(step);
      if (!info) break;
      segments.unshift({ from: info.from, to: step, km: info.km, road: info.road });
      path.unshift(info.from);
      step = info.from;
    }
    const roads = Array.from(new Set(segments.map(s => s.road)));
    return { path, segments, totalKm: dist.get(dest), roads };
  }

  window.ultronDijkstraRoute = dijkstraCorridor;

  // Otimizador multi-objetivo de alocação de investimentos públicos (Fronteira de Pareto)
  const PARETO_AXES = [
    { id: 'energia', name: 'Transição Energética, ZPE & H₂ Verde', baseWeight: 0.24, elasticities: [0.68, 0.92, 0.76, 0.88, 0.54] },
    { id: 'logistica', name: 'Corredores Multimodais, Porto & Ferrovias', baseWeight: 0.23, elasticities: [0.94, 0.84, 0.58, 0.82, 0.62] },
    { id: 'educacao', name: 'Educação Integral, EPT, P&D & IA', baseWeight: 0.22, elasticities: [0.72, 0.90, 0.64, 0.78, 0.95] },
    { id: 'hidrica', name: 'Segurança Hídrica & Irrigação Semiárido', baseWeight: 0.17, elasticities: [0.88, 0.66, 0.96, 0.64, 0.89] },
    { id: 'saude', name: 'Saúde Regionalizada & Piauí Digital', baseWeight: 0.14, elasticities: [0.82, 0.62, 0.60, 0.58, 0.93] }
  ];

  const PARETO_REGIMES = {
    pareto: { label: 'Equilíbrio Ótimo de Pareto', weights: [0.24, 0.23, 0.22, 0.17, 0.14] },
    verde: { label: 'Aceleração Industrial Verde & H₂', weights: [0.38, 0.26, 0.16, 0.11, 0.09] },
    interior: { label: 'Desconcentração & Logística Interiorana', weights: [0.18, 0.34, 0.16, 0.20, 0.12] },
    humano: { label: 'Salto de Capital Humano & Inovação', weights: [0.15, 0.15, 0.38, 0.12, 0.20] },
    hidrico: { label: 'Blindagem Climática & Hídrica Semiárido', weights: [0.16, 0.16, 0.14, 0.38, 0.16] }
  };

  function optimizeParetoPortfolio({ budgetBi = 5.0, regime = 'pareto' } = {}) {
    const chosen = PARETO_REGIMES[regime] || PARETO_REGIMES.pareto;
    const totalBi = Math.max(0.5, Number(budgetBi) || 5.0);
    const scaleFactor = Math.min(1.18, 0.82 + Math.log10(totalBi + 1) * 0.36);

    const allocations = PARETO_AXES.map((axis, idx) => {
      const share = chosen.weights[idx];
      const amountMi = Math.round(totalBi * 1000 * share);
      return {
        id: axis.id,
        name: axis.name,
        sharePct: Math.round(share * 100),
        amountMi
      };
    });

    const radarLabels = ['Interiorização', 'Produtividade', 'Resiliência Climática', 'Retorno Fiscal', 'Inclusão Social'];
    const radarScores = radarLabels.map((label, dimIdx) => {
      const weighted = PARETO_AXES.reduce((acc, axis, axisIdx) => acc + chosen.weights[axisIdx] * axis.elasticities[dimIdx], 0);
      const baseline = PARETO_AXES.reduce((acc, axis) => acc + axis.baseWeight * axis.elasticities[dimIdx], 0);
      return {
        dimension: label,
        score: Math.min(99, Math.round(weighted * 100 * scaleFactor)),
        baseline: Math.min(95, Math.round(baseline * 100 * 0.92))
      };
    });

    const compositeIndex = Math.round(radarScores.reduce((s, r) => s + r.score, 0) / radarScores.length);
    return { budgetBi: totalBi, regime, regimeLabel: chosen.label, allocations, radarScores, compositeIndex };
  }

  window.ultronOptimizePortfolio = optimizeParetoPortfolio;

  function computeGini(values) {
    const cleanVals = values.filter(v => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
    const n = cleanVals.length;
    if (n < 2) return 0;
    const sum = cleanVals.reduce((s, v) => s + v, 0);
    if (!sum) return 0;
    let weighted = 0;
    cleanVals.forEach((v, i) => { weighted += (i + 1) * v; });
    return (2 * weighted) / (n * sum) - (n + 1) / n;
  }

  // Briefings contextuais por aba para o Co-Piloto flutuante
  const TAB_BRIEFS = {
    overview: 'Síntese Ultron: Teresina concentra ~26,5% da população e PIB per capita 37% superior à média estadual. O vetor crítico de longo prazo é desconcentrar serviços avançados e indústria verde para os 11 polos do interior.',
    geo: 'Síntese Geográfica: 82% do relevo abaixo de 600m favorece mecanização agrícola nos chapadões do sul e parques eólicos/solares de grande escala nas chapadas orientais e litoral.',
    demo: 'Síntese Demográfica: Crescimento demográfico moderado (+0,26% a.a.) exige ganhos de produtividade por trabalhador, já que o bônus puramente populacional está desacelerando.',
    territorios: 'Síntese Territorial: Os 12 Territórios de Desenvolvimento somam 224 municípios. Compare polos como Parnaíba, Picos, Floriano e Uruçuí para avaliar distâncias geodésicas e vocações complementares.',
    'geo-pol': 'Síntese Geopolítica: Crescimento acumulado expressivo desde 2002, porém alta dependência de transferências federais (~650 mil famílias). Infraestrutura portuária e ferroviária é decisiva para autonomia exportadora.',
    eco: 'Síntese Fiscal: Cumprimento dos limites da LRF (pessoal em 38,77%), mas a aceleração da Dívida Consolidada Líquida (R$ 10,93 bi; 61% da RCL) demanda retorno econômico efetivo dos investimentos.',
    energia: 'Síntese Energética: Matriz ~95% renovável posiciona o Piauí para cadeias de Hidrogênio Verde na ZPE Parnaíba e eletrointensivos, desde que sincronizada com linhas de transmissão e qualificação local.',
    edu: 'Síntese Educacional: Universalização do tempo integral na rede estadual (100% das escolas EM) e IDEB 4,5 (4º no país) formam a principal alavanca estrutural de produtividade futura.',
    idh: 'Síntese Social: Salto histórico de IDH desde 2000 (0,480 → 0,690), mas o Gini de 0,552 alerta que o crescimento econômico recente precisa alcançar municípios semiáridos de menor renda.',
    swot: 'Síntese SWOT: A combinação de energia limpa + educação integral é o diferencial competitivo; vulnerabilidade hídrica e endividamento relativo são os principais riscos a mitigar.',
    spia: 'Síntese SPIA: Mural demonstrativo de vídeos públicos externos. Para modelagem geoespacial e estocástica do Piauí, acione o Cockpit completo do Agente Ultron.',
    'eye-of-god': 'Síntese C4ISR: Interface tática demonstrativa em Canvas. Use o comando "ultron" no terminal ou alterne para a aba Ultron IA para análise socioeconômica e projeções 2025–2035.',
    ultron: 'Cockpit Ultron-X7 ativo: todos os 6 sub-agentes, o motor Monte Carlo (500 trajetórias) e o conector oficial IBGE estão prontos para consulta.',
    terminal: 'Síntese OSINT: O Agente Ultron indexa automaticamente as 50 publicações locais e feeds atualizados para identificar sinais em saúde, infraestrutura, educação e economia.',
    fontes: 'Síntese de Governança: Utilize o conector IBGE ao vivo no módulo Ultron para conferir os 224 municípios oficiais e a população Censo 2022 diretamente na API SIDRA.'
  };

  function initUltron() {
    const shell = $('#ult-shell');
    const tabPanel = $('#tab-ultron');

    // Inicializa Co-Piloto flutuante mesmo se estivermos fora da aba #tab-ultron
    setupGlobalCopilot();

    if (!shell || !tabPanel || shell.dataset.initialized === 'true') return;
    shell.dataset.initialized = 'true';

    const territories = window.PIAUI_TERRITORIES || [];
    const municipalities = window.PIAUI_MUNICIPALITIES || [];
    const reducedMotion = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    let sentinelActive = false;
    let voiceActive = false;
    let sentinelTimer = null;
    let rafId = null;
    let missionCount = 1;
    let ibgeCatalog = [];
    let ibgeVerified = null;
    let lastMcResult = null;
    let lastParetoResult = null;
    let sentinelIdx = 0;

    // Corredores logísticos principais (pares de municípios)
    const corridors = [
      ['Teresina', 'Campo Maior'],
      ['Campo Maior', 'Piripiri'],
      ['Piripiri', 'Parnaíba'],
      ['Parnaíba', 'Luís Correia'],
      ['Piripiri', 'Pedro II'],
      ['Teresina', 'Barras'],
      ['Barras', 'Esperantina'],
      ['Teresina', 'Altos'],
      ['Teresina', 'União'],
      ['Teresina', 'José de Freitas'],
      ['Teresina', 'Valença do Piauí'],
      ['Valença do Piauí', 'Picos'],
      ['Picos', 'Paulistana'],
      ['Picos', 'Oeiras'],
      ['Teresina', 'Floriano'],
      ['Floriano', 'Oeiras'],
      ['Floriano', 'Uruçuí'],
      ['Uruçuí', 'Bom Jesus'],
      ['Bom Jesus', 'Corrente'],
      ['Oeiras', 'São Raimundo Nonato']
    ];

    const structuralAnomalies = [
      { code: 'ALERTA MACRO-01 // PRIMAZIA URBANA', text: 'Teresina concentra 26,5% da população estadual em apenas 0,55% da área territorial (622,7 vs 13,0 hab/km²).' },
      { code: 'SINAL FISCAL-02 // TRAJETÓRIA DCL', text: 'Dívida Consolidada Líquida em R$ 10,93 bi (+30,65% vs 2024; 61% da RCL) exige maturação produtiva dos R$ 44,7 bi em investimentos.' },
      { code: 'SINERGIA VERDE-03 // ZPE + H₂', text: 'Geração ~95% limpa no interior pode acoplar-se ao Porto de Luís Correia e ZPE Parnaíba para exportação industrial.' },
      { code: 'VETOR HUMANO-04 // EDUCAÇÃO INTEGRAL', text: '100% das escolas estaduais de Ensino Médio em tempo integral e IDEB 4,5 criam janela de qualificação técnica em TI e agro.' },
      { code: 'ASSIMETRIA SOCIAL-05 // GINI 0,552', text: 'Apesar da queda histórica da pobreza, o índice de Gini em 0,552 aponta necessidade de inclusão produtiva no semiárido.' },
      { code: 'LOGÍSTICA SUL-06 // MATOPIBA', text: 'Uruçuí, Bom Jesus e Corrente expandem grãos no Cerrado, mas distam 453 a 845 km da capital, demandando eixos multimodais.' }
    ];

    // ==================== ÁUDIO SINTÉTICO & VOZ NEURAL ====================
    let audioCtx = null;
    function pulseTone(freq = 520, duration = 0.05) {
      if (!voiceActive) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      try {
        if (!audioCtx) audioCtx = new Ctx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0.03;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (_) {}
    }

    function speakText(text) {
      if (!voiceActive || !('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') return;
      try {
        window.speechSynthesis.cancel();
        const utter = new window.SpeechSynthesisUtterance(text);
        utter.lang = 'pt-BR';
        utter.rate = 1.08;
        window.speechSynthesis.speak(utter);
      } catch (_) {}
    }

    // ==================== ANIMAÇÃO DE SUB-AGENTES ====================
    function flashAgents(agentIds) {
      const nodes = $$('.ult-agent-node', shell);
      nodes.forEach(node => {
        const active = agentIds.includes(node.dataset.ultAgent);
        node.classList.toggle('working', active);
      });
      setTimeout(() => {
        nodes.forEach(node => node.classList.remove('working'));
      }, 900);
    }

    // ==================== MOTOR DE RACIOCÍNIO MULTI-AGENTE ====================
    function findMunicipalitiesInText(q) {
      return municipalities.filter(m => q.includes(normalize(m.name)));
    }

    function findTerritoriesInText(q) {
      return territories.filter(td => q.includes(normalize(td.name)) || q.includes(normalize(td.polo)) || q.includes(normalize(td.code)));
    }

    function computeMultiCriteriaTop(limit = 5) {
      if (!municipalities.length) return [];
      const maxPop = Math.max(...municipalities.map(m => m.pop2022));
      const maxArea = Math.max(...municipalities.map(m => m.areaKm2));
      return municipalities
        .map(m => {
          const popNorm = m.pop2022 / maxPop;
          const areaNorm = m.areaKm2 / maxArea;
          const hubBonus = territories.some(td => normalize(td.polo).includes(normalize(m.name))) ? 0.25 : 0;
          const score = Math.round((popNorm * 0.55 + areaNorm * 0.20 + hubBonus) * 100);
          return { ...m, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }

    function executeAgentReasoning(rawPrompt) {
      const t0 = Date.now();
      const q = normalize(rawPrompt).trim();
      const matchedCities = findMunicipalitiesInText(q);
      const matchedTds = findTerritoriesInText(q);

      // 1) Comparação entre 2+ municípios ou cálculo de distância/rota Dijkstra
      if (matchedCities.length >= 2 || ((q.includes('compar') || q.includes('distancia') || q.includes('rota') || q.includes('rodovia') || q.includes('dijkstra')) && matchedCities.length >= 1)) {
        const c1 = matchedCities[0] || municipalities[0];
        const c2 = matchedCities[1] || (c1.name === 'Teresina' ? municipalities[1] : municipalities[0]);
        const straightKm = haversineKm(c1.lat, c1.lon, c2.lat, c2.lon);
        const route = dijkstraCorridor(c1.name, c2.name);
        const roadEstKm = route ? route.totalKm : Math.round(straightKm * 1.24);
        const d1 = (c1.pop2022 / c1.areaKm2).toFixed(1).replace('.', ',');
        const d2 = (c2.pop2022 / c2.areaKm2).toFixed(1).replace('.', ',');
        const popRatio = (Math.max(c1.pop2022, c2.pop2022) / Math.max(1, Math.min(c1.pop2022, c2.pop2022))).toFixed(1).replace('.', ',');

        // Sincroniza também os seletores geodésicos do painel
        const selA = $('#ultCityA'), selB = $('#ultCityB');
        if (selA && selB) {
          selA.value = c1.name;
          selB.value = c2.name;
          updateHaversineReadout();
          renderGeoCanvas(Date.now());
        }

        const routeLine = route && route.path.length > 1
          ? `• Menor Corredor Viário (Dijkstra): ${route.totalKm} km via ${route.path.join(' → ')} [${route.roads.join(', ')}].`
          : `• Estimativa rodoviária: ~${roadEstKm} km.`;

        return {
          agents: ['geo', 'macro', 'prime'],
          trace: 'SUB-AGENTES [GEO-DIJKSTRA + HAVERSINE + SÍNTESE]',
          title: `Análise Geodésica, Rota Viária & Comparativa: ${c1.name} × ${c2.name}`,
          body: [
            `• Distância geodésica em linha reta (Haversine): ${straightKm.toFixed(1).replace('.', ',')} km.`,
            routeLine,
            `• ${c1.name} (${c1.territoryName} · ${c1.biome}): ${c1.pop2022.toLocaleString('pt-BR')} hab. em ${c1.areaKm2.toLocaleString('pt-BR')} km² (${d1} hab/km²) — ${c1.profile}.`,
            `• ${c2.name} (${c2.territoryName} · ${c2.biome}): ${c2.pop2022.toLocaleString('pt-BR')} hab. em ${c2.areaKm2.toLocaleString('pt-BR')} km² (${d2} hab/km²) — ${c2.profile}.`,
            `• Relação demográfica: razão de ${popRatio}x entre os dois polos (referência estática Censo 2022).`
          ].join('\n'),
          metrics: [
            `Haversine: ${straightKm.toFixed(1).replace('.', ',')} km`,
            `Dijkstra: ${roadEstKm} km`,
            `Códigos IBGE: ${c1.ibgeCode} / ${c2.ibgeCode}`
          ],
          elapsedMs: Math.max(1, Date.now() - t0)
        };
      }

      // 1b) Otimização de portfólio de investimentos (Pareto / Capex)
      if (/pareto|capex|aloca|otimiz|investimento|portfolio/.test(q)) {
        const pf = lastParetoResult || runParetoSimulation();
        return {
          agents: ['macro', 'energia', 'humano', 'prime'],
          trace: 'SUB-AGENTES [OTIMIZADOR PARETO + MACRO + TRANSIÇÃO VERDE]',
          title: `Portfólio Otimizado de Investimento: ${pf.regimeLabel} (R$ ${pf.budgetBi.toFixed(1).replace('.', ',')} BI)`,
          body: [
            ...pf.allocations.map(a => `• ${a.name}: ${a.sharePct}% (R$ ${a.amountMi.toLocaleString('pt-BR')} milhões)`),
            `• Índice sintético composto de impacto multidimensional: ${pf.compositeIndex}/100 (modelo exploratório de elasticidades).`
          ].join('\n'),
          metrics: [`Capex: R$ ${pf.budgetBi.toFixed(1)} BI`, `Score Pareto: ${pf.compositeIndex}/100`, `Eixos: 5`],
          elapsedMs: Math.max(1, Date.now() - t0)
        };
      }

      // 2) Risco fiscal, dívida, SEFAZ, LRF ou PIB
      if (/divida|fiscal|sefaz|lrf|receita|despesa|orcament/.test(q)) {
        return {
          agents: ['macro', 'prime'],
          trace: 'SUB-AGENTES [MACRO-FISCAL + SÍNTESE]',
          title: 'Diagnóstico de Sustentabilidade Fiscal & Dívida (SEFAZ-PI / LRF)',
          body: [
            '• Receitas brutas 2024: R$ 25,54 bi frente a despesas empenhadas de R$ 22,93 bi (superávit operacional reportado no painel).',
            '• Ponto de atenção crítico: a Dívida Consolidada Líquida atingiu R$ 10,93 bi em 2025 (+30,65% ante 2024), equivalente a 61% da RCL (6º maior endividamento relativo estadual, embora abaixo do teto legal da LRF).',
            '• Margem prudencial: despesa com pessoal em 38,77% da RCL (limite LRF: 49%), preservando capacidade de investimento público.',
            '• Diretriz Ultron: vincular novas operações de crédito estritamente a infraestrutura multiplicadora de arrecadação própria (logística, agroindústria e energia).'
          ].join('\n'),
          metrics: ['DCL/RCL: 61%', 'Pessoal: 38,77% RCL', 'Invest. 23–25: R$ 44,7 BI'],
          elapsedMs: Math.max(1, Date.now() - t0)
        };
      }

      // 3) Projeção Monte Carlo 2025-2035 / Futuro / Cenários
      if (/proje|2030|2035|monte carlo|estocastic|futuro|cenario/.test(q)) {
        const mc = lastMcResult || runMonteCarloSimulation();
        const end = mc.rows[mc.rows.length - 1];
        return {
          agents: ['macro', 'energia', 'humano', 'prime'],
          trace: 'SUB-AGENTES [MONTE CARLO 500x + ENERGIA + CAPITAL HUMANO]',
          title: `Projeção Estocástica 2025–2035 (${mc.paths} trajetórias simuladas)`,
          body: [
            `• Parâmetros ativos: crescimento real médio de ${(mc.drift * 100).toFixed(1).replace('.', ',')}% a.a. com volatilidade anual de ${(mc.vol * 100).toFixed(1).replace('.', ',')}% (modelo geométrico ilustrativo sobre base PIB ~R$ 89,8 bi em 2025).`,
            `• Horizonte 2035 — Banda Pessimista (P10): R$ ${end.p10.toFixed(1).replace('.', ',')} bi | Mediana (P50): R$ ${end.p50.toFixed(1).replace('.', ',')} bi | Banda Otimista (P90): R$ ${end.p90.toFixed(1).replace('.', ',')} bi.`,
            '• Aviso metodológico: simulação matemática exploratória para análise de sensibilidade; não representa previsão oficial do IBGE ou SEPLAN-PI.'
          ].join('\n'),
          metrics: [`2035 P10: R$ ${end.p10.toFixed(1)} BI`, `2035 P50: R$ ${end.p50.toFixed(1)} BI`, `2035 P90: R$ ${end.p90.toFixed(1)} BI`],
          elapsedMs: Math.max(1, Date.now() - t0)
        };
      }

      // 4) Energia, Hidrogênio Verde, Porto, Digital ou Matopiba
      if (/energia|eolica|solar|hidrogenio|h2|porto|luis correia|zpe|matopiba|soja|digital|fibra/.test(q)) {
        return {
          agents: ['energia', 'geo', 'prime'],
          trace: 'SUB-AGENTES [TRANSIÇÃO VERDE + GEO-TD + SÍNTESE]',
          title: 'Vetor Estratégico: Energia Limpa, H₂ Verde, Matopiba & Piauí Digital',
          body: [
            '• Matriz elétrica ~95% renovável (+2.500% de expansão 2013–2022), ancorada em complexos eólicos (Lagoa dos Ventos, Araripe, Chapada do Itaim) e solares (São Gonçalo do Gurguéia, Ribeiro Gonçalves).',
            '• Industrialização costeira: ZPE Parnaíba + Porto Piauí (Luís Correia) formam o nó logístico para cadeias de Hidrogênio Verde e amônia verde.',
            '• Fronteira Cerrado (Matopiba): Uruçuí, Bom Jesus e Corrente lideram grãos, exigindo integração pela Transcerrados, BR-135 e Ferrovia Transnordestina.',
            '• Malha digital: Piauí Conectado (224 municípios) e Piauí Saúde Digital reduzem custos de transação no interior.'
          ].join('\n'),
          metrics: ['Matriz limpa: ~95%', 'Expansão: +2.500%', 'Escopo óptico: 224 mun.'],
          elapsedMs: Math.max(1, Date.now() - t0)
        };
      }

      // 5) Educação, IDEB, IDH, Desigualdade
      if (/educa|ideb|idem|escola|integral|idh|gini|pobreza|social/.test(q)) {
        return {
          agents: ['humano', 'prime'],
          trace: 'SUB-AGENTES [CAPITAL HUMANO + SÍNTESE]',
          title: 'Convergência Educacional, IDH & Desigualdade (INEP / PNUD)',
          body: [
            '• Ensino Médio: nota 4,5 no IDEB/IDEM (1º no Nordeste e 4º no Brasil, subindo do 9º lugar em 2021), impulsionado por 100% das escolas estaduais em tempo integral integradas à educação profissional.',
            '• Alfabetização na capital: Teresina destaca-se nacionalmente no Indicador Criança Alfabetizada e IDHM histórico superior (0,751 em 2010).',
            '• Desenvolvimento Humano: transição de 0,480 (2000) para 0,690 (2021), reduzindo pela metade o hiato para a média nacional.',
            '• Gargalo estrutural: Gini em 0,552 e ~650 mil famílias dependentes de transferências exigem conexão direta entre ensino técnico e empregos formais.'
          ].join('\n'),
          metrics: ['IDEM: 4,5 (4º BR)', 'EM Integral: 100%', 'IDH: 0,480 → 0,690'],
          elapsedMs: Math.max(1, Date.now() - t0)
        };
      }

      // 6) Território específico ou bioma
      if (matchedTds.length || /territorio|bioma|caatinga|cerrado|cocais|semiarido|interior/.test(q)) {
        const td = matchedTds[0];
        if (td) {
          const cities = municipalities.filter(m => m.territory === td.id);
          return {
            agents: ['geo', 'prime'],
            trace: `SUB-AGENTES [GEO-TD ${td.code} + SÍNTESE]`,
            title: `${td.code} · Território ${td.name} (Polo: ${td.polo})`,
            body: [
              `• Abrangência: ${td.municipalitiesCount} municípios no bioma/zona ${td.biome}.`,
              `• Vocação produtiva: ${td.vocation}`,
              `• Logística estruturante: ${td.logistics}`,
              `• Desafio prioritário: ${td.challenge}`,
              `• Polos catalogados na amostra: ${cities.map(c => `${c.name} (${c.pop2022.toLocaleString('pt-BR')} hab.)`).join(', ') || td.polo}.`
            ].join('\n'),
            metrics: [`${td.municipalitiesCount} municípios`, `Polo: ${td.polo}`, `Bioma: ${td.biome}`],
            elapsedMs: Math.max(1, Date.now() - t0)
          };
        }
        const top = computeMultiCriteriaTop(5);
        return {
          agents: ['geo', 'macro', 'prime'],
          trace: 'SUB-AGENTES [RANKING MULTICRITÉRIO TOPSIS + GEO-TD]',
          title: 'Ranking Multicritério de Polos Estaduais (Escala, Área & Centralidade)',
          body: top.map((m, idx) => `${idx + 1}º ${m.name} (${m.territoryName} · ${m.biome}) — Score ${m.score}/100 · ${m.pop2022.toLocaleString('pt-BR')} hab.`).join('\n'),
          metrics: ['12 Territórios', '224 Municípios', 'Interior: 73,5% pop.'],
          elapsedMs: Math.max(1, Date.now() - t0)
        };
      }

      // 7) Notícias / OSINT
      if (/noticia|osint|ultim|saude|seguranca|agua|clima|chuva/.test(q)) {
        const news = window.PIAUI_NEWS || [];
        const terms = q.split(/\s+/).filter(w => w.length > 3 && !['noticias', 'noticia', 'ultimas', 'sobre', 'piaui'].includes(w));
        const hits = (terms.length
          ? news.filter(n => terms.some(t => normalize(`${n.title} ${n.category} ${n.source}`).includes(t)))
          : news).slice(0, 4);
        return {
          agents: ['osint', 'prime'],
          trace: `SUB-AGENTES [OSINT RADAR · ${news.length} PUBLICAÇÕES]`,
          title: 'Varredura de Sinais em Notícias do Piauí & Teresina',
          body: hits.length
            ? hits.map(n => `• [${n.date}] (${n.category} · ${n.source}) ${n.title}`).join('\n')
            : 'Nenhuma notícia específica para esse filtro na curadoria local; exibindo acervo geral na aba Terminal.',
          metrics: [`Base local: ${news.length} itens`, `Destaques: ${hits.length}`, 'Janela: 12 meses'],
          elapsedMs: Math.max(1, Date.now() - t0)
        };
      }

      // 8) Síntese Executiva Integral (Padrão)
      const top3 = computeMultiCriteriaTop(3);
      return {
        agents: ['macro', 'geo', 'energia', 'humano', 'osint', 'prime'],
        trace: 'ENXAME COMPLETO [6 SUB-AGENTES SINCRONIZADOS]',
        title: 'Diagnóstico Estratégico Integral — Ultron-X7 // Piauí & Teresina',
        body: [
          '1. Macro & Fiscal: PIB estadual de R$ 80,9 bi (+913,5% per capita acumulados 2002–2023), porém no 3º menor patamar per capita nacional (R$ 24.736) e DCL em 61% da RCL.',
          `2. Equilíbrio Territorial: 224 municípios em 12 TDs; polos líderes em centralidade composta: ${top3.map(c => `${c.name} (${c.score}/100)`).join(', ')}.`,
          '3. Alavancas Multiplicadoras: Acoplar 100% de Ensino Médio Integral (IDEB 4,5) + Matriz ~95% Renovável + Malha Óptica Estadual para industrialização verde (ZPE Parnaíba), agroindústria no Cerrado e serviços tecnológicos em Teresina.',
          'Dica: pergunte sobre comparações entre municípios (ex.: "Compare Teresina e Uruçuí"), "risco fiscal", "projeção 2035", "energia verde" ou "notícias de saúde".'
        ].join('\n'),
        metrics: ['PIB: R$ 80,9 BI', 'IDEM: 4,5 (4º BR)', 'Renovável: ~95%', '224 Municípios'],
        elapsedMs: Math.max(1, Date.now() - t0)
      };
    }

    function appendChatMessage(role, payload) {
      const log = $('#ultChatLog');
      if (!log) return;
      const box = document.createElement('article');
      box.className = `ult-msg ${role}`;
      if (role === 'user') {
        box.textContent = `operador@piaui-x7:~$ ${payload}`;
      } else {
        const trace = document.createElement('div');
        trace.className = 'ult-msg-trace';
        const s1 = document.createElement('span'); s1.textContent = payload.trace;
        const s2 = document.createElement('span'); s2.textContent = `${payload.elapsedMs} ms`;
        trace.append(s1, s2);

        const title = document.createElement('div');
        title.className = 'ult-msg-title';
        title.textContent = payload.title;

        const body = document.createElement('div');
        body.className = 'ult-msg-body';
        body.textContent = payload.body;

        const metrics = document.createElement('div');
        metrics.className = 'ult-msg-metrics';
        (payload.metrics || []).forEach(m => {
          const tag = document.createElement('span');
          tag.textContent = m;
          metrics.append(tag);
        });
        box.append(trace, title, body, metrics);
      }
      log.append(box);
      while (log.children.length > 30) log.firstElementChild.remove();
      log.scrollTop = log.scrollHeight;
    }

    function submitQuery(promptText) {
      const cleanPrompt = String(promptText || '').trim();
      if (!cleanPrompt) return;
      appendChatMessage('user', cleanPrompt);
      const response = executeAgentReasoning(cleanPrompt);
      missionCount++;
      const mEl = $('#ultMissionCounter');
      if (mEl) mEl.textContent = String(missionCount).padStart(3, '0');
      flashAgents(response.agents);
      pulseTone(640, 0.06);
      appendChatMessage('agent', response);
      speakText(`${response.title}. ${response.body.split('\n')[0]}`);
      return response;
    }

    window.ultronAsk = submitQuery;
    window.ultronReason = executeAgentReasoning;

    // ==================== CALCULADORA HAVERSINE & MAPA VETORIAL ====================
    function setupGeodesicModule() {
      const selA = $('#ultCityA');
      const selB = $('#ultCityB');
      const calcBtn = $('#ultSwapCities');
      const canvas = $('#ultGeoCanvas');
      if (!selA || !selB || !municipalities.length) return;

      municipalities.forEach(m => {
        selA.add(new Option(`${m.name} (${m.ibgeCode})`, m.name));
        selB.add(new Option(`${m.name} (${m.ibgeCode})`, m.name));
      });
      selA.value = 'Teresina';
      selB.value = 'Uruçuí';

      selA.addEventListener('change', () => { updateHaversineReadout(); renderGeoCanvas(Date.now()); });
      selB.addEventListener('change', () => { updateHaversineReadout(); renderGeoCanvas(Date.now()); });
      if (calcBtn) {
        calcBtn.addEventListener('click', () => {
          const tmp = selA.value; selA.value = selB.value; selB.value = tmp;
          updateHaversineReadout();
          renderGeoCanvas(Date.now());
        });
      }

      if (canvas) {
        canvas.addEventListener('click', event => {
          const rect = canvas.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
          const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
          let nearest = null;
          let bestDist = Infinity;
          municipalities.forEach(m => {
            const pt = projectCoord(m.lat, m.lon, canvas.width, canvas.height);
            const d = Math.hypot(pt.x - x, pt.y - y);
            if (d < bestDist) { bestDist = d; nearest = m; }
          });
          if (nearest && bestDist < 28) {
            selB.value = nearest.name;
            updateHaversineReadout();
            renderGeoCanvas(Date.now());
          }
        });
      }

      updateHaversineReadout();
    }

    function projectCoord(lat, lon, w, h) {
      // Limites geográficos aproximados do Piauí: lat [-2.7, -10.8], lon [-46.0, -40.7]
      const padX = 38, padY = 26;
      const x = padX + ((lon - (-46.0)) / (-40.7 - (-46.0))) * (w - padX * 2);
      const y = padY + ((-2.7 - lat) / (-2.7 - (-10.8))) * (h - padY * 2);
      return { x, y };
    }

    function updateHaversineReadout() {
      const out = $('#ultDistanceReadout');
      const selA = $('#ultCityA'), selB = $('#ultCityB');
      if (!out || !selA || !selB) return;
      const cA = municipalities.find(m => m.name === selA.value) || municipalities[0];
      const cB = municipalities.find(m => m.name === selB.value) || municipalities[1] || municipalities[0];
      if (!cA || !cB) return;
      const km = haversineKm(cA.lat, cA.lon, cB.lat, cB.lon);
      const route = dijkstraCorridor(cA.name, cB.name);
      const roadKm = route ? route.totalKm : Math.round(km * 1.24);
      out.replaceChildren();
      const strong = document.createElement('strong');
      strong.textContent = `${cA.name} ↔ ${cB.name}: ${km.toFixed(1).replace('.', ',')} km geodésicos`;
      const routeInfo = route && route.path.length > 1
        ? ` · Rota Dijkstra: ${roadKm} km via ${route.path.join(' → ')} [${route.roads.join(', ')}]`
        : ` (estimativa viária ~${roadKm} km)`;
      const detail = document.createTextNode(`${routeInfo} · coords [${cA.lat.toFixed(2)}°, ${cA.lon.toFixed(2)}°] → [${cB.lat.toFixed(2)}°, ${cB.lon.toFixed(2)}°]`);
      out.append(strong, detail);
    }

    function renderGeoCanvas(nowMs) {
      const canvas = $('#ultGeoCanvas');
      const ctx = safeCtx(canvas);
      if (!ctx || !municipalities.length) return;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Grade de coordenadas
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.07)';
      ctx.lineWidth = 1;
      for (let gx = 40; gx < w; gx += 60) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      }
      for (let gy = 30; gy < h; gy += 50) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }

      const byName = new Map(municipalities.map(m => [m.name, m]));

      // Corredores logísticos e pacotes ópticos
      corridors.forEach(([aName, bName], idx) => {
        const a = byName.get(aName), b = byName.get(bName);
        if (!a || !b) return;
        const p1 = projectCoord(a.lat, a.lon, w, h);
        const p2 = projectCoord(b.lat, b.lon, w, h);
        ctx.strokeStyle = 'rgba(0, 255, 65, 0.20)';
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

        if (sentinelActive) {
          const t = ((nowMs / 1800) + idx * 0.13) % 1;
          const px = p1.x + (p2.x - p1.x) * t;
          const py = p1.y + (p2.y - p1.y) * t;
          ctx.fillStyle = '#00f0ff';
          ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill();
        }
      });

      // Corredor rodoviário ótimo multi-saltos (Dijkstra)
      const selA = $('#ultCityA')?.value, selB = $('#ultCityB')?.value;
      const activeRoute = dijkstraCorridor(selA, selB);
      if (activeRoute && activeRoute.path.length > 1) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        activeRoute.path.forEach((cityName, idx) => {
          const city = byName.get(cityName);
          if (!city) return;
          const pt = projectCoord(city.lat, city.lon, w, h);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }

      // Vetor geodésico ativo
      const cA = byName.get(selA), cB = byName.get(selB);
      if (cA && cB && cA !== cB) {
        const pA = projectCoord(cA.lat, cA.lon, w, h);
        const pB = projectCoord(cB.lat, cB.lon, w, h);
        ctx.strokeStyle = '#ff2a5f';
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(pA.x, pA.y); ctx.lineTo(pB.x, pB.y); ctx.stroke();
      }

      // Nós dos 20 municípios
      municipalities.forEach(m => {
        const pt = projectCoord(m.lat, m.lon, w, h);
        const isSelected = m.name === selA || m.name === selB;
        const radius = m.name === 'Teresina' ? 6.5 : isSelected ? 5.5 : Math.max(3, Math.log10(m.pop2022) - 1.2);
        ctx.fillStyle = m.name === 'Teresina' ? '#ffb800' : isSelected ? '#ff2a5f' : '#00f0ff';
        ctx.beginPath(); ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2); ctx.fill();

        if (m.pop2022 >= 45000 || isSelected || m.name === 'Uruçuí' || m.name === 'Bom Jesus' || m.name === 'Corrente' || m.name === 'São Raimundo Nonato') {
          ctx.fillStyle = '#dcebff';
          ctx.font = '10px monospace';
          ctx.fillText(m.name, pt.x + 7, pt.y + 3);
        }
      });
    }

    // ==================== MOTOR ESTOCÁSTICO MONTE CARLO (2025–2035) ====================
    function runMonteCarloSimulation() {
      const driftEl = $('#ultMcDrift');
      const volEl = $('#ultMcVol');
      const pathsEl = $('#ultMcPaths');
      const driftPct = Number(driftEl?.value || 4.5);
      const volPct = Number(volEl?.value || 2.8);
      const paths = Number(pathsEl?.value || 500);
      const rows = computeMonteCarloSeries({ startVal: 89.8, years: 10, driftPct, volPct, paths });

      lastMcResult = { drift: driftPct / 100, vol: volPct / 100, paths, rows };
      renderMonteCarloUI(lastMcResult);
      return lastMcResult;
    }

    function renderMonteCarloUI(mc) {
      const end = mc.rows[mc.rows.length - 1];
      if ($('#ultMcP10')) $('#ultMcP10').textContent = `R$ ${end.p10.toFixed(1).replace('.', ',')} BI`;
      if ($('#ultMcP50')) $('#ultMcP50').textContent = `R$ ${end.p50.toFixed(1).replace('.', ',')} BI`;
      if ($('#ultMcP90')) $('#ultMcP90').textContent = `R$ ${end.p90.toFixed(1).replace('.', ',')} BI`;

      const tbody = $('#ultMcTableBody');
      if (tbody) {
        tbody.replaceChildren();
        mc.rows.forEach(r => {
          const tr = document.createElement('tr');
          [String(r.year), `R$ ${r.p10.toFixed(1).replace('.', ',')} BI`, `R$ ${r.p50.toFixed(1).replace('.', ',')} BI`, `R$ ${r.p90.toFixed(1).replace('.', ',')} BI`].forEach(txt => {
            const td = document.createElement('td');
            td.textContent = txt;
            tr.append(td);
          });
          tbody.append(tr);
        });
      }

      const canvas = $('#ultMonteCarloCanvas');
      const ctx = safeCtx(canvas);
      if (!ctx) return;
      const w = canvas.width, h = canvas.height;
      const padL = 48, padR = 20, padT = 22, padB = 28;
      ctx.clearRect(0, 0, w, h);

      const minVal = Math.min(...mc.rows.map(r => r.p10)) * 0.94;
      const maxVal = Math.max(...mc.rows.map(r => r.p90)) * 1.04;
      const xOf = i => padL + (i / (mc.rows.length - 1)) * (w - padL - padR);
      const yOf = v => padT + (1 - (v - minVal) / Math.max(1, maxVal - minVal)) * (h - padT - padB);

      // Grade horizontal
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      for (let g = 0; g <= 4; g++) {
        const val = minVal + ((maxVal - minVal) * g) / 4;
        const y = yOf(val);
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
        ctx.fillStyle = '#8fa6c4';
        ctx.font = '10px monospace';
        ctx.fillText(Math.round(val) + 'B', 6, y + 3);
      }

      // Área do cone P10–P90
      ctx.fillStyle = 'rgba(0, 240, 255, 0.13)';
      ctx.beginPath();
      mc.rows.forEach((r, i) => { const x = xOf(i), y = yOf(r.p90); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      for (let i = mc.rows.length - 1; i >= 0; i--) { ctx.lineTo(xOf(i), yOf(mc.rows[i].p10)); }
      ctx.closePath();
      ctx.fill();

      // Linhas P90, P50 e P10
      const drawSeries = (key, color, width) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        mc.rows.forEach((r, i) => {
          const x = xOf(i), y = yOf(r[key]);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      };
      drawSeries('p90', '#00f0ff', 1.6);
      drawSeries('p50', '#00ff41', 2.6);
      drawSeries('p10', '#ffb800', 1.6);

      // Rótulos de ano
      ctx.fillStyle = '#9bb2cf';
      ctx.font = '10px monospace';
      [0, 2, 5, 8, 10].forEach(idx => {
        const r = mc.rows[idx];
        if (r) ctx.fillText(String(r.year), xOf(idx) - 12, h - 8);
      });
    }

    // ==================== CONECTOR OFICIAL API IBGE (224 MUNICÍPIOS + SIDRA) ====================
    function renderIbgeList() {
      const box = $('#ultIbgeResults');
      const input = $('#ultIbgeSearchInput');
      if (!box) return;
      const q = normalize(input?.value || '').trim();
      const sourceList = ibgeCatalog.length
        ? ibgeCatalog
        : municipalities.map(m => ({ id: m.ibgeCode, nome: m.name, territorio: m.territoryName, pop: m.pop2022 }));

      const matches = sourceList.filter(item => !q || normalize(`${item.nome} ${item.id} ${item.territorio || ''}`).includes(q)).slice(0, 40);
      box.replaceChildren();
      matches.forEach(item => {
        const row = document.createElement('div');
        row.className = 'ult-ibge-row';
        const left = document.createElement('span');
        left.textContent = `${item.nome} (${item.id})`;
        const right = document.createElement('small');
        const popPart = item.pop ? `${Number(item.pop).toLocaleString('pt-BR')} hab.` : '';
        const pibPart = item.pibMil ? ` · PIB R$ ${(Number(item.pibMil) / 1000).toFixed(1).replace('.', ',')} mi` : '';
        right.textContent = (popPart || pibPart) ? `${popPart}${pibPart}` : (item.territorio || 'IBGE Oficial');
        row.append(left, right);
        box.append(row);
      });
    }

    async function syncIbgeLive() {
      const statusEl = $('#ultIbgeStatus');
      const badgeEl = $('#ultIbgeBadge');
      if (!statusEl) return;
      if (typeof fetch !== 'function') {
        statusEl.textContent = 'API fetch indisponível neste ambiente. Mantendo catálogo local de 20 municípios.';
        return;
      }
      statusEl.textContent = 'Consultando API oficial servicodados.ibge.gov.br (UF 22 — 224 municípios + SIDRA)…';
      flashAgents(['geo', 'macro']);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 14000);
      try {
        const [munRes, sidraRes, pibRes] = await Promise.all([
          fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/22/municipios?orderBy=nome', { signal: controller.signal }),
          fetch('https://servicodados.ibge.gov.br/api/v3/agregados/4714/periodos/2022/variaveis/93?localidades=N3[22]|N6[N3[22]]', { signal: controller.signal }),
          fetch('https://servicodados.ibge.gov.br/api/v3/agregados/5938/periodos/-1/variaveis/37?localidades=N6[N3[22]]', { signal: controller.signal }).catch(() => null)
        ]);
        if (!munRes.ok) throw new Error('HTTP ' + munRes.status);
        const munData = await munRes.json();
        if (!Array.isArray(munData) || !munData.length) throw new Error('Lista vazia');

        const sidraPopMap = new Map();
        let piPop = null;
        if (sidraRes && sidraRes.ok) {
          const sidraJson = await sidraRes.json();
          const serieList = sidraJson?.[0]?.resultados?.[0]?.series || [];
          serieList.forEach(entry => {
            const locId = String(entry.localidade?.id || '');
            const val2022 = Number(entry.serie?.['2022']);
            if (!Number.isFinite(val2022) || val2022 <= 0) return;
            if (locId === '22') piPop = val2022;
            else sidraPopMap.set(locId, val2022);
          });
        }

        const sidraPibMap = new Map();
        if (pibRes && pibRes.ok) {
          try {
            const pibJson = await pibRes.json();
            const pibSeries = pibJson?.[0]?.resultados?.[0]?.series || [];
            pibSeries.forEach(entry => {
              const locId = String(entry.localidade?.id || '');
              const vals = Object.values(entry.serie || {});
              const latest = Number(vals[vals.length - 1]);
              if (locId && Number.isFinite(latest) && latest > 0) sidraPibMap.set(locId, latest);
            });
          } catch (_) {}
        }

        const localByCode = new Map(municipalities.map(m => [String(m.ibgeCode), m]));
        ibgeCatalog = munData.map(item => {
          const code = String(item.id);
          const local = localByCode.get(code);
          const regImediata = item['regiao-imediata']?.nome || item.microrregiao?.nome || 'Piauí';
          return {
            id: code,
            nome: String(item.nome),
            territorio: local ? local.territoryName : `Reg. ${regImediata}`,
            pop: sidraPopMap.get(code) || (local ? local.pop2022 : null),
            pibMil: sidraPibMap.get(code) || null
          };
        });

        let sidraSummary = '';
        const thePop = sidraPopMap.get('2211001');
        if (piPop && thePop) {
          const popVals = ibgeCatalog.map(c => c.pop).filter(Boolean);
          const giniMun = popVals.length >= 20 ? computeGini(popVals) : null;
          ibgeVerified = { piPop, thePop, giniMun, syncedCount: ibgeCatalog.length };
          const giniTxt = giniMun ? ` · Gini demográfico municipal (${popVals.length} mun.): ${giniMun.toFixed(3).replace('.', ',')}` : '';
          sidraSummary = ` · Censo 2022 SIDRA: PI = ${piPop.toLocaleString('pt-BR')} hab. | Teresina = ${thePop.toLocaleString('pt-BR')} hab.${giniTxt}.`;
        }

        if (badgeEl) {
          badgeEl.textContent = `${ibgeCatalog.length} MUN. AO VIVO`;
          badgeEl.className = 'ok';
        }
        statusEl.textContent = `Sincronizado com o IBGE: ${ibgeCatalog.length} municípios oficiais carregados${sidraSummary}`;
        renderIbgeList();
      } catch (_) {
        statusEl.textContent = 'Sem conexão direta à API do IBGE no momento. Operando com base estática verificável de 20 polos.';
        renderIbgeList();
      } finally {
        clearTimeout(timer);
      }
    }

    // ==================== OTIMIZADOR PARETO & GRÁFICO RADAR ====================
    function runParetoSimulation() {
      const budgetBi = Number($('#ultCapexTotal')?.value || 5.0);
      const regime = $('#ultCapexRegime')?.value || 'pareto';
      lastParetoResult = optimizeParetoPortfolio({ budgetBi, regime });
      renderParetoUI(lastParetoResult);
      return lastParetoResult;
    }

    function renderParetoUI(pf) {
      if ($('#ultParetoScore')) {
        $('#ultParetoScore').textContent = `${pf.compositeIndex} / 100`;
      }
      const tbody = $('#ultParetoTableBody');
      if (tbody) {
        tbody.replaceChildren();
        pf.allocations.forEach(item => {
          const tr = document.createElement('tr');
          [item.name, `${item.sharePct}%`, `R$ ${item.amountMi.toLocaleString('pt-BR')} mi`].forEach(val => {
            const td = document.createElement('td');
            td.textContent = val;
            tr.append(td);
          });
          tbody.append(tr);
        });
      }

      const canvas = $('#ultParetoCanvas');
      const ctx = safeCtx(canvas);
      if (!ctx || !canvas) return;
      const w = canvas.width, h = canvas.height;
      const cx = w / 2, cy = h / 2 + 6;
      const maxR = Math.min(w, h) * 0.34;
      ctx.clearRect(0, 0, w, h);

      const n = pf.radarScores.length;
      const angleOf = i => -Math.PI / 2 + (i * 2 * Math.PI) / n;

      // Teias pentagonais concêntricas
      [0.25, 0.5, 0.75, 1.0].forEach(level => {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const ang = angleOf(i);
          const x = cx + Math.cos(ang) * maxR * level;
          const y = cy + Math.sin(ang) * maxR * level;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      });

      // Eixos radiais e rótulos
      pf.radarScores.forEach((item, i) => {
        const ang = angleOf(i);
        const xEnd = cx + Math.cos(ang) * maxR;
        const yEnd = cy + Math.sin(ang) * maxR;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(xEnd, yEnd); ctx.stroke();

        const lx = cx + Math.cos(ang) * (maxR + 24);
        const ly = cy + Math.sin(ang) * (maxR + 16);
        ctx.fillStyle = '#dcebff';
        ctx.font = '10px monospace';
        ctx.fillText(`${item.dimension} (${item.score})`, lx - 42, ly + 3);
      });

      // Polígono de referência base
      ctx.fillStyle = 'rgba(0, 240, 255, 0.10)';
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      pf.radarScores.forEach((item, i) => {
        const ang = angleOf(i);
        const r = (item.baseline / 100) * maxR;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Polígono otimizado Ultron-Pareto
      ctx.fillStyle = 'rgba(255, 34, 87, 0.22)';
      ctx.strokeStyle = '#ff2257';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      pf.radarScores.forEach((item, i) => {
        const ang = angleOf(i);
        const r = (item.score / 100) * maxR;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // ==================== RADAR DE ANOMALIAS & SENTINELA AUTÔNOMO ====================
    function pushAnomaly(item) {
      const list = $('#ultAnomalyList');
      if (!list) return;
      const div = document.createElement('div');
      div.className = 'ult-anomaly-item';
      const b = document.createElement('b');
      b.textContent = item.code;
      const span = document.createElement('span');
      span.textContent = item.text;
      div.append(b, span);
      list.prepend(div);
      while (list.children.length > 8) list.lastElementChild.remove();
    }

    function toggleSentinel() {
      sentinelActive = !sentinelActive;
      shell.classList.toggle('sentinel-active', sentinelActive);
      const btn = $('#ultSentinelBtn');
      const status = $('#ultModeBadge');
      if (btn) {
        btn.setAttribute('aria-pressed', String(sentinelActive));
        btn.textContent = sentinelActive ? '⚡ SENTINELA: ATIVO' : '⚡ MODO SENTINELA';
      }
      if (status) {
        status.textContent = sentinelActive ? 'SENTINELA AUTÔNOMO' : 'ANALÍTICO SOB DEMANDA';
        status.className = sentinelActive ? 'hot' : 'ok';
      }
      if (sentinelActive) {
        pulseTone(780, 0.08);
        if (!sentinelTimer) {
          sentinelTimer = window.setInterval(() => {
            if (!tabPanel.classList.contains('active') || document.hidden || !sentinelActive) return;
            const td = territories[sentinelIdx % territories.length];
            sentinelIdx++;
            if (td) {
              pushAnomaly({
                code: `VARREDURA ${td.code} // ${td.name.toUpperCase()}`,
                text: `Polo ${td.polo} (${td.municipalitiesCount} mun. · ${td.biome}): ${td.challenge}`
              });
            }
          }, 4200);
        }
        startGeoLoop();
      }
    }

    function startGeoLoop() {
      if (rafId || reducedMotion || typeof window.requestAnimationFrame !== 'function') {
        renderGeoCanvas(Date.now());
        return;
      }
      const step = () => {
        if (!sentinelActive || !tabPanel.classList.contains('active') || document.hidden) {
          rafId = null;
          renderGeoCanvas(Date.now());
          return;
        }
        renderGeoCanvas(Date.now());
        rafId = window.requestAnimationFrame(step);
      };
      rafId = window.requestAnimationFrame(step);
    }

    // ==================== GERADOR DE DOSSIÊ EXECUTIVO (.MD / .JSON / .PNG) ====================
    function triggerDownload(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function exportExecutiveDossier() {
      const mc = lastMcResult || runMonteCarloSimulation();
      const pf = lastParetoResult || runParetoSimulation();
      const end = mc.rows[mc.rows.length - 1];
      const selA = $('#ultCityA')?.value || 'Teresina';
      const selB = $('#ultCityB')?.value || 'Uruçuí';
      const cA = municipalities.find(m => m.name === selA) || municipalities[0];
      const cB = municipalities.find(m => m.name === selB) || municipalities[1] || municipalities[0];
      const distKm = cA && cB ? haversineKm(cA.lat, cA.lon, cB.lat, cB.lon).toFixed(1) : '0.0';
      const route = dijkstraCorridor(selA, selB);

      const md = [
        '# DOSSIÊ ESTRATÉGICO ULTRON-X7 v2.0 — PIAUÍ & TERESINA ANALYTICS',
        `Gerado em: ${new Date().toISOString()}`,
        '',
        '> **Aviso de Governança:** Este relatório sintetiza indicadores estáticos e simulações matemáticas exploratórias do painel `x2PiauiAnalitcsX7`. Confira sempre as tabelas primárias no IBGE, INEP, SEFAZ-PI, PNUD e ANEEL antes de qualquer decisão oficial.',
        '',
        '## 1. Indicadores-Chave Estaduais e da Capital',
        '- **População Censo 2022 (IBGE):** Piauí 3.271.199 hab. | Teresina 866.300 hab. (~26,5%)',
        '- **Área Territorial:** 251.755 km² (224 municípios em 12 Territórios de Desenvolvimento)',
        '- **PIB Estadual (ref. 2023):** R$ 80,9 bilhões | PIB per capita PI: R$ 24.736 | Teresina: R$ 33.994',
        '- **Finanças Públicas:** DCL R$ 10,93 bi (61% da RCL) | Despesa com pessoal: 38,77% da RCL',
        '- **Educação & Capital Humano:** IDEB Ensino Médio 4,5 (4º no Brasil) | 100% escolas estaduais EM em tempo integral',
        '- **Matriz Elétrica:** ~95% renovável (eólica, solar e hídrica)',
        ibgeVerified ? `- **Auditoria API IBGE SIDRA na sessão:** PI = ${ibgeVerified.piPop.toLocaleString('pt-BR')} | Teresina = ${ibgeVerified.thePop.toLocaleString('pt-BR')}` : '- **Auditoria API IBGE SIDRA:** não executada nesta sessão (modo local)',
        '',
        `## 2. Vetor Geodésico & Rota Viária (${selA} ↔ ${selB})`,
        `- Distância em linha reta (Haversine): **${distKm} km**`,
        route && route.path.length > 1
          ? `- Menor corredor rodoviário (Dijkstra): **${route.totalKm} km** via ${route.path.join(' → ')} (${route.roads.join(', ')})`
          : `- Estimativa rodoviária: ~${Math.round(Number(distKm) * 1.24)} km`,
        '',
        `## 3. Portfólio Otimizado de Investimento (${pf.regimeLabel} · R$ ${pf.budgetBi.toFixed(1)} BI)`,
        ...pf.allocations.map(a => `- **${a.name}:** ${a.sharePct}% (R$ ${a.amountMi.toLocaleString('pt-BR')} milhões)`),
        `- **Score Composto Multidimensional:** ${pf.compositeIndex}/100`,
        '',
        `## 4. Simulação Estocástica Monte Carlo (${mc.paths} trajetórias · 2025–2035)`,
        `- Crescimento real médio assumido: ${(mc.drift * 100).toFixed(1)}% a.a. | Volatilidade: ${(mc.vol * 100).toFixed(1)}% a.a.`,
        `- **2035 P10 (Pessimista):** R$ ${end.p10.toFixed(1)} BI`,
        `- **2035 P50 (Mediana):** R$ ${end.p50.toFixed(1)} BI`,
        `- **2035 P90 (Otimista):** R$ ${end.p90.toFixed(1)} BI`,
        '',
        '| Ano | Banda P10 | Mediana P50 | Banda P90 |',
        '| --- | --- | --- | --- |',
        ...mc.rows.map(r => `| ${r.year} | R$ ${r.p10.toFixed(1)} BI | R$ ${r.p50.toFixed(1)} BI | R$ ${r.p90.toFixed(1)} BI |`),
        ''
      ].join('\r\n');

      triggerDownload(new Blob([md], { type: 'text/markdown;charset=utf-8' }), 'dossie-estrategico-ultron-piaui.md');
      appendChatMessage('agent', {
        trace: 'EXPORTADOR EXECUTIVO ULTRON-X7',
        title: 'Dossiê Estratégico Markdown (.md) compilado com sucesso',
        body: `Relatório gerado com vetor ${selA} ↔ ${selB}, portfólio Pareto (${pf.compositeIndex}/100) e série Monte Carlo 2025–2035.`,
        metrics: ['Formato: Markdown', `Trajetórias: ${mc.paths}`, `Score Pareto: ${pf.compositeIndex}/100`],
        elapsedMs: 2
      });
    }

    function exportExecutiveJson() {
      const mc = lastMcResult || runMonteCarloSimulation();
      const pf = lastParetoResult || runParetoSimulation();
      const selA = $('#ultCityA')?.value || 'Teresina';
      const selB = $('#ultCityB')?.value || 'Uruçuí';
      const cA = municipalities.find(m => m.name === selA) || municipalities[0];
      const cB = municipalities.find(m => m.name === selB) || municipalities[1] || municipalities[0];
      const payload = {
        generatedAt: new Date().toISOString(),
        engine: 'ULTRON-X7-OMEGA-v2.0',
        notice: 'Simulações exploratórias e base estática sujeitas a conferência oficial.',
        geodesicPair: {
          origin: selA,
          destination: selB,
          haversineKm: cA && cB ? Number(haversineKm(cA.lat, cA.lon, cB.lat, cB.lon).toFixed(2)) : 0,
          dijkstraCorridor: dijkstraCorridor(selA, selB)
        },
        paretoPortfolio: pf,
        monteCarlo2025_2035: mc,
        ibgeSessionAudit: ibgeVerified,
        topPolesMultiCriteria: computeMultiCriteriaTop(10)
      };
      triggerDownload(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }), 'ultron-x7-piaui-telemetria.json');
      appendChatMessage('agent', {
        trace: 'EXPORTADOR JSON ESTRUTURADO',
        title: 'Pacote Analítico JSON (.json) exportado com sucesso',
        body: 'Arquivo JSON contendo rota Dijkstra, matriz Haversine, portfólio Pareto, cone Monte Carlo e ranking TOPSIS.',
        metrics: ['Formato: JSON', 'Polos: 20', 'Horizonte: 2035'],
        elapsedMs: 2
      });
    }

    function exportVisualSnapshot() {
      const geoCanvas = $('#ultGeoCanvas');
      let dataUrl = '';
      if (geoCanvas && typeof geoCanvas.toDataURL === 'function') {
        try { dataUrl = geoCanvas.toDataURL('image/png'); } catch (_) {}
      }
      if (dataUrl && dataUrl.startsWith('data:image/png')) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'ultron-x7-malha-geodesica.png';
        document.body.append(a);
        a.click();
        a.remove();
      } else {
        exportExecutiveJson();
        return;
      }
      appendChatMessage('agent', {
        trace: 'CAPTURA VISUAL CANVAS',
        title: 'Snapshot Vetorial (.png) exportado',
        body: 'Imagem PNG da malha geodésica e corredor rodoviário ótimo baixada no navegador.',
        metrics: ['Formato: PNG', 'Canvas: 520×310'],
        elapsedMs: 1
      });
    }

    // ==================== EVENTOS DE INTERFACE ====================
    const form = $('#ultChatForm');
    const input = $('#ultChatInput');
    if (form && input) {
      form.addEventListener('submit', event => {
        event.preventDefault();
        const val = input.value;
        input.value = '';
        submitQuery(val);
      });
    }

    $$('[data-ult-prompt]', shell).forEach(chip => {
      chip.addEventListener('click', () => submitQuery(chip.dataset.ultPrompt));
    });

    if ($('#ultSentinelBtn')) $('#ultSentinelBtn').addEventListener('click', toggleSentinel);
    if ($('#ultVoiceBtn')) {
      $('#ultVoiceBtn').addEventListener('click', () => {
        voiceActive = !voiceActive;
        $('#ultVoiceBtn').setAttribute('aria-pressed', String(voiceActive));
        $('#ultVoiceBtn').textContent = voiceActive ? '🔊 VOZ IA: ON' : '🔇 VOZ IA: OFF';
        if (!voiceActive && 'speechSynthesis' in window) {
          try { window.speechSynthesis.cancel(); } catch (_) {}
        } else {
          pulseTone(660, 0.06);
        }
      });
    }
    if ($('#ultExportDossierBtn')) $('#ultExportDossierBtn').addEventListener('click', exportExecutiveDossier);
    if ($('#ultExportJsonBtn')) $('#ultExportJsonBtn').addEventListener('click', exportExecutiveJson);
    if ($('#ultSnapshotBtn')) $('#ultSnapshotBtn').addEventListener('click', exportVisualSnapshot);
    if ($('#ultRunMcBtn')) $('#ultRunMcBtn').addEventListener('click', () => { runMonteCarloSimulation(); pulseTone(580, 0.05); });
    ['#ultMcDrift', '#ultMcVol', '#ultMcPaths'].forEach(sel => {
      const el = $(sel);
      if (el) el.addEventListener('change', runMonteCarloSimulation);
    });
    ['#ultCapexTotal', '#ultCapexRegime'].forEach(sel => {
      const el = $(sel);
      if (el) el.addEventListener('change', runParetoSimulation);
    });
    if ($('#ultSyncIbgeBtn')) $('#ultSyncIbgeBtn').addEventListener('click', syncIbgeLive);
    if ($('#ultIbgeSearchInput')) $('#ultIbgeSearchInput').addEventListener('input', renderIbgeList);

    // Inicialização de estado inicial
    structuralAnomalies.slice().reverse().forEach(pushAnomaly);
    setupGeodesicModule();
    runMonteCarloSimulation();
    runParetoSimulation();
    renderIbgeList();
    renderGeoCanvas(Date.now());

    // Mensagem inicial do Orquestrador
    appendChatMessage('agent', executeAgentReasoning('diagnostico integral'));

    document.addEventListener('dashboard:tabchange', event => {
      if (event.detail === 'ultron') {
        renderGeoCanvas(Date.now());
        if (lastMcResult) renderMonteCarloUI(lastMcResult);
        if (lastParetoResult) renderParetoUI(lastParetoResult);
        if (sentinelActive) startGeoLoop();
      }
    });
  }

  function setupGlobalCopilot() {
    const fab = $('#ultronFab');
    const drawer = $('#ultronCopilotDrawer');
    const closeBtn = $('#ultCloseDrawer') || $('#ultronCopilotClose');
    const ctxEl = $('#ultDrawerContext') || $('#ultronCopilotBrief');
    const logEl = $('#ultDrawerLog');
    const formEl = $('#ultDrawerForm');
    const inputEl = $('#ultDrawerInput');
    if (!fab || !drawer || fab.dataset.bound === 'true') return;
    fab.dataset.bound = 'true';

    let currentTab = (location.hash || '#overview').slice(1) || 'overview';

    function pushDrawerNote(role, content) {
      if (!logEl) return;
      const div = document.createElement('div');
      div.className = `ult-msg ${role === 'user' ? 'user' : 'agent'}`;
      if (typeof content === 'string') {
        div.textContent = content;
      } else {
        const title = document.createElement('div');
        title.className = 'ult-msg-title';
        title.textContent = content.title;
        const body = document.createElement('div');
        body.className = 'ult-msg-body';
        body.textContent = content.body;
        div.append(title, body);
      }
      logEl.append(div);
      while (logEl.children.length > 20) logEl.firstElementChild.remove();
      logEl.scrollTop = logEl.scrollHeight;
    }

    function updateBrief(tabName) {
      currentTab = tabName || 'overview';
      if (ctxEl) {
        ctxEl.textContent = `Contexto ativo: ${currentTab.toUpperCase()}`;
      }
      if (logEl && !logEl.children.length) {
        pushDrawerNote('agent', TAB_BRIEFS[currentTab] || TAB_BRIEFS.overview);
      }
    }

    function toggleDrawer(forceOpen) {
      const open = typeof forceOpen === 'boolean' ? forceOpen : drawer.hidden;
      drawer.hidden = !open;
      fab.setAttribute('aria-expanded', String(open));
      if (open) {
        updateBrief(currentTab);
        if (inputEl) inputEl.focus();
      }
    }

    fab.addEventListener('click', () => toggleDrawer());
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        toggleDrawer(false);
        fab.focus();
      });
    }

    if (formEl && inputEl) {
      formEl.addEventListener('submit', event => {
        event.preventDefault();
        const q = inputEl.value.trim();
        if (!q) return;
        inputEl.value = '';
        pushDrawerNote('user', q);
        if (typeof window.ultronReason === 'function') {
          pushDrawerNote('agent', window.ultronReason(q));
        } else {
          pushDrawerNote('agent', TAB_BRIEFS[currentTab] || TAB_BRIEFS.overview);
        }
      });
    }

    document.addEventListener('keydown', event => {
      if (event.altKey && event.key.toLowerCase() === 'u') {
        event.preventDefault();
        toggleDrawer();
      }
    });

    document.addEventListener('dashboard:tabchange', event => {
      currentTab = event.detail || 'overview';
      if (ctxEl) ctxEl.textContent = `Contexto ativo: ${currentTab.toUpperCase()}`;
      if (!drawer.hidden) {
        pushDrawerNote('agent', TAB_BRIEFS[currentTab] || TAB_BRIEFS.overview);
      }
    });
    updateBrief(currentTab);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUltron, { once: true });
  } else {
    initUltron();
  }
})();

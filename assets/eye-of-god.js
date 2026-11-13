/**
 * S.P.I.A. · EYE OF GOD // PALANTIR MATRIX ENGINE
 * Módulo demonstrativo isolado na aba #tab-eye-of-god.
 */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function safeCtx(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') return null;
    try {
      return canvas.getContext('2d');
    } catch (_) {
      return null;
    }
  }

  function initEyeOfGod() {
    const tabPanel = document.getElementById('tab-eye-of-god');
    const shell = document.getElementById('eog-hud-shell');
    if (!tabPanel || !shell || shell.dataset.initialized === 'true') return;
    shell.dataset.initialized = 'true';

    // ==================== ESTADO & DADOS SIMULADOS ====================
    const camerasDB = [
      {
        id: 'CAM-01',
        loc: 'Pte. Estaiada / Av. Raul Lopes',
        zone: 'ZL',
        targetId: 'ALVO #01: VEÍCULO / INDIVÍDUO IDENTIFICADO',
        plate: 'PIU-8B42',
        model: 'Toyota Hilux Prata',
        confidence: '98.9%',
        route: 'Sentido Norte (68 km/h)',
        unit: 'RONE-04',
        imei: 'IMEI 8642...19'
      },
      {
        id: 'CAM-02',
        loc: 'Av. Frei Serafim / São Benedito',
        zone: 'CT',
        targetId: 'ALVO #02: MONITORAMENTO CORREDOR CENTRAL',
        plate: 'NHW-4E19',
        model: 'Honda Civic Preto',
        confidence: '96.4%',
        route: 'Sentido Centro (52 km/h)',
        unit: 'BOPE-01',
        imei: 'IMEI 3590...44'
      },
      {
        id: 'CAM-03',
        loc: 'Terminal Mocambinho (Norte)',
        zone: 'ZN',
        targetId: 'ALVO #03: CERCO ZONA NORTE',
        plate: 'QRT-9A71',
        model: 'Fiat Toro Branca',
        confidence: '94.7%',
        route: 'Av. Duque de Caxias (44 km/h)',
        unit: 'FT-ZN-02',
        imei: 'IMEI 4912...83'
      },
      {
        id: 'CAM-04',
        loc: 'Grande Dirceu / Av. Principal',
        zone: 'ZSE',
        targetId: 'ALVO #04: VARREDURA SUDESTE',
        plate: 'PIJ-2C88',
        model: 'VW Gol Cinza',
        confidence: '97.1%',
        route: 'Sentido Sudeste (61 km/h)',
        unit: 'RONE-02',
        imei: 'IMEI 7105...62'
      },
      {
        id: 'CAM-05',
        loc: 'Ponte Metálica / Divisa Timon',
        zone: 'ZO',
        targetId: 'ALVO #05: PONTO DE DIVISA INTERESTADUAL',
        plate: 'OXZ-7D05',
        model: 'Honda XRE 300',
        confidence: '95.8%',
        route: 'Travessia Piauí-MA (74 km/h)',
        unit: 'BPTRAN-07',
        imei: 'IMEI 2284...05'
      },
      {
        id: 'CAM-06',
        loc: 'Aeroporto Sen. Petrônio Portella',
        zone: 'ZN',
        targetId: 'ALVO #06: PERÍMETRO AEROPORTUÁRIO',
        plate: 'LVX-5F30',
        model: 'Chevrolet Tracker Azul',
        confidence: '99.1%',
        route: 'Área de Embarque (28 km/h)',
        unit: 'CICC-AIR',
        imei: 'IMEI 9031...71'
      }
    ];

    const modeLabels = {
      OPTICAL: 'ÓPTICA HUD',
      FLIR: 'TÉRMICA FLIR',
      NVG: 'NOTURNA NVG',
      LIDAR: 'LIDAR 3D',
      NEURAL: 'FLUXO IA',
      SAR: 'ORBITAL SAR'
    };

    const sampleEvents = [
      { text: 'LPR: Placa PIU-8B42 com restrição em ZL', crit: true },
      { text: 'FACE-RECON: 98.9% compatibilidade em CAM-01', crit: true },
      { text: 'SST: Disparo acústico descartado (Ruído Urbano)', crit: false },
      { text: 'DRONE-02: Decolagem autorizada pelo CICC', crit: false },
      { text: 'SAR-ORBITAL: Varredura da Bacia do Parnaíba concluída', crit: false }
    ];

    const radarTargets = [
      { x: 118, y: 82, id: 'TGT-01', host: true },
      { x: 224, y: 142, id: 'RONE-04', host: false },
      { x: 84, y: 176, id: 'TGT-02', host: true },
      { x: 256, y: 68, id: 'BOPE-01', host: false }
    ];

    let activeCamMode = 'OPTICAL';
    let focusedCamIdx = 0;
    let soundEnabled = true;
    let lockdownActive = false;
    let targetLocked = false;
    let droneDispatched = false;
    let customTargetLabel = null;
    let audioCtx = null;
    let rafId = null;
    let clockTimer = null;
    let eventTimer = null;
    let lastSpecTime = 0;
    let lastTelemetryTime = 0;
    const cmdHistory = [];
    let historyPos = -1;

    const reducedMotion = Boolean(
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    // ==================== 1. ÁUDIO TÁTICO (Web Audio API) ====================
    function playTacticalSound(freq = 880, type = 'sine', duration = 0.06, vol = 0.04) {
      if (!soundEnabled) return;
      const AudioConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioConstructor) return;
      try {
        if (!audioCtx) audioCtx = new AudioConstructor();
        if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
          audioCtx.resume().catch(() => {});
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (_) {}
    }

    const audioBtn = document.getElementById('eog-audio-toggle');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        audioBtn.textContent = soundEnabled ? '🔊 AUDIO: ON' : '🔇 AUDIO: OFF';
        audioBtn.setAttribute('aria-pressed', String(soundEnabled));
        if (soundEnabled) playTacticalSound(1200, 'square', 0.1);
      });
    }

    // ==================== 2. TERMINAL CLI KERNEL ====================
    const termBody = document.getElementById('eog-terminal-body');
    const termInput = document.getElementById('eog-terminal-input');

    function printTerminal(msg, type = 'output') {
      if (!termBody) return;
      const line = document.createElement('div');
      line.className = `eog-term-line ${type}`;
      line.textContent = `> ${msg}`;
      termBody.appendChild(line);
      while (termBody.children.length > 80) {
        termBody.firstElementChild.remove();
      }
      termBody.scrollTop = termBody.scrollHeight;
    }

    // ==================== 3. FEED DE EVENTOS TÁTICOS ====================
    const eventFeedContainer = document.getElementById('eog-event-feed-container');

    function formatFortalezaTime(date, withMs = false) {
      try {
        const parts = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Fortaleza',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).formatToParts(date);
        const get = t => (parts.find(p => p.type === t) || {}).value || '00';
        const base = `${get('hour')}:${get('minute')}:${get('second')}`;
        return withMs ? `${base}.${String(date.getMilliseconds()).padStart(3, '0')}` : base;
      } catch (_) {
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        return withMs ? `${h}:${m}:${s}.${String(date.getMilliseconds()).padStart(3, '0')}` : `${h}:${m}:${s}`;
      }
    }

    function pushEventFeed(ev) {
      if (!eventFeedContainer) return;
      const row = document.createElement('div');
      row.className = `eog-event-row ${ev.crit ? 'crit' : ''}`;
      const label = document.createElement('span');
      label.textContent = ev.text;
      const stamp = document.createElement('span');
      stamp.textContent = formatFortalezaTime(new Date());
      row.append(label, stamp);
      eventFeedContainer.prepend(row);
      while (eventFeedContainer.children.length > 6) {
        eventFeedContainer.lastElementChild.remove();
      }
    }

    sampleEvents.slice(0, 4).forEach(ev => pushEventFeed(ev));

    // ==================== 4. MATRIX RAIN CANVAS ====================
    const rainCanvas = document.getElementById('eog-matrix-rain-canvas');
    const matrixChars = 'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ10234567890ABCDEF0x';
    const rainFontSize = 14;
    let rainDrops = [];

    function resizeMatrixRain() {
      const rainCtx = safeCtx(rainCanvas);
      if (!rainCanvas || !rainCtx) return;
      const w = Math.max(shell.clientWidth || 960, 320);
      const h = Math.max(shell.clientHeight || 720, 400);
      if (rainCanvas.width !== w || rainCanvas.height !== h) {
        rainCanvas.width = w;
        rainCanvas.height = h;
        const cols = Math.max(1, Math.floor(w / rainFontSize));
        rainDrops = Array.from({ length: cols }, () => Math.floor(Math.random() * 20));
      }
    }

    function renderMatrixRain() {
      const rainCtx = safeCtx(rainCanvas);
      if (!rainCanvas || !rainCtx) return;
      if (!rainDrops.length) resizeMatrixRain();
      rainCtx.fillStyle = 'rgba(2, 4, 8, 0.1)';
      rainCtx.fillRect(0, 0, rainCanvas.width, rainCanvas.height);
      rainCtx.fillStyle = lockdownActive ? '#ff003c' : '#00ff66';
      rainCtx.font = `${rainFontSize}px "Share Tech Mono", monospace`;

      for (let i = 0; i < rainDrops.length; i++) {
        const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        rainCtx.fillText(char, i * rainFontSize, rainDrops[i] * rainFontSize);
        if (rainDrops[i] * rainFontSize > rainCanvas.height && Math.random() > 0.975) {
          rainDrops[i] = 0;
        }
        rainDrops[i]++;
      }
    }

    // ==================== 5. RELÓGIO & TELEMETRIA ====================
    function updateTacticalClock() {
      const now = new Date();
      const clockEl = document.getElementById('eog-tactical-clock');
      const hashEl = document.getElementById('eog-kernel-hash');
      if (clockEl) clockEl.textContent = formatFortalezaTime(now, true);
      if (hashEl) hashEl.textContent = '0x' + Math.random().toString(16).substring(2, 10).toUpperCase();

      const ts = now.getTime();
      if (ts - lastTelemetryTime > 2600) {
        lastTelemetryTime = ts;
        const tempEl = document.getElementById('eog-sensor-temp');
        const popEl = document.getElementById('eog-sensor-pop');
        const gridEl = document.getElementById('eog-sensor-grid');
        const rfEl = document.getElementById('eog-sensor-rf');
        if (tempEl) tempEl.textContent = (38.7 + Math.random() * 0.3).toFixed(1) + '°C';
        if (popEl) popEl.textContent = (164190 + Math.floor(Math.random() * 90)).toLocaleString('pt-BR');
        if (gridEl) gridEl.textContent = (84.0 + Math.random() * 0.6).toFixed(1) + '%';
        if (rfEl) rfEl.textContent = (2.41 + Math.random() * 0.03).toFixed(2) + ' GHz';
      }
    }

    // ==================== 6. CARTÃO DE INSPEÇÃO DO ALVO ====================
    function updateTargetInspectCard() {
      const cam = camerasDB[focusedCamIdx] || camerasDB[0];
      const idEl = document.getElementById('eog-target-id-label');
      const detailsEl = document.getElementById('eog-target-details-label');
      if (idEl) {
        idEl.textContent = customTargetLabel
          ? `ALVO DIRECIONADO: ${customTargetLabel.toUpperCase()}`
          : cam.targetId;
      }
      if (detailsEl) {
        detailsEl.replaceChildren();
        const addSpan = (text, highlight = false) => {
          if (highlight) {
            const s = document.createElement('span');
            s.className = 'eog-highlight';
            s.textContent = text;
            detailsEl.appendChild(s);
          } else {
            detailsEl.appendChild(document.createTextNode(text));
          }
        };
        addSpan('PLACA: ');
        addSpan(cam.plate, true);
        addSpan(' · MODELO: ');
        addSpan(cam.model, true);
        addSpan(' · RECON: ');
        addSpan(cam.confidence, true);
        detailsEl.appendChild(document.createElement('br'));
        addSpan('VISTO EM: ');
        addSpan(cam.loc, true);
        addSpan(' · ROTA: ');
        addSpan(cam.route, true);
      }
    }

    // ==================== 7. CÂMERAS MODULADAS (6 MODOS IA) ====================
    const cctvGrid = document.getElementById('eog-cctv-grid');

    function focusCamera(idx) {
      if (idx < 0 || idx >= camerasDB.length) return;
      focusedCamIdx = idx;
      customTargetLabel = null;
      $$('.eog-cam-cell', cctvGrid).forEach((cell, i) => {
        const isFocus = i === idx;
        cell.classList.toggle('focus', isFocus);
        cell.setAttribute('aria-pressed', String(isFocus));
      });
      updateTargetInspectCard();
      playTacticalSound(960, 'sine', 0.05);
    }

    function buildCameraGrid() {
      if (!cctvGrid) return;
      cctvGrid.replaceChildren();
      camerasDB.forEach((cam, idx) => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `eog-cam-cell ${idx === focusedCamIdx ? 'focus' : ''}`;
        cell.setAttribute('aria-pressed', String(idx === focusedCamIdx));
        cell.setAttribute('aria-label', `${cam.id} ${cam.loc}`);
        cell.dataset.camIdx = String(idx);

        const canvas = document.createElement('canvas');
        canvas.className = 'eog-cam-canvas';
        canvas.id = `eog-canvas-cctv-${idx}`;
        canvas.width = 280;
        canvas.height = 157;

        const overlay = document.createElement('div');
        overlay.className = 'eog-cam-overlay-hud';

        const headerTag = document.createElement('div');
        headerTag.className = 'eog-cam-header-tag';
        const camSpan = document.createElement('span');
        camSpan.className = 'eog-cam-id';
        camSpan.textContent = `${cam.id} // ${cam.zone}`;
        const recSpan = document.createElement('span');
        recSpan.className = 'eog-cam-rec';
        recSpan.textContent = '● REC_LOCK';
        headerTag.append(camSpan, recSpan);

        const locDiv = document.createElement('div');
        locDiv.className = 'eog-cam-loc';
        locDiv.textContent = cam.loc;

        overlay.append(headerTag, locDiv);
        cell.append(canvas, overlay);
        cell.addEventListener('click', () => {
          focusCamera(idx);
          printTerminal(`Foco óptico direcionado para ${cam.id} (${cam.loc}).`, 'success');
        });
        cctvGrid.appendChild(cell);
      });
    }

    function setCameraMode(mode) {
      const normalized = String(mode || '').toUpperCase();
      if (!modeLabels[normalized]) return false;
      activeCamMode = normalized;
      $$('.eog-cam-mode-btn', tabPanel).forEach(btn => {
        const isCurrent = btn.dataset.eogMode === activeCamMode;
        btn.classList.toggle('active', isCurrent);
        btn.setAttribute('aria-pressed', String(isCurrent));
      });
      playTacticalSound(900, 'triangle', 0.08);
      printTerminal(`Modo de visão de câmera alterado para: [${activeCamMode} · ${modeLabels[activeCamMode]}]`, 'success');
      renderCCTVFeeds(Date.now());
      return true;
    }

    $$('.eog-cam-mode-btn', tabPanel).forEach(btn => {
      btn.addEventListener('click', () => setCameraMode(btn.dataset.eogMode));
    });

    function renderCCTVFeeds(nowMs) {
      const time = nowMs * 0.002;
      camerasDB.forEach((cam, idx) => {
        const canvas = document.getElementById(`eog-canvas-cctv-${idx}`);
        const ctx = safeCtx(canvas);
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#02050a';
        ctx.fillRect(0, 0, w, h);

        if (activeCamMode === 'OPTICAL') {
          ctx.strokeStyle = 'rgba(0, 255, 102, 0.22)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(w / 2, h * 0.25);
          ctx.lineTo(w * 0.08, h);
          ctx.moveTo(w / 2, h * 0.25);
          ctx.lineTo(w * 0.92, h);
          ctx.moveTo(w * 0.3, h * 0.55);
          ctx.lineTo(w * 0.7, h * 0.55);
          ctx.stroke();

          const bx = (Math.sin(time + idx * 1.1) * 0.28 + 0.42) * w;
          const by = (Math.cos(time + idx * 0.9) * 0.18 + 0.48) * h;
          ctx.strokeStyle = idx === focusedCamIdx && targetLocked ? '#ff003c' : '#00f0ff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bx, by, 50, 26);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.font = '8px "Share Tech Mono", monospace';
          ctx.fillText(`${cam.plate} ${cam.confidence}`, bx, by - 4);
        } else if (activeCamMode === 'FLIR') {
          const hx = w * 0.5 + Math.sin(time + idx) * 42;
          const hy = h * 0.52 + Math.cos(time * 0.8 + idx) * 16;
          const rad = ctx.createRadialGradient(hx, hy, 8, hx, hy, 92);
          rad.addColorStop(0, '#ffffff');
          rad.addColorStop(0.28, '#ffe600');
          rad.addColorStop(0.58, '#ff003c');
          rad.addColorStop(1, '#120f38');
          ctx.fillStyle = rad;
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.strokeRect(hx - 18, hy - 12, 36, 24);
          ctx.fillStyle = '#fff';
          ctx.font = '8px "Share Tech Mono", monospace';
          ctx.fillText('82.4°C PEAK', hx - 20, hy - 16);
        } else if (activeCamMode === 'NVG') {
          ctx.fillStyle = 'rgba(0, 255, 102, 0.14)';
          ctx.fillRect(0, 0, w, h);
          for (let i = 0; i < 42; i++) {
            ctx.fillStyle = 'rgba(0, 255, 102, 0.55)';
            ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
          }
          const nx = (Math.sin(time * 0.9 + idx) * 0.25 + 0.45) * w;
          const ny = h * 0.55;
          ctx.strokeStyle = '#00ff66';
          ctx.strokeRect(nx, ny, 38, 22);
          ctx.fillStyle = '#00ff66';
          ctx.font = '8px "Share Tech Mono", monospace';
          ctx.fillText('IR_GAIN +42dB', 8, h - 22);
        } else if (activeCamMode === 'LIDAR') {
          ctx.strokeStyle = 'rgba(0, 255, 102, 0.45)';
          ctx.lineWidth = 1;
          for (let x = 0; x < w; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
          for (let y = 0; y < h; y += 16) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }
          const offset = Math.sin(time + idx) * 14;
          ctx.strokeStyle = '#00f0ff';
          ctx.strokeRect(70 + offset, 45, 48, 52);
          ctx.strokeRect(160 - offset, 52, 54, 46);
        } else if (activeCamMode === 'NEURAL') {
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 1;
          for (let i = 0; i < 14; i++) {
            const px = (Math.sin(time + i + idx) * 0.38 + 0.5) * w;
            const py = (Math.cos(time * 1.2 + i) * 0.34 + 0.5) * h;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + Math.cos(time + i) * 14, py + Math.sin(time + i) * 10);
            ctx.stroke();
          }
        } else if (activeCamMode === 'SAR') {
          ctx.strokeStyle = 'rgba(0, 255, 102, 0.38)';
          ctx.lineWidth = 1;
          [26, 48].forEach(r => {
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
            ctx.stroke();
          });
          ctx.strokeStyle = '#00ff66';
          ctx.beginPath();
          ctx.moveTo(w / 2, h / 2);
          ctx.lineTo(w / 2 + Math.cos(time * 2 + idx) * 52, h / 2 + Math.sin(time * 2 + idx) * 52);
          ctx.stroke();
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(w / 2 + Math.cos(idx) * 28, h / 2 + Math.sin(idx) * 20, 4, 4);
        }
      });
    }

    // ==================== 8. WIREFRAME FACIAL (CANVAS) ====================
    const faceCanvas = document.getElementById('eog-wireframe-face-canvas');

    function renderWireframeFace(nowMs) {
      const faceCtx = safeCtx(faceCanvas);
      if (!faceCtx || !faceCanvas) return;
      const w = faceCanvas.width;
      const h = faceCanvas.height;
      faceCtx.clearRect(0, 0, w, h);
      faceCtx.strokeStyle = lockdownActive ? '#ff003c' : '#00ff66';
      faceCtx.lineWidth = 1.2;

      const t = nowMs * 0.003;
      const cx = w / 2;
      const cy = h / 2;

      faceCtx.beginPath();
      faceCtx.arc(cx, cy, 32 + Math.sin(t) * 1.5, 0, Math.PI * 2);
      faceCtx.moveTo(cx - 16, cy - 8);
      faceCtx.lineTo(cx - 6, cy - 8);
      faceCtx.moveTo(cx + 6, cy - 8);
      faceCtx.lineTo(cx + 16, cy - 8);
      faceCtx.moveTo(cx, cy - 6);
      faceCtx.lineTo(cx, cy + 8);
      faceCtx.moveTo(cx - 12, cy + 16);
      faceCtx.lineTo(cx + 12, cy + 16);
      faceCtx.stroke();

      faceCtx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      faceCtx.beginPath();
      faceCtx.moveTo(cx - 30, cy);
      faceCtx.lineTo(cx + 30, cy);
      faceCtx.moveTo(cx, cy - 30);
      faceCtx.lineTo(cx, cy + 30);
      faceCtx.stroke();
    }

    // ==================== 9. RADAR ORBITAL TÁTICO ====================
    const radarCanvas = document.getElementById('eog-tactical-radar-canvas');

    function renderTacticalRadar(nowMs) {
      const radarCtx = safeCtx(radarCanvas);
      if (!radarCtx || !radarCanvas) return;
      const w = radarCanvas.width;
      const h = radarCanvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const time = nowMs * 0.0015;

      radarCtx.fillStyle = '#01050a';
      radarCtx.fillRect(0, 0, w, h);

      radarCtx.strokeStyle = 'rgba(0, 255, 102, 0.22)';
      radarCtx.lineWidth = 1;
      [40, 80, 110].forEach(r => {
        radarCtx.beginPath();
        radarCtx.arc(cx, cy, r, 0, Math.PI * 2);
        radarCtx.stroke();
      });

      radarCtx.beginPath();
      radarCtx.moveTo(cx, 0);
      radarCtx.lineTo(cx, h);
      radarCtx.moveTo(0, cy);
      radarCtx.lineTo(w, cy);
      radarCtx.stroke();

      // Feixe de varredura 360°
      radarCtx.strokeStyle = lockdownActive ? '#ff003c' : '#00ff66';
      radarCtx.lineWidth = 2;
      radarCtx.beginPath();
      radarCtx.moveTo(cx, cy);
      radarCtx.lineTo(cx + Math.cos(time) * 110, cy + Math.sin(time) * 110);
      radarCtx.stroke();

      // Plotagem de alvos
      radarTargets.forEach((tgt, idx) => {
        const px = tgt.x + Math.sin(time + idx) * 3;
        const py = tgt.y + Math.cos(time + idx) * 3;
        radarCtx.fillStyle = tgt.host ? '#ff003c' : '#00f0ff';
        radarCtx.beginPath();
        radarCtx.arc(px, py, 4, 0, Math.PI * 2);
        radarCtx.fill();

        if (idx === 0 && targetLocked) {
          radarCtx.strokeStyle = '#ffe600';
          radarCtx.lineWidth = 1.2;
          radarCtx.strokeRect(px - 8, py - 8, 16, 16);
        }

        radarCtx.fillStyle = '#fff';
        radarCtx.font = '8px "Share Tech Mono", monospace';
        radarCtx.fillText(tgt.id, px + 7, py + 3);
      });

      if (droneDispatched) {
        const dx = 118 + Math.cos(time * 2.2) * 35;
        const dy = 82 + Math.sin(time * 2.2) * 28;
        radarCtx.fillStyle = '#ffe600';
        radarCtx.beginPath();
        radarCtx.arc(dx, dy, 3.5, 0, Math.PI * 2);
        radarCtx.fill();
        radarCtx.fillText('DRONE-02', dx + 6, dy + 3);
      }
    }

    // ==================== 10. GRAFO PALANTIR ====================
    const graphCanvas = document.getElementById('eog-palantir-graph-canvas');

    function renderPalantirGraph(nowMs) {
      const graphCtx = safeCtx(graphCanvas);
      if (!graphCtx || !graphCanvas) return;
      const cam = camerasDB[focusedCamIdx] || camerasDB[0];
      const t = nowMs * 0.002;
      const nodes = [
        { id: customTargetLabel ? customTargetLabel.slice(0, 14) : `ALVO #0${focusedCamIdx + 1}`, x: 170, y: 100, color: '#ff003c' },
        { id: cam.model.slice(0, 14), x: 82, y: 58, color: '#00f0ff' },
        { id: cam.loc.split('/')[0].trim().slice(0, 15), x: 258, y: 58, color: '#00ff66' },
        { id: `VTR ${cam.unit}`, x: 82, y: 152, color: '#ffe600' },
        { id: cam.imei, x: 258, y: 152, color: '#00f0ff' }
      ];

      graphCtx.fillStyle = '#01050a';
      graphCtx.fillRect(0, 0, graphCanvas.width, graphCanvas.height);

      graphCtx.strokeStyle = lockdownActive ? 'rgba(255, 0, 60, 0.35)' : 'rgba(0, 240, 255, 0.28)';
      graphCtx.lineWidth = 1.2;
      for (let i = 1; i < nodes.length; i++) {
        graphCtx.beginPath();
        graphCtx.moveTo(nodes[0].x, nodes[0].y);
        graphCtx.lineTo(nodes[i].x, nodes[i].y);
        graphCtx.stroke();

        // Pulso trafegando pelo vínculo
        const ratio = (t * 0.4 + i * 0.25) % 1;
        const px = nodes[0].x + (nodes[i].x - nodes[0].x) * ratio;
        const py = nodes[0].y + (nodes[i].y - nodes[0].y) * ratio;
        graphCtx.fillStyle = '#00ff66';
        graphCtx.fillRect(px - 1.5, py - 1.5, 3, 3);
      }

      nodes.forEach(node => {
        graphCtx.fillStyle = node.color;
        graphCtx.beginPath();
        graphCtx.arc(node.x, node.y, 5, 0, Math.PI * 2);
        graphCtx.fill();
        graphCtx.fillStyle = '#cbd5e1';
        graphCtx.font = '9px "Share Tech Mono", monospace';
        graphCtx.fillText(node.id, node.x - 28, node.y - 9);
      });
    }

    // ==================== 11. ESPECTRO RF / ÁUDIO ====================
    const specCanvas = document.getElementById('eog-spectrum-canvas');

    function renderSpectrum(nowMs) {
      const specCtx = safeCtx(specCanvas);
      if (!specCtx || !specCanvas) return;
      if (nowMs - lastSpecTime < 80) return;
      lastSpecTime = nowMs;

      specCtx.fillStyle = '#000';
      specCtx.fillRect(0, 0, specCanvas.width, specCanvas.height);
      const bars = 32;
      const barWidth = specCanvas.width / bars;

      for (let i = 0; i < bars; i++) {
        const h = Math.max(4, Math.random() * specCanvas.height * 0.85);
        specCtx.fillStyle = lockdownActive
          ? (i % 3 === 0 ? '#ff003c' : '#ffe600')
          : (i % 4 === 0 ? '#00f0ff' : '#00ff66');
        specCtx.fillRect(i * barWidth, specCanvas.height - h, Math.max(1, barWidth - 1.5), h);
      }
    }

    // ==================== 12. AÇÕES TÁTICAS ====================
    const lockdownBtn = document.getElementById('eog-lockdown-btn');
    const defconStatus = document.getElementById('eog-defcon-status');
    const lockTargetBtn = document.getElementById('eog-lock-target-btn');
    const dispatchDroneBtn = document.getElementById('eog-dispatch-drone-btn');

    function setLockdown(active) {
      lockdownActive = Boolean(active);
      shell.classList.toggle('lockdown-active', lockdownActive);
      if (defconStatus) {
        defconStatus.textContent = lockdownActive ? 'NÍVEL 1 - CRÍTICO' : 'NÍVEL 2 - ELEVADO';
        defconStatus.className = `eog-pill-value ${lockdownActive ? 'crit' : 'warn'}`;
      }
      if (lockdownBtn) {
        lockdownBtn.textContent = lockdownActive ? '🛑 ENCERRAR LOCKDOWN' : '🚨 LOCKDOWN TOTAL';
        lockdownBtn.setAttribute('aria-pressed', String(lockdownActive));
      }
      if (lockdownActive) {
        playTacticalSound(220, 'sawtooth', 0.45, 0.08);
        printTerminal('🚨 ALERTA GERAL: PROTOCOLO EYE OF GOD LOCKDOWN ATIVADO EM TODO O ESTADO (SIMULAÇÃO)!', 'error');
        pushEventFeed({ text: 'DEFCON 1: Protocolo LOCKDOWN acionado', crit: true });
      } else {
        playTacticalSound(660, 'sine', 0.15, 0.05);
        printTerminal('Protocolo de Lockdown encerrado. DEFCON restaurado para NÍVEL 2 - ELEVADO.', 'success');
        pushEventFeed({ text: 'DEFCON 2: Estado operacional normalizado', crit: false });
      }
    }

    function lockTargetOnRadar() {
      const cam = camerasDB[focusedCamIdx] || camerasDB[0];
      targetLocked = true;
      playTacticalSound(1400, 'sine', 0.15);
      printTerminal(`🎯 MIRA CRAVADA: Coordenadas de ${cam.plate} transmitidas para a viatura ${cam.unit}.`, 'success');
      pushEventFeed({ text: `MIRA TRAVADA: ${cam.plate} -> ${cam.unit}`, crit: true });
      renderTacticalRadar(Date.now());
    }

    function deployInterceptorDrone() {
      droneDispatched = true;
      playTacticalSound(600, 'triangle', 0.2);
      printTerminal('🚁 DRONE DE INTERCEPTAÇÃO DESPACHADO: DRONE-02 em rota (ETA 2 MINUTOS).', 'success');
      pushEventFeed({ text: 'DRONE-02 em deslocamento para acompanhamento', crit: false });
      renderTacticalRadar(Date.now());
    }

    if (lockdownBtn) {
      lockdownBtn.addEventListener('click', () => setLockdown(!lockdownActive));
    }
    if (lockTargetBtn) {
      lockTargetBtn.addEventListener('click', lockTargetOnRadar);
    }
    if (dispatchDroneBtn) {
      dispatchDroneBtn.addEventListener('click', deployInterceptorDrone);
    }

    // ==================== 13. INTERPRETADOR DE COMANDOS CLI ====================
    function executeCommand(rawCmd) {
      const trimmed = rawCmd.trim();
      if (!trimmed) return;
      cmdHistory.unshift(trimmed);
      if (cmdHistory.length > 30) cmdHistory.pop();
      historyPos = -1;

      playTacticalSound(1100, 'square', 0.05);
      printTerminal(`root@SPIA-GODS-EYE:~# ${trimmed}`);

      const parts = trimmed.split(/\s+/);
      const main = parts[0].toLowerCase();
      const arg = parts.slice(1).join(' ');

      switch (main) {
        case 'help':
          printTerminal(
            'COMANDOS: help, target <nome>, lockdown, standdown, thermal, nvg, lidar, optical, neural, sar, scan, radar, intercept, status, clear',
            'success'
          );
          break;
        case 'target': {
          if (arg) {
            const idx = camerasDB.findIndex(
              c => c.plate.toLowerCase().includes(arg.toLowerCase()) ||
                   c.model.toLowerCase().includes(arg.toLowerCase()) ||
                   c.id.toLowerCase() === arg.toLowerCase()
            );
            if (idx >= 0) {
              focusCamera(idx);
              printTerminal(`ALVO SINALIZADO: ${camerasDB[idx].model} [${camerasDB[idx].plate}] em ${camerasDB[idx].loc}.`, 'success');
            } else {
              customTargetLabel = arg;
              updateTargetInspectCard();
              printTerminal(`ALVO SINALIZADO: "${arg}" — rastreamento orbital simulado travado.`, 'success');
            }
          } else {
            const cam = camerasDB[focusedCamIdx];
            printTerminal(`ALVO SINALIZADO: ${cam.model} [${cam.plate}] — satélite GEO-PI-01 travado.`, 'success');
          }
          targetLocked = true;
          playTacticalSound(400, 'sawtooth', 0.18);
          break;
        }
        case 'lockdown':
          setLockdown(true);
          break;
        case 'standdown':
        case 'unlock':
        case 'reset':
          setLockdown(false);
          break;
        case 'thermal':
        case 'flir':
          setCameraMode('FLIR');
          break;
        case 'nvg':
          setCameraMode('NVG');
          break;
        case 'lidar':
          setCameraMode('LIDAR');
          break;
        case 'optical':
          setCameraMode('OPTICAL');
          break;
        case 'neural':
          setCameraMode('NEURAL');
          break;
        case 'sar':
          setCameraMode('SAR');
          break;
        case 'scan':
          printTerminal('VARREDURA MULTI-SETORIAL: 6 câmeras ativas em Teresina (ZL, CT, ZN, ZSE, ZO) — 100% operacionais (simulação).', 'success');
          pushEventFeed({ text: 'SCAN: Varredura orbital concluída nas 6 zonas', crit: false });
          break;
        case 'radar':
          printTerminal('RADAR C4ISR: 12 alvos monitorados · 8 viaturas em campo · varredura 360° ativa.', 'success');
          renderTacticalRadar(Date.now());
          break;
        case 'intercept':
          lockTargetOnRadar();
          deployInterceptorDrone();
          break;
        case 'clear':
          if (termBody) termBody.replaceChildren();
          break;
        case 'status':
          printTerminal(
            `SISTEMA ESTÁVEL [MODO ${activeCamMode}]: 6 CÂMERAS // 8 VIATURAS // DEFCON ${lockdownActive ? '1 (CRÍTICO)' : '2 (ELEVADO)'}`,
            'success'
          );
          break;
        default:
          printTerminal(`Comando desconhecido: '${trimmed}'. Digite 'help'.`, 'error');
          break;
      }
    }

    if (termInput) {
      termInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          const cmd = termInput.value;
          termInput.value = '';
          executeCommand(cmd);
        } else if (event.key === 'ArrowUp' && cmdHistory.length) {
          event.preventDefault();
          historyPos = Math.min(historyPos + 1, cmdHistory.length - 1);
          termInput.value = cmdHistory[historyPos];
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          if (historyPos > 0) {
            historyPos--;
            termInput.value = cmdHistory[historyPos];
          } else {
            historyPos = -1;
            termInput.value = '';
          }
        }
      });
    }

    // ==================== 14. LOOP DE RENDERIZAÇÃO & CICLO DE VIDA ====================
    function renderAllFrames(nowMs) {
      renderMatrixRain();
      renderCCTVFeeds(nowMs);
      renderWireframeFace(nowMs);
      renderTacticalRadar(nowMs);
      renderPalantirGraph(nowMs);
      renderSpectrum(nowMs);
    }

    function isTabActive() {
      return tabPanel.classList.contains('active') && !document.hidden;
    }

    function animationStep() {
      if (!isTabActive()) {
        rafId = null;
        return;
      }
      renderAllFrames(Date.now());
      if (!reducedMotion && typeof window.requestAnimationFrame === 'function') {
        rafId = window.requestAnimationFrame(animationStep);
      } else {
        rafId = null;
      }
    }

    function startActiveLoops() {
      resizeMatrixRain();
      updateTacticalClock();
      renderAllFrames(Date.now());

      if (!clockTimer) {
        clockTimer = window.setInterval(() => {
          if (isTabActive()) updateTacticalClock();
        }, reducedMotion ? 1000 : 80);
      }
      if (!eventTimer) {
        eventTimer = window.setInterval(() => {
          if (isTabActive()) {
            pushEventFeed(sampleEvents[Math.floor(Math.random() * sampleEvents.length)]);
          }
        }, 4500);
      }
      if (!rafId && !reducedMotion && typeof window.requestAnimationFrame === 'function') {
        rafId = window.requestAnimationFrame(animationStep);
      }
    }

    function stopActiveLoops() {
      if (rafId && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    buildCameraGrid();
    updateTargetInspectCard();
    updateTacticalClock();

    window.addEventListener('resize', () => {
      if (isTabActive()) resizeMatrixRain();
    });

    document.addEventListener('visibilitychange', () => {
      if (isTabActive()) startActiveLoops();
      else stopActiveLoops();
    });

    document.addEventListener('dashboard:tabchange', event => {
      if (event.detail === 'eye-of-god') startActiveLoops();
      else stopActiveLoops();
    });

    if (tabPanel.classList.contains('active')) {
      startActiveLoops();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEyeOfGod, { once: true });
  } else {
    initEyeOfGod();
  }
})();

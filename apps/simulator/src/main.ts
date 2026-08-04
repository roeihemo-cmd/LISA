import { injectStyles, COLORS } from './render/theme';
import { drawScene } from './render/scene';
import { drawRoundabout } from './render/roundabout';
import { drawWaveform } from './render/plot';
import { computeTraces } from './sensors/lidar';
import { ConfigStore } from './config/store';
import { VEHICLES, SCENARIOS } from './config/presets';
import { Pipeline, type Frame } from './sim/pipeline';
import { SimClock, DT } from './core/time';
import { msToKmh, kmhToMs, G } from './core/units';
import { openEquation } from './ui/equations';
import { openSpecSheet } from './ui/specSheet';
import { openScenarioPicker } from './ui/scenarioPicker';
import { openModal, closeModal } from './ui/modal';
import { tr, isRTL, hasChosen, setLang, L, UI, type LS } from './ui/lang';
import { bidi, pretty } from './ui/equations';

let scenKey = 'hardBrake';

injectStyles();
document.documentElement.lang = isRTL() ? 'he' : 'en';

const store = new ConfigStore();
let pipeline = new Pipeline(store.get());
const clock = new SimClock();
let last: Frame | null = null;
let freezeT = 0;
let scroll = 0; // metres travelled, for lane-dash animation
let dispClosing = 0; // display-smoothed closing speed [m/s] (steadier than the decision value)

// ---------- DOM ----------
const app = document.getElementById('app')!;
app.innerHTML = `
  <div class="rail left">
    <div class="brand" style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>LISA<small>${tr('brandSub')}</small></div>
      <button id="langBtn" class="infobtn" style="width:auto;padding:2px 9px;border-radius:6px;font-size:.68rem">${isRTL() ? 'EN' : 'עב'}</button>
    </div>

    <div class="sec">${tr('scenario')}</div>
    <div class="ctl"><button class="scenbtn" id="scenBtn"><span class="nm" id="scenName"></span><span class="go">${tr('change')}</span></button></div>

    <div class="sec">${tr('vehicle')}</div>
    <div class="ctl"><select id="vehicle">${Object.entries(VEHICLES)
      .map(([k, v]) => `<option value="${k}">${v.name} (μ=${v.mu})</option>`)
      .join('')}</select></div>

    <div class="sec">${tr('parameters')}</div>
    <div class="ctl"><label>${tr('setSpeed')} <b id="speed-v"></b></label><input type="range" id="speed" min="20" max="180" step="1"></div>
    <div class="ctl"><label>${tr('fog')} <b id="fog-v"></b></label><input type="range" id="fog" min="0" max="0.3" step="0.005"></div>
    <div class="ctl"><label>${tr('reflectivity')} <b id="rho-v"></b></label><input type="range" id="rho" min="0.05" max="1" step="0.05"></div>
    <div class="ctl"><label>${tr('noise')} <b id="noise-v"></b></label><input type="range" id="noise" min="0" max="0.5" step="0.01"></div>

    <div class="sec">${tr('pipeline')}</div>
    <div class="mono" style="font-size:.72rem;color:${COLORS.dim};line-height:1.9">${tr('pipelineFlow')}</div>
    <div class="mono" style="font-size:.66rem;color:${COLORS.faint};margin-top:10px">${tr('pipelineNote')}</div>
  </div>

  <div class="stage">
    <div class="worldwrap">
      <canvas id="world"></canvas>
      <div class="hud mono" id="hud"></div>
      <div class="banner" id="banner" style="display:none"></div>
      <div class="transport">
        <button id="play">${tr('pause')}</button>
        <button id="step">${tr('step')}</button>
        <button id="restart">${tr('restart')}</button>
      </div>
    </div>
  </div>

  <div class="rail right">
    <div class="sec" style="display:flex;justify-content:space-between;align-items:center">${tr('analytics')}<button class="infobtn" id="an-info">i</button></div>
    <div class="tiles">
      <div class="tile"><div class="k">${tr('egoSpeed')}</div><div class="v mono" id="t-vego" style="color:${COLORS.cyan}">—</div></div>
      <div class="tile"><div class="k">${tr('targetSpeed')}</div><div class="v mono" id="t-vtgt">—</div></div>
      <div class="tile"><div class="k">${tr('closing')}</div><div class="v mono" id="t-closing">—</div></div>
      <div class="tile"><div class="k">${tr('ttc')}</div><div class="v mono" id="t-ttc">—</div></div>
      <div class="tile"><div class="k">${tr('trueRange')}</div><div class="v mono" id="t-true" style="color:${COLORS.truth}">—</div></div>
      <div class="tile"><div class="k">${tr('estRange')}</div><div class="v mono" id="t-est" style="color:${COLORS.est}">—</div></div>
      <div class="tile"><div class="k">${tr('sensorErr')}</div><div class="v mono" id="t-err">—</div></div>
      <div class="tile"><div class="k">${tr('snr')}</div><div class="v mono" id="t-snr">—</div></div>
      <div class="tile"><div class="k">${tr('stopReq')}</div><div class="v mono" id="t-dreq" style="color:${COLORS.amber}">—</div></div>
      <div class="tile"><div class="k">${tr('decision')}</div><div class="v mono" id="t-mode">—</div></div>
    </div>
    <div class="dvline mono" id="t-dvbreak"></div>

    <div class="plot">
      <div class="cap"><span>${tr('rawSignal')}</span><span class="legend"><i style="background:${COLORS.red}"></i>r(t)</span></div>
      <canvas id="plot-raw" style="width:100%;height:86px"></canvas>
    </div>
    <div class="plot">
      <div class="cap"><span>${tr('matchedFilter')}</span><span class="legend"><i style="background:${COLORS.green}"></i>y <i style="background:${COLORS.amber}"></i>thr</span></div>
      <canvas id="plot-mf" style="width:100%;height:86px"></canvas>
    </div>

    <div class="eqcard">
      <div class="hd"><div class="t">${tr('stopTitle')}</div><button class="infobtn" id="eq-braking" title="derivation">i</button></div>
      <div class="f mono">D<sub>req</sub> = V·(T<sub>dsp</sub>+T<sub>flt</sub>+T<sub>act</sub>) + V²/(2μg) + D<sub>buf</sub></div>
      <div class="f mono" id="eq-sub" style="color:${COLORS.est};margin-top:6px"></div>
      <div class="sub${isRTL() ? ' rtl' : ''}">${tr('stopSub')}</div>
      <div id="eq-chips" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"></div>
      <div class="reasons mono" id="reasons"></div>
    </div>

    <div class="fognote" id="fognote" style="display:none"></div>
  </div>
`;

// ---------- element refs ----------
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const worldCanvas = $<HTMLCanvasElement>('world');
const rawCanvas = $<HTMLCanvasElement>('plot-raw');
const mfCanvas = $<HTMLCanvasElement>('plot-mf');
const wctx = worldCanvas.getContext('2d')!;
const rctx = rawCanvas.getContext('2d')!;
const mctx = mfCanvas.getContext('2d')!;
let worldW = 0,
  worldH = 0,
  rawW = 0,
  rawH = 0,
  mfW = 0,
  mfH = 0;

function fit(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): [number, number] {
  const dpr = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [r.width, r.height];
}
function fitAll(): void {
  [worldW, worldH] = fit(worldCanvas, wctx);
  [rawW, rawH] = fit(rawCanvas, rctx);
  [mfW, mfH] = fit(mfCanvas, mctx);
}
window.addEventListener('resize', fitAll);

// ---------- controls ----------
function syncControlsFromConfig(): void {
  const c = store.get();
  $<HTMLSelectElement>('vehicle').value =
    Object.entries(VEHICLES).find(([, v]) => v.name === c.vehicle.name)?.[0] ?? 'tesla';
  const sp = $('speed') as HTMLInputElement;
  sp.max = String(Math.round(msToKmh(c.vehicle.maxSpeed))); // truck slider caps at 90 km/h
  sp.value = String(Math.round(msToKmh(c.scenario.egoSpeed0)));
  ($('fog') as HTMLInputElement).value = String(c.lidar.fogAlpha);
  ($('rho') as HTMLInputElement).value = String(c.lidar.reflectivity);
  ($('noise') as HTMLInputElement).value = String(c.lidar.noise);
  updateLabels();
}
function updateLabels(): void {
  const c = store.get();
  $('speed-v').textContent = `${Math.round(msToKmh(c.scenario.egoSpeed0))} km/h`;
  $('fog-v').textContent = c.lidar.fogAlpha.toFixed(3);
  $('rho-v').textContent = c.lidar.reflectivity.toFixed(2);
  $('noise-v').textContent = c.lidar.noise.toFixed(2);
}

function brakingExtra(): [string, LS] {
  const c = store.get();
  const ve = last?.egoSpeed ?? c.scenario.egoSpeed0;
  const lat = c.decision.tDsp + c.decision.tFilter + c.vehicle.actuatorLatency;
  const decel = c.vehicle.mu * G;
  const dReq = ve * lat + (ve * ve) / (2 * decel) + c.decision.safetyBuffer;
  const vk = msToKmh(ve).toFixed(0);
  return [
    `= ${ve.toFixed(1)}·${lat.toFixed(2)} + ${ve.toFixed(1)}²/(2·${decel.toFixed(2)}) + ${c.decision.safetyBuffer} = ${dReq.toFixed(1)} m`,
    { en: `Numeric substitution at the current speed ${vk} km/h.`, he: `הצבה מספרית לפי המהירות הנוכחית ${vk} קמ״ש.` },
  ];
}

function updateScenUI(): void {
  const sc = SCENARIOS[scenKey];
  $('scenName').textContent = L(sc.name);
  $('eq-chips').innerHTML = sc.eqs
    .map(
      (id) =>
        `<button class="infobtn" data-eq="${id}" style="width:auto;padding:2px 9px;border-radius:6px;font-size:.66rem">${id} ⓘ</button>`,
    )
    .join('');
  document.querySelectorAll<HTMLElement>('#eq-chips [data-eq]').forEach((b) =>
    b.addEventListener('click', () => openEquation(b.dataset.eq!, b.dataset.eq === 'braking' ? brakingExtra() : undefined)),
  );
}

function rebuild(): void {
  pipeline = new Pipeline(store.get());
  clock.t = 0;
  freezeT = 0;
  scroll = 0;
  dispClosing = 0;
  last = null;
}

function applyScenario(key: string): void {
  scenKey = key;
  const sc = SCENARIOS[key];
  store.patch('scenario', sc);
  store.patch('lidar', { fogAlpha: sc.fog, reflectivity: sc.reflectivity });
  syncControlsFromConfig();
  updateScenUI();
  rebuild();
}
$('scenBtn').addEventListener('click', () => openScenarioPicker(scenKey, applyScenario));
$('eq-braking').addEventListener('click', () => openEquation('braking', brakingExtra()));

// click ON THE CAR → spec sheet · double-click ON THE CAR → 2× speed.
// The ego sits at the bottom-centre of the view; only clicks there count.
function onEgo(e: MouseEvent): boolean {
  const x = e.offsetX;
  const y = e.offsetY;
  const cx = worldW / 2;
  return x > cx - 74 && x < cx + 74 && y > worldH - 120 && y < worldH - 2;
}
let clickTimer: number | undefined;
worldCanvas.addEventListener('click', (e) => {
  if (!onEgo(e)) return;
  if (clickTimer) window.clearTimeout(clickTimer);
  clickTimer = window.setTimeout(() => openSpecSheet(store.get(), last?.egoSpeed ?? store.get().scenario.egoSpeed0), 240);
});
worldCanvas.addEventListener('dblclick', (e) => {
  if (!onEgo(e)) return;
  if (clickTimer) window.clearTimeout(clickTimer);
  const c = store.get();
  store.patch('scenario', { egoSpeed0: Math.min(c.vehicle.maxSpeed, c.scenario.egoSpeed0 * 2) });
  updateLabels();
  ($('speed') as HTMLInputElement).value = String(Math.round(msToKmh(store.get().scenario.egoSpeed0)));
  rebuild();
});

// analytics explainer — formulas shown right next to the explanation
$('an-info').addEventListener('click', () => {
  const rtl = isRTL();
  const cls = rtl ? ' rtl' : '';
  const tx = (s: LS): string => (rtl ? bidi(L(s)) : L(s));
  openModal(
    `<h3>${L(UI.vehicles)}</h3>` +
      `<div class="eqf">${pretty('Δv = V_ego − V_target')}</div>` +
      `<div class="eqf">${pretty('TTC = R / Δv')}</div>` +
      `<div class="sub${cls}" style="line-height:1.7">${tx(UI.dvInfo)}</div>` +
      `<div class="note${cls}" style="margin-top:12px">${tx(UI.detectNote)}</div>`,
  );
});
$<HTMLSelectElement>('vehicle').addEventListener('change', (e) => {
  const v = VEHICLES[(e.target as HTMLSelectElement).value];
  store.patch('vehicle', v);
  // clamp the set speed to what this vehicle can actually do (e.g. truck ≤ 90 km/h)
  if (store.get().scenario.egoSpeed0 > v.maxSpeed) store.patch('scenario', { egoSpeed0: v.maxSpeed });
  syncControlsFromConfig();
  rebuild();
});
$('speed').addEventListener('input', (e) => {
  const want = kmhToMs(+(e.target as HTMLInputElement).value);
  store.patch('scenario', { egoSpeed0: Math.min(want, store.get().vehicle.maxSpeed) });
  updateLabels();
  rebuild();
});
$('fog').addEventListener('input', (e) => {
  store.patch('lidar', { fogAlpha: +(e.target as HTMLInputElement).value });
  updateLabels();
  rebuild();
});
$('rho').addEventListener('input', (e) => {
  store.patch('lidar', { reflectivity: +(e.target as HTMLInputElement).value });
  updateLabels();
  rebuild();
});
$('noise').addEventListener('input', (e) => {
  store.patch('lidar', { noise: +(e.target as HTMLInputElement).value });
  updateLabels();
  rebuild();
});

$('play').addEventListener('click', () => {
  clock.paused = !clock.paused;
  $('play').textContent = clock.paused ? tr('play') : tr('pause');
});
$('step').addEventListener('click', () => clock.step(40));
$('restart').addEventListener('click', rebuild);

// language toggle → switch and reload (keeps the whole UI in one language)
$('langBtn').addEventListener('click', () => {
  setLang(isRTL() ? 'en' : 'he');
  location.reload();
});

// first visit → ask the language once
if (!hasChosen()) {
  const rtl = isRTL();
  openModal(
    `<h3>${tr('chooseLang')} · Language</h3>` +
      `<div style="display:flex;gap:12px;margin-top:16px">` +
      `<button class="pick-lang scenbtn" data-l="en" style="justify-content:center">English</button>` +
      `<button class="pick-lang scenbtn" data-l="he" style="justify-content:center">עברית</button>` +
      `</div>`,
  );
  document.querySelectorAll<HTMLElement>('.pick-lang').forEach((b) =>
    b.addEventListener('click', () => {
      const l = b.dataset.l as 'en' | 'he';
      setLang(l);
      if (l === 'en' && !rtl) closeModal();
      else location.reload();
    }),
  );
}

// ---------- render ----------
function render(f: Frame): void {
  const c = store.get();
  const round = !!f.rnd;
  if (round) drawRoundabout(wctx, f, c.vehicle.visual, worldW, worldH);
  else drawScene(wctx, f, { egoVisual: c.vehicle.visual, fogAlpha: c.lidar.fogAlpha, scroll, jam: scenKey === 'jam' }, worldW, worldH);

  const rangeLabel = round ? 'm · ISLAND' : 'm · LiDAR';
  $('hud').innerHTML =
    `<div class="row" style="color:${COLORS.cyan}">${msToKmh(f.egoSpeed).toFixed(0)} <span class="k">km/h</span></div>` +
    `<div class="row" style="color:${f.detected ? COLORS.est : COLORS.red}">${
      f.estRange != null ? f.estRange.toFixed(1) : '-- LOST'
    } <span class="k">${rangeLabel}</span></div>`;

  const banner = $('banner');
  if (f.outcome === 'COLLISION') setBanner(banner, tr('collision'), COLORS.red);
  else if (f.outcome === 'CROSSED') setBanner(banner, tr('crossedSafely'), COLORS.green);
  else if (f.outcome === 'STOPPED') setBanner(banner, round ? tr('roundaboutClear') : tr('stoppedSafely'), COLORS.green);
  else if (f.decision.inevitable) setBanner(banner, tr('collisionImminent'), COLORS.red);
  else banner.style.display = 'none';

  // heavy-fog note: real systems need RADAR + sensor fusion
  const fn = $('fognote');
  if (c.lidar.fogAlpha > 0.14 && (f.estRange == null || f.decision.inevitable)) {
    const rtl = isRTL();
    fn.style.display = 'block';
    fn.innerHTML =
      `<div class="t${rtl ? ' rtl' : ''}">${tr('fogNoteTitle')}</div>` +
      `<div class="d${rtl ? ' rtl' : ''}">${rtl ? bidi(L(UI.fogNote)) : L(UI.fogNote)}</div>`;
  } else fn.style.display = 'none';

  const err = f.estRange != null ? f.estRange - f.trueRange : NaN;
  const vEgoKmh = msToKmh(f.egoSpeed);
  const locked = f.detected && f.estRange != null && !round;
  dispClosing += ((locked ? f.estClosing : 0) - dispClosing) * 0.05; // steady display value
  let dvShown = msToKmh(dispClosing);
  let vTgtKmh = locked ? Math.max(0, vEgoKmh - dvShown) : NaN;
  // a near-zero inferred speed means a stationary object — snap it clean (closing = ego speed)
  if (locked && vTgtKmh < 6) {
    vTgtKmh = 0;
    dvShown = vEgoKmh;
  }
  $('t-vego').textContent = `${vEgoKmh.toFixed(0)} km/h`;
  $('t-vtgt').textContent = round ? 'island' : locked ? `${vTgtKmh.toFixed(0)} km/h` : '—';
  $('t-closing').textContent = round ? '—' : locked ? `${dvShown.toFixed(0)} km/h` : '—';
  $('t-dvbreak').textContent =
    locked && isFinite(vTgtKmh) ? `Δv = V ${vEgoKmh.toFixed(0)} − T ${vTgtKmh.toFixed(0)} = ${(vEgoKmh - vTgtKmh).toFixed(0)} km/h` : '';
  $('t-ttc').textContent = isFinite(f.decision.ttc) ? `${f.decision.ttc.toFixed(1)} s` : '—';
  $('t-true').textContent = round ? 'island' : `${f.trueRange.toFixed(1)} m`;
  $('t-est').textContent = f.estRange != null ? `${f.estRange.toFixed(1)} m` : '-- LOST';
  $('t-err').textContent = isFinite(err) ? `${err >= 0 ? '+' : ''}${err.toFixed(2)} m` : '—';
  $('t-snr').textContent = f.snr > 0 ? `${(20 * Math.log10(f.snr)).toFixed(0)} dB` : '-∞';
  $('t-dreq').textContent = `${f.decision.dReq.toFixed(1)} m`;
  const mode = $('t-mode');
  mode.textContent = f.decision.mode;
  mode.style.color =
    f.decision.mode === 'AEB' ? COLORS.red : f.decision.mode === 'CRUISE' ? COLORS.cyan : COLORS.amber;

  $('reasons').innerHTML = f.decision.reasons.map((r) => `• ${r}`).join('<br>');

  // DSP waveform plots (raw r(t) + matched filter y(t))
  const traces = computeTraces(f.trueRange, c.lidar);
  drawWaveform(rctx, traces.recv, rawW, rawH, COLORS.red);
  drawWaveform(mctx, traces.mf, mfW, mfH, COLORS.green, traces.thr);

  // live D_required substitution
  const ve = f.egoSpeed;
  const lat = c.decision.tDsp + c.decision.tFilter + c.vehicle.actuatorLatency;
  const decel = c.vehicle.mu * G;
  $('eq-sub').textContent =
    `= ${ve.toFixed(1)}·${lat.toFixed(2)} + ${ve.toFixed(1)}²/(2·${decel.toFixed(2)}) + ${c.decision.safetyBuffer} ` +
    `= ${f.decision.dReq.toFixed(1)} m`;
}

function setBanner(el: HTMLElement, text: string, color: string): void {
  el.style.display = 'block';
  el.style.color = color;
  el.textContent = text;
}

// ---------- loop ----------
let prev = performance.now();
function frame(now: number): void {
  const dt = (now - prev) / 1000;
  prev = now;
  const steps = clock.pump(dt);
  for (let i = 0; i < steps; i++) {
    last = pipeline.tick(DT);
    if (last.outcome === 'RUNNING') scroll += last.egoSpeed * DT;
  }
  if (last) {
    render(last);
    if (last.outcome !== 'RUNNING') {
      freezeT += dt;
      if (freezeT > 3.0) rebuild();
    }
  }
  requestAnimationFrame(frame);
}

syncControlsFromConfig();
updateScenUI();
fitAll();
requestAnimationFrame(frame);

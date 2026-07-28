import { injectStyles, COLORS } from './render/theme';
import { drawScene } from './render/scene';
import { TimeSeries } from './render/plot';
import { ConfigStore } from './config/store';
import { VEHICLES, SCENARIOS } from './config/presets';
import { Pipeline, type Frame } from './sim/pipeline';
import { SimClock, DT } from './core/time';
import { msToKmh, kmhToMs, G } from './core/units';

injectStyles();

const store = new ConfigStore();
let pipeline = new Pipeline(store.get());
const clock = new SimClock();
const series = new TimeSeries([
  { key: 'true', color: COLORS.truth },
  { key: 'est', color: COLORS.est },
]);
let last: Frame | null = null;
let freezeT = 0;

// ---------- DOM ----------
const app = document.getElementById('app')!;
app.innerHTML = `
  <div class="rail left">
    <div class="brand">LISA<small>LiDAR · ADAS Bench</small></div>

    <div class="sec">Scenario</div>
    <div class="ctl"><select id="scenario">${Object.entries(SCENARIOS)
      .map(([k, s]) => `<option value="${k}">${s.name}</option>`)
      .join('')}</select></div>

    <div class="sec">Vehicle</div>
    <div class="ctl"><select id="vehicle">${Object.entries(VEHICLES)
      .map(([k, v]) => `<option value="${k}">${v.name} (μ=${v.mu})</option>`)
      .join('')}</select></div>

    <div class="sec">Parameters</div>
    <div class="ctl"><label>Set speed <b id="speed-v"></b></label><input type="range" id="speed" min="20" max="180" step="1"></div>
    <div class="ctl"><label>Fog / Dust α <b id="fog-v"></b></label><input type="range" id="fog" min="0" max="0.3" step="0.005"></div>
    <div class="ctl"><label>Reflectivity ρ <b id="rho-v"></b></label><input type="range" id="rho" min="0.05" max="1" step="0.05"></div>
    <div class="ctl"><label>Noise σ <b id="noise-v"></b></label><input type="range" id="noise" min="0" max="0.5" step="0.01"></div>

    <div class="sec">Pipeline</div>
    <div class="mono" style="font-size:.72rem;color:${COLORS.dim};line-height:1.9">
      world → lidar → estimate<br>→ decision → vehicle
    </div>
    <div class="mono" style="font-size:.66rem;color:${COLORS.faint};margin-top:10px">
      The car acts only on the LiDAR estimate.<br>Only the simulator knows the truth.
    </div>
  </div>

  <div class="stage">
    <div class="worldwrap">
      <canvas id="world"></canvas>
      <div class="hud mono" id="hud"></div>
      <div class="banner" id="banner" style="display:none"></div>
      <div class="transport">
        <button id="play">Pause</button>
        <button id="step">Step</button>
        <button id="restart">Restart</button>
      </div>
    </div>
  </div>

  <div class="rail right">
    <div class="sec">Analytics</div>
    <div class="tiles">
      <div class="tile"><div class="k">True Range</div><div class="v mono" id="t-true" style="color:${COLORS.truth}">—</div></div>
      <div class="tile"><div class="k">Est Range · MA8</div><div class="v mono" id="t-est" style="color:${COLORS.est}">—</div></div>
      <div class="tile"><div class="k">Sensor Error</div><div class="v mono" id="t-err">—</div></div>
      <div class="tile"><div class="k">SNR</div><div class="v mono" id="t-snr">—</div></div>
      <div class="tile"><div class="k">TTC</div><div class="v mono" id="t-ttc">—</div></div>
      <div class="tile"><div class="k">Closing Δv</div><div class="v mono" id="t-closing">—</div></div>
      <div class="tile"><div class="k">Stop Req</div><div class="v mono" id="t-dreq" style="color:${COLORS.amber}">—</div></div>
      <div class="tile"><div class="k">Decision</div><div class="v mono" id="t-mode">—</div></div>
    </div>

    <div class="plot">
      <div class="cap"><span>Range vs time</span><span class="legend"><i style="background:${COLORS.truth}"></i>true <i style="background:${COLORS.est}"></i>est</span></div>
      <canvas id="plot" style="width:100%;height:120px"></canvas>
    </div>

    <div class="eqcard">
      <div class="t">Required Stopping Distance</div>
      <div class="f mono">D_req = V·(T_dsp+T_flt+T_act) + V²/(2μg) + D_buf</div>
      <div class="f mono" id="eq-sub" style="color:${COLORS.est};margin-top:6px"></div>
      <div class="sub">The car brakes once the LiDAR-estimated gap drops below D_req.</div>
      <div class="reasons mono" id="reasons"></div>
    </div>
  </div>
`;

// ---------- element refs ----------
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const worldCanvas = $<HTMLCanvasElement>('world');
const plotCanvas = $<HTMLCanvasElement>('plot');
const wctx = worldCanvas.getContext('2d')!;
const pctx = plotCanvas.getContext('2d')!;
let worldW = 0,
  worldH = 0,
  plotW = 0,
  plotH = 0;

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
  [plotW, plotH] = fit(plotCanvas, pctx);
}
window.addEventListener('resize', fitAll);

// ---------- controls ----------
function syncControlsFromConfig(): void {
  const c = store.get();
  $<HTMLSelectElement>('vehicle').value =
    Object.entries(VEHICLES).find(([, v]) => v.name === c.vehicle.name)?.[0] ?? 'tesla';
  ($('speed') as HTMLInputElement).value = String(Math.round(msToKmh(c.scenario.egoSpeed0)));
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

function rebuild(): void {
  pipeline = new Pipeline(store.get());
  clock.t = 0;
  series.reset();
  freezeT = 0;
  last = null;
}

$<HTMLSelectElement>('scenario').addEventListener('change', (e) => {
  const key = (e.target as HTMLSelectElement).value;
  store.patch('scenario', SCENARIOS[key]);
  syncControlsFromConfig();
  rebuild();
});
$<HTMLSelectElement>('vehicle').addEventListener('change', (e) => {
  store.patch('vehicle', VEHICLES[(e.target as HTMLSelectElement).value]);
  rebuild();
});
$('speed').addEventListener('input', (e) => {
  store.patch('scenario', { egoSpeed0: kmhToMs(+(e.target as HTMLInputElement).value) });
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
  $('play').textContent = clock.paused ? 'Play' : 'Pause';
});
$('step').addEventListener('click', () => clock.step(40));
$('restart').addEventListener('click', rebuild);

// ---------- render ----------
function render(f: Frame): void {
  drawScene(wctx, f, store.get().scenario.leadRange0, worldW, worldH);

  $('hud').innerHTML =
    `<div class="row" style="color:${COLORS.cyan}">${msToKmh(f.egoSpeed).toFixed(0)} <span class="k">km/h</span></div>` +
    `<div class="row" style="color:${f.detected ? COLORS.est : COLORS.red}">${
      f.estRange != null ? f.estRange.toFixed(1) : '-- LOST'
    } <span class="k">m · LiDAR</span></div>`;

  const banner = $('banner');
  if (f.outcome === 'COLLISION') setBanner(banner, 'COLLISION', COLORS.red);
  else if (f.outcome === 'STOPPED') setBanner(banner, 'STOPPED SAFELY', COLORS.green);
  else if (f.decision.inevitable) setBanner(banner, 'COLLISION IMMINENT', COLORS.red);
  else banner.style.display = 'none';

  const err = f.estRange != null ? f.estRange - f.trueRange : NaN;
  $('t-true').textContent = `${f.trueRange.toFixed(1)} m`;
  $('t-est').textContent = f.estRange != null ? `${f.estRange.toFixed(1)} m` : '-- LOST';
  $('t-err').textContent = isFinite(err) ? `${err >= 0 ? '+' : ''}${err.toFixed(2)} m` : '—';
  $('t-snr').textContent = f.snr > 0 ? `${(20 * Math.log10(f.snr)).toFixed(0)} dB` : '-∞';
  $('t-ttc').textContent = isFinite(f.decision.ttc) ? `${f.decision.ttc.toFixed(1)} s` : '—';
  $('t-closing').textContent = `${msToKmh(f.estClosing).toFixed(0)} km/h`;
  $('t-dreq').textContent = `${f.decision.dReq.toFixed(1)} m`;
  const mode = $('t-mode');
  mode.textContent = f.decision.mode;
  mode.style.color = f.decision.mode === 'AEB' ? COLORS.red : f.decision.mode === 'FCW' ? COLORS.amber : COLORS.cyan;

  $('reasons').innerHTML = f.decision.reasons.map((r) => `• ${r}`).join('<br>');

  // live D_required substitution
  const c = store.get();
  const ve = f.egoSpeed;
  const lat = c.decision.tDsp + c.decision.tFilter + c.vehicle.actuatorLatency;
  const decel = c.vehicle.mu * G;
  $('eq-sub').textContent =
    `= ${ve.toFixed(1)}·${lat.toFixed(2)} + ${ve.toFixed(1)}²/(2·${decel.toFixed(2)}) + ${c.decision.safetyBuffer} ` +
    `= ${f.decision.dReq.toFixed(1)} m`;

  series.draw(pctx, plotW, plotH);
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
    if (last.outcome === 'RUNNING') series.push({ true: last.trueRange, est: last.estRange ?? NaN });
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
fitAll();
requestAnimationFrame(frame);

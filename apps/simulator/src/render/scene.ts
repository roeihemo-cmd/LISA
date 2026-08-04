import type { Frame } from '../sim/pipeline';
import { COLORS } from './theme';
import { drawVehicleRear, drawPedestrian, drawBall, type VehicleVisual } from './vehicles';

export interface SceneOpts {
  egoVisual: VehicleVisual;
  fogAlpha: number;
  scroll: number; // metres travelled, for animation
  jam?: boolean; // traffic-jam decor (side-lane cars + red light)
}

const JAM_CARS: VehicleVisual[] = [
  { kind: 'compact', body: '#5f7488', cab: '#0e1a24', trim: '#9fb3c8' },
  { kind: 'sedan', body: '#7a8a5f', cab: '#0e1a24', trim: '#c8d69f' },
  { kind: 'sedan', body: '#8f5560', cab: '#0e1a24', trim: '#ffb020' },
];

/** A full-width road-works barrier that blocks the whole road, plus a row of cones. */
function drawRoadBlock(ctx: CanvasRenderingContext2D, xL: number, xR: number, baseY: number, s: number): void {
  const w = xR - xL;
  const h = Math.max(18, 40 * s);
  const y = baseY - h;
  ctx.save();
  ctx.fillStyle = '#1b1f27';
  ctx.fillRect(xL, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(xL, y, w, h);
  ctx.clip();
  const st = Math.max(12, 22 * s);
  for (let i = -h; i < w + h; i += st * 2) {
    ctx.fillStyle = '#ffb020';
    ctx.beginPath();
    ctx.moveTo(xL + i, y);
    ctx.lineTo(xL + i + st, y);
    ctx.lineTo(xL + i + st - h, y + h);
    ctx.lineTo(xL + i - h, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#0a0d12';
  ctx.lineWidth = Math.max(1, 2.5 * s);
  ctx.strokeRect(xL, y, w, h);
  // cones in front, across the road
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const cxp = xL + (i / n) * w;
    const ch = 22 * s;
    const bw = 15 * s;
    ctx.fillStyle = '#ff6a2a';
    ctx.beginPath();
    ctx.moveTo(cxp, baseY - ch + 6 * s);
    ctx.lineTo(cxp - bw / 2, baseY + 6 * s);
    ctx.lineTo(cxp + bw / 2, baseY + 6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(cxp - bw * 0.28, baseY - ch * 0.55, bw * 0.56, ch * 0.16);
  }
  ctx.restore();
}

const LEAD_CAR: VehicleVisual = { kind: 'sedan', body: '#8f5560', cab: '#0e1a24', trim: '#ffb020' };
const ROAD_HALF_M = 5.5; // metres centre→edge
const K = 26; // perspective curvature

// static starfield (computed once, deterministic)
const STARS: { x: number; y: number; r: number }[] = Array.from({ length: 70 }, (_, i) => ({
  x: ((i * 137.5) % 100) / 100,
  y: ((i * 61.7) % 100) / 100,
  r: 0.4 + ((i * 29) % 10) / 10,
}));

/** Forward chase-cam driving view: a world receding to the horizon. */
export function drawScene(ctx: CanvasRenderingContext2D, frame: Frame, opts: SceneOpts, W: number, H: number): void {
  const cx = W / 2;
  const horizonY = Math.round(H * 0.34);
  const bottomY = H;
  const nearHalfPx = W * 0.47;
  const pxPerM = nearHalfPx / ROAD_HALF_M;
  const t = (d: number): number => K / (K + Math.max(0, d));
  const proj = (d: number, lat: number): { x: number; y: number; s: number } => {
    const tt = t(d);
    return { x: cx + lat * pxPerM * tt, y: horizonY + (bottomY - horizonY) * tt, s: tt };
  };
  const foggy = opts.fogAlpha > 0.06;

  // ---- sky (dusk gradient) ----
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  sky.addColorStop(0, '#05070d');
  sky.addColorStop(0.6, '#0d1626');
  sky.addColorStop(1, '#243247');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizonY);
  // stars + moon + clouds
  if (!foggy) {
    ctx.fillStyle = 'rgba(220,230,245,.55)';
    for (const s of STARS) {
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * horizonY * 0.8, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // moon
    const mx = W * 0.8;
    const my = horizonY * 0.3;
    const mg = ctx.createRadialGradient(mx, my, 2, mx, my, 30);
    mg.addColorStop(0, 'rgba(232,239,250,.85)');
    mg.addColorStop(1, 'rgba(232,239,250,0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(mx, my, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0e8f4';
    ctx.beginPath();
    ctx.arc(mx, my, 12, 0, Math.PI * 2);
    ctx.fill();
    // drifting clouds
    ctx.fillStyle = 'rgba(28,38,56,.55)';
    const cp = (opts.scroll * 0.12) % (W + 160);
    for (let i = 0; i < 4; i++) {
      const clx = (((i * 190 - cp) % (W + 160)) + W + 160) % (W + 160) - 80;
      const cly = horizonY * (0.24 + (i % 3) * 0.13);
      for (const [ox, oy, rr2] of [[-16, 4, 12], [0, 0, 16], [16, 4, 12], [4, 6, 13]] as const) {
        ctx.beginPath();
        ctx.ellipse(clx + ox, cly + oy, rr2, rr2 * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // horizon sun-glow
  const sun = ctx.createRadialGradient(cx, horizonY, 4, cx, horizonY, W * 0.5);
  sun.addColorStop(0, 'rgba(255,180,120,.22)');
  sun.addColorStop(1, 'rgba(255,180,120,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, horizonY - H * 0.22, W, H * 0.22);

  // ---- distant skyline silhouette ----
  if (!foggy) {
    ctx.fillStyle = '#0a1019';
    const par = (opts.scroll * 0.4) % 60;
    for (let i = -1; i < 24; i++) {
      const bx = i * 60 - par;
      const bw = 26 + ((i * 37) % 30);
      const bh = 10 + ((i * 53) % 34);
      ctx.fillRect(bx, horizonY - bh, bw, bh);
    }
  }

  // ---- ground (roadside) ----
  const ground = ctx.createLinearGradient(0, horizonY, 0, bottomY);
  ground.addColorStop(0, '#0a1512');
  ground.addColorStop(1, '#0f1a14');
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizonY, W, H - horizonY);

  // ---- road surface ----
  const nl = proj(0, -ROAD_HALF_M);
  const nr = proj(0, ROAD_HALF_M);
  const fl = proj(500, -ROAD_HALF_M);
  const fr = proj(500, ROAD_HALF_M);
  const roadGrad = ctx.createLinearGradient(0, horizonY, 0, bottomY);
  roadGrad.addColorStop(0, '#12181f');
  roadGrad.addColorStop(1, '#232c38');
  ctx.fillStyle = roadGrad;
  ctx.beginPath();
  ctx.moveTo(nl.x, nl.y);
  ctx.lineTo(fl.x, fl.y);
  ctx.lineTo(fr.x, fr.y);
  ctx.lineTo(nr.x, nr.y);
  ctx.closePath();
  ctx.fill();

  // subtle asphalt scan lines for a sense of speed
  ctx.strokeStyle = 'rgba(255,255,255,.03)';
  ctx.lineWidth = 1;
  const tphase = opts.scroll % 4;
  for (let d = -tphase; d < 140; d += 4) {
    if (d < 0) continue;
    const a = proj(d, -ROAD_HALF_M);
    const b = proj(d, ROAD_HALF_M);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // solid edge lines
  ctx.strokeStyle = 'rgba(220,228,240,.55)';
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    const a = proj(0, side * (ROAD_HALF_M - 0.35));
    const b = proj(500, side * (ROAD_HALF_M - 0.35));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // crosswalk distance (pedestrian only) — the centre line is interrupted across it
  const cwAt = frame.targetKind === 'pedestrian' && frame.trueRange > 0 && frame.trueRange < 160 ? frame.trueRange : null;

  // centre dashes
  const spacing = 9;
  const phase = opts.scroll % spacing;
  ctx.fillStyle = 'rgba(240,224,150,.8)';
  for (let d = 160; d >= -phase; d -= spacing) {
    if (d < 0) continue;
    if (cwAt != null && Math.abs(d - cwAt) < 3.2) continue; // no centre line over the crosswalk
    const a = proj(d, 0);
    const b = proj(d + 3.5, 0);
    const wa = Math.max(0.8, 3.2 * a.s);
    const wb = Math.max(0.4, 3.2 * b.s);
    ctx.beginPath();
    ctx.moveTo(a.x - wa, a.y);
    ctx.lineTo(a.x + wa, a.y);
    ctx.lineTo(b.x + wb, b.y);
    ctx.lineTo(b.x - wb, b.y);
    ctx.closePath();
    ctx.fill();
  }

  // ---- roadside furniture (guardrail posts + streetlights), far→near ----
  const postPhase = opts.scroll % 10;
  for (let d = 150; d >= -postPhase; d -= 10) {
    if (d < 1) continue;
    const s = t(d);
    for (const side of [-1, 1]) {
      const g = proj(d, side * (ROAD_HALF_M + 0.5));
      const hh = 1.1 * pxPerM * s;
      ctx.strokeStyle = 'rgba(150,165,185,.5)';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x, g.y - hh);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,90,90,.7)';
      ctx.fillRect(g.x - 1.5 * s, g.y - hh, 3 * s, 2 * s);
    }
  }
  const lightPhase = opts.scroll % 45;
  for (let d = 150; d >= -lightPhase; d -= 45) {
    if (d < 2) continue;
    const s = t(d);
    for (const side of [-1, 1]) {
      const base = proj(d, side * (ROAD_HALF_M + 1.6));
      const poleH = 7 * pxPerM * s;
      ctx.strokeStyle = 'rgba(90,105,125,.7)';
      ctx.lineWidth = Math.max(1, 2.5 * s);
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.lineTo(base.x, base.y - poleH);
      ctx.lineTo(base.x - side * 12 * s, base.y - poleH);
      ctx.stroke();
      const lamp = ctx.createRadialGradient(base.x - side * 12 * s, base.y - poleH, 0, base.x - side * 12 * s, base.y - poleH, 30 * s);
      lamp.addColorStop(0, 'rgba(255,220,150,.5)');
      lamp.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = lamp;
      ctx.beginPath();
      ctx.arc(base.x - side * 12 * s, base.y - poleH, 30 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- estimated-range tick ----
  if (frame.estRange != null && frame.estRange < 160) {
    const el = proj(frame.estRange, -ROAD_HALF_M + 0.4);
    const er = proj(frame.estRange, ROAD_HALF_M - 0.4);
    ctx.strokeStyle = COLORS.est;
    ctx.globalAlpha = 0.85;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(el.x, el.y);
    ctx.lineTo(er.x, er.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // ---- LiDAR beam cone ----
  if (frame.measRange != null && frame.measRange < 160) {
    const m = proj(frame.measRange, 0);
    const g = ctx.createLinearGradient(0, bottomY, 0, m.y);
    g.addColorStop(0, 'rgba(57,217,138,.16)');
    g.addColorStop(1, 'rgba(57,217,138,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - 10, bottomY - 20);
    ctx.lineTo(m.x - 12 * m.s - 4, m.y);
    ctx.lineTo(m.x + 12 * m.s + 4, m.y);
    ctx.lineTo(cx + 10, bottomY - 20);
    ctx.closePath();
    ctx.fill();
  }

  // ---- crosswalk (zebra) under a crossing pedestrian only ----
  if (cwAt != null) {
    const dc = cwAt;
    // darker asphalt band so the white bars stand out
    const q = [proj(dc - 3, -ROAD_HALF_M + 0.3), proj(dc - 3, ROAD_HALF_M - 0.3), proj(dc + 3, ROAD_HALF_M - 0.3), proj(dc + 3, -ROAD_HALF_M + 0.3)];
    ctx.fillStyle = '#0d131b';
    ctx.beginPath();
    ctx.moveTo(q[0].x, q[0].y);
    ctx.lineTo(q[1].x, q[1].y);
    ctx.lineTo(q[2].x, q[2].y);
    ctx.lineTo(q[3].x, q[3].y);
    ctx.closePath();
    ctx.fill();
    // bright white bars along travel direction
    ctx.fillStyle = '#f4f7fb';
    for (let lat = -4.2; lat <= 4.2; lat += 1.5) {
      const a = proj(dc - 2.5, lat - 0.4);
      const b = proj(dc - 2.5, lat + 0.4);
      const cc = proj(dc + 2.5, lat + 0.4);
      const dd = proj(dc + 2.5, lat - 0.4);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(cc.x, cc.y);
      ctx.lineTo(dd.x, dd.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---- traffic-jam decor: stopped cars in side lanes + a red light ----
  if (opts.jam && frame.trueRange > 0 && frame.trueRange < 200) {
    for (let i = 0; i < 3; i++) {
      const d = frame.trueRange + i * 13;
      for (const side of [-1, 1]) {
        const p = proj(d, side * 3.6);
        if (p.s > 0.06) drawVehicleRear(ctx, p.x, p.y, Math.max(0.1, p.s), JAM_CARS[(i + (side > 0 ? 1 : 0)) % 3], true);
      }
    }
    // large overhead traffic light on a gantry above the queue
    const gd = frame.trueRange + 6;
    const lft = proj(gd, -ROAD_HALF_M);
    const rgt = proj(gd, ROAD_HALF_M);
    const s = Math.max(0.14, proj(gd, 0).s);
    const beamY = lft.y - 120 * s;
    ctx.strokeStyle = '#171d27';
    ctx.lineWidth = Math.max(2, 5 * s);
    ctx.beginPath(); // posts
    ctx.moveTo(lft.x, lft.y);
    ctx.lineTo(lft.x, beamY);
    ctx.moveTo(rgt.x, rgt.y);
    ctx.lineTo(rgt.x, beamY);
    ctx.stroke();
    ctx.lineWidth = Math.max(2, 7 * s); // beam
    ctx.beginPath();
    ctx.moveTo(lft.x, beamY);
    ctx.lineTo(rgt.x, beamY);
    ctx.stroke();
    // 3-lamp housing hanging in the centre
    const cxg = (lft.x + rgt.x) / 2;
    const boxW = 26 * s;
    const boxH = 66 * s;
    ctx.fillStyle = '#0c1017';
    ctx.strokeStyle = '#2a3342';
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.fillRect(cxg - boxW / 2, beamY, boxW, boxH);
    ctx.strokeRect(cxg - boxW / 2, beamY, boxW, boxH);
    const lampR = boxW * 0.3;
    const lamps: [number, string, boolean][] = [
      [beamY + boxH * 0.2, '#ff2d3a', true],
      [beamY + boxH * 0.5, '#3a2f16', false],
      [beamY + boxH * 0.8, '#16321f', false],
    ];
    for (const [ly, col, lit] of lamps) {
      if (lit) {
        ctx.shadowColor = col;
        ctx.shadowBlur = 22 * s;
      }
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(cxg, ly, lampR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // ---- target ---- (clamp its base so it never overlaps the ego — a real gap stays visible)
  if (frame.trueRange > 0 && frame.trueRange < 320) {
    const p = proj(frame.trueRange, frame.targetLat);
    const s = Math.max(0.12, p.s);
    const gapCap = bottomY - 132;
    const py = Math.min(p.y, gapCap);
    switch (frame.targetKind) {
      case 'obstacle': {
        const l = proj(frame.trueRange, -ROAD_HALF_M);
        const r = proj(frame.trueRange, ROAD_HALF_M);
        drawRoadBlock(ctx, l.x, r.x, Math.min(l.y, gapCap), s);
        break;
      }
      case 'pedestrian':
        drawPedestrian(ctx, p.x, py, s, false, opts.scroll);
        break;
      case 'child': {
        drawPedestrian(ctx, p.x, py, s, true, opts.scroll);
        const b = proj(frame.trueRange, frame.targetLat + 1.0);
        drawBall(ctx, b.x, Math.min(b.y, gapCap), Math.max(0.12, b.s));
        break;
      }
      default:
        drawVehicleRear(ctx, p.x, py, s, LEAD_CAR, frame.leadSpeed < 0.3 || frame.decision.brake);
    }
  }

  // ---- ego ----
  drawVehicleRear(ctx, cx, bottomY - 6, 0.9, opts.egoVisual, frame.decision.brake);

  // ---- fog veil ----
  if (opts.fogAlpha > 0.03) {
    const a = Math.min(0.92, opts.fogAlpha * 3.4);
    const fg = ctx.createLinearGradient(0, horizonY - 30, 0, bottomY);
    fg.addColorStop(0, `rgba(206,213,223,${a})`);
    fg.addColorStop(0.5, `rgba(206,213,223,${a * 0.5})`);
    fg.addColorStop(1, `rgba(206,213,223,${a * 0.1})`);
    ctx.fillStyle = fg;
    ctx.fillRect(0, horizonY - 30, W, H - horizonY + 30);
  }

  // ---- vignette ----
  const vig = ctx.createRadialGradient(cx, H * 0.55, H * 0.3, cx, H * 0.55, H * 0.85);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

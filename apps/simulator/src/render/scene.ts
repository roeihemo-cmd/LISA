import type { Frame } from '../sim/pipeline';
import { COLORS } from './theme';
import { drawVehicleRear, drawRoadworks, type VehicleVisual } from './vehicles';

export interface SceneOpts {
  egoVisual: VehicleVisual;
  leadKind: 'car' | 'obstacle';
  fogAlpha: number;
  scroll: number; // metres travelled, for lane-dash animation
}

const LEAD_CAR: VehicleVisual = { kind: 'sedan', body: '#8f5050', cab: '#101c26', trim: '#ffb020' };
const ROAD_HALF_M = 5.5; // metres centre→edge
const K = 26; // perspective curvature

/** Forward chase-cam driving view: the world receding to a horizon. */
export function drawScene(ctx: CanvasRenderingContext2D, frame: Frame, opts: SceneOpts, W: number, H: number): void {
  const cx = W / 2;
  const horizonY = H * 0.3;
  const bottomY = H;
  const nearHalfPx = W * 0.47;
  const pxPerM = nearHalfPx / ROAD_HALF_M;
  const t = (d: number): number => K / (K + Math.max(0, d));
  const proj = (d: number, lat: number): { x: number; y: number; s: number } => {
    const tt = t(d);
    return { x: cx + lat * pxPerM * tt, y: horizonY + (bottomY - horizonY) * tt, s: tt };
  };

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  sky.addColorStop(0, '#070c14');
  sky.addColorStop(1, '#132236');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizonY);
  // ground
  ctx.fillStyle = '#0a1119';
  ctx.fillRect(0, horizonY, W, H - horizonY);
  // distant horizon glow
  const glow = ctx.createLinearGradient(0, horizonY - 30, 0, horizonY + 10);
  glow.addColorStop(0, 'rgba(0,224,255,0)');
  glow.addColorStop(1, 'rgba(0,224,255,.10)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, horizonY - 30, W, 40);

  // road surface (trapezoid to the horizon)
  const nl = proj(0, -ROAD_HALF_M);
  const nr = proj(0, ROAD_HALF_M);
  const fl = proj(400, -ROAD_HALF_M);
  const fr = proj(400, ROAD_HALF_M);
  const roadGrad = ctx.createLinearGradient(0, horizonY, 0, bottomY);
  roadGrad.addColorStop(0, '#10161f');
  roadGrad.addColorStop(1, '#1a222e');
  ctx.fillStyle = roadGrad;
  ctx.beginPath();
  ctx.moveTo(nl.x, nl.y);
  ctx.lineTo(fl.x, fl.y);
  ctx.lineTo(fr.x, fr.y);
  ctx.lineTo(nr.x, nr.y);
  ctx.closePath();
  ctx.fill();

  // edge lines
  ctx.strokeStyle = 'rgba(200,210,225,.5)';
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    const a = proj(0, side * (ROAD_HALF_M - 0.4));
    const b = proj(400, side * (ROAD_HALF_M - 0.4));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // centre dashes (animated by travelled distance)
  const spacing = 8;
  const dashLen = 3.5;
  const phase = opts.scroll % spacing;
  ctx.fillStyle = 'rgba(220,225,235,.55)';
  for (let d = -phase; d < 160; d += spacing) {
    if (d < 0) continue;
    const a = proj(d, 0);
    const b = proj(d + dashLen, 0);
    const wa = Math.max(1, 3 * a.s);
    const wb = Math.max(0.5, 3 * b.s);
    ctx.beginPath();
    ctx.moveTo(a.x - wa, a.y);
    ctx.lineTo(a.x + wa, a.y);
    ctx.lineTo(b.x + wb, b.y);
    ctx.lineTo(b.x - wb, b.y);
    ctx.closePath();
    ctx.fill();
  }

  // estimated-range marker (what the car believes) — a tick across the road
  if (frame.estRange != null && frame.estRange < 160) {
    const el = proj(frame.estRange, -ROAD_HALF_M + 0.4);
    const er = proj(frame.estRange, ROAD_HALF_M - 0.4);
    ctx.strokeStyle = COLORS.est;
    ctx.globalAlpha = 0.8;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(el.x, el.y);
    ctx.lineTo(er.x, er.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // LiDAR beam cone from ego up to the measured range
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

  // lead vehicle / obstacle at its TRUE distance
  if (frame.trueRange > 0 && frame.trueRange < 320) {
    const p = proj(frame.trueRange, 0);
    if (opts.leadKind === 'obstacle') drawRoadworks(ctx, p.x, p.y, Math.max(0.12, p.s));
    else drawVehicleRear(ctx, p.x, p.y, Math.max(0.12, p.s), LEAD_CAR, frame.leadSpeed < 0.3 || frame.decision.brake);
  }

  // ego (chase cam, bottom)
  drawVehicleRear(ctx, cx, bottomY - 6, 1.0, opts.egoVisual, frame.decision.brake);

  // fog veil (denser toward the horizon)
  if (opts.fogAlpha > 0.03) {
    const a = Math.min(0.92, opts.fogAlpha * 3.4);
    const fg = ctx.createLinearGradient(0, horizonY - 20, 0, bottomY);
    fg.addColorStop(0, `rgba(205,212,222,${a})`);
    fg.addColorStop(1, `rgba(205,212,222,${a * 0.12})`);
    ctx.fillStyle = fg;
    ctx.fillRect(0, horizonY - 20, W, H - horizonY + 20);
  }
}

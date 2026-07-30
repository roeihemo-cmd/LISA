// Detailed rear-view vehicle & obstacle sprites for the perspective driving view.
import type { VehicleKind, VehicleVisual } from '../config/schema';

export type { VehicleVisual };

const DIMS: Record<VehicleKind, { w: number; h: number }> = {
  sedan: { w: 118, h: 100 },
  compact: { w: 106, h: 98 },
  truck: { w: 156, h: 200 },
};

/** Lighten (f>1) or darken (f<1) a #rrggbb colour. */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const cl = (v: number): number => Math.max(0, Math.min(255, Math.round(v * f)));
  const r = cl((n >> 16) & 255);
  const g = cl((n >> 8) & 255);
  const b = cl(n & 255);
  return `rgb(${r},${g},${b})`;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Vehicle seen from behind, centred at cx with rear bumper at baseY. */
export function drawVehicleRear(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  scale: number,
  v: VehicleVisual,
  braking: boolean,
): void {
  if (v.kind === 'truck') return drawTruck(ctx, cx, baseY, scale, v, braking);

  const d = DIMS[v.kind];
  const w = d.w * scale;
  const h = d.h * scale;
  const x = cx - w / 2;
  const y = baseY - h;
  const sedan = v.kind === 'sedan';

  ctx.save();

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 1, w * 0.54, 7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // wheels
  ctx.fillStyle = '#0a0d12';
  const ww = w * 0.15;
  const wh = h * 0.14;
  rr(ctx, x - ww * 0.2, baseY - wh, ww, wh, 3 * scale);
  ctx.fill();
  rr(ctx, x + w - ww * 0.8, baseY - wh, ww, wh, 3 * scale);
  ctx.fill();

  // greenhouse / roof (Tesla: sleeker, lower; Corolla: taller, boxier)
  const roofW = w * (sedan ? 0.74 : 0.8);
  const roofTop = y + h * (sedan ? 0.02 : 0.0);
  const roofH = h * (sedan ? 0.44 : 0.52);
  ctx.fillStyle = v.cab;
  rr(ctx, cx - roofW / 2, roofTop, roofW, roofH, sedan ? 14 * scale : 7 * scale);
  ctx.fill();

  // rear window
  ctx.fillStyle = 'rgba(130,160,190,.30)';
  rr(ctx, cx - roofW / 2 + 6 * scale, roofTop + roofH * 0.16, roofW - 12 * scale, roofH * 0.5, 5 * scale);
  ctx.fill();

  // body (lower half, wider) with a metallic vertical gradient
  const bodyGrad = ctx.createLinearGradient(0, y + h * 0.4, 0, baseY);
  bodyGrad.addColorStop(0, shade(v.body, 1.25));
  bodyGrad.addColorStop(0.45, v.body);
  bodyGrad.addColorStop(1, shade(v.body, 0.7));
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = 'rgba(0,0,0,.3)';
  ctx.lineWidth = Math.max(1, 1.4 * scale);
  rr(ctx, x, y + h * 0.4, w, h * 0.6, sedan ? 13 * scale : 8 * scale);
  ctx.fill();
  ctx.stroke();
  // specular highlight strip
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  rr(ctx, x + w * 0.1, y + h * 0.44, w * 0.8, h * 0.05, 3 * scale);
  ctx.fill();

  // body sculpt line
  ctx.strokeStyle = 'rgba(255,255,255,.10)';
  ctx.lineWidth = Math.max(1, 1.2 * scale);
  ctx.beginPath();
  ctx.moveTo(x + 4 * scale, y + h * 0.6);
  ctx.lineTo(x + w - 4 * scale, y + h * 0.6);
  ctx.stroke();

  // tail lights
  const tlY = y + h * 0.62;
  const tlH = h * 0.13;
  const lit = braking ? '#ff2d3a' : '#8a1a24';
  if (braking) {
    ctx.shadowColor = '#ff2d3a';
    ctx.shadowBlur = 16 * scale;
  }
  ctx.fillStyle = lit;
  if (sedan) {
    // Tesla: full-width light bar
    rr(ctx, x + 10 * scale, tlY, w - 20 * scale, tlH * 0.7, 3 * scale);
    ctx.fill();
  } else {
    // Corolla: corner clusters
    const cw = w * 0.22;
    rr(ctx, x + 8 * scale, tlY, cw, tlH, 3 * scale);
    ctx.fill();
    rr(ctx, x + w - 8 * scale - cw, tlY, cw, tlH, 3 * scale);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // plate
  ctx.fillStyle = 'rgba(230,235,240,.5)';
  rr(ctx, cx - w * 0.13, y + h * 0.84, w * 0.26, h * 0.09, 2 * scale);
  ctx.fill();

  ctx.restore();
}

function drawTruck(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  scale: number,
  v: VehicleVisual,
  braking: boolean,
): void {
  const d = DIMS.truck;
  const w = d.w * scale;
  const h = d.h * scale;
  const x = cx - w / 2;
  const y = baseY - h;

  ctx.save();
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 1, w * 0.55, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // wheels (dual)
  ctx.fillStyle = '#0a0d12';
  for (const dx of [-0.42, -0.3, 0.3, 0.42]) {
    rr(ctx, cx + dx * w - 7 * scale, baseY - 20 * scale, 14 * scale, 20 * scale, 3 * scale);
    ctx.fill();
  }

  // trailer box
  ctx.fillStyle = v.body;
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = Math.max(1, 1.6 * scale);
  rr(ctx, x, y, w, h - 16 * scale, 6 * scale);
  ctx.fill();
  ctx.stroke();

  // rear doors seam
  ctx.strokeStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.moveTo(cx, y + 8 * scale);
  ctx.lineTo(cx, y + h - 24 * scale);
  ctx.stroke();
  rr(ctx, x + w * 0.44, y + h * 0.4, w * 0.12, h * 0.06, 2 * scale); // handles
  ctx.fillStyle = '#1b222c';
  ctx.fill();

  // hazard chevrons along the bottom
  ctx.save();
  rr(ctx, x + 4 * scale, y + h - 40 * scale, w - 8 * scale, 20 * scale, 3 * scale);
  ctx.clip();
  const s = 18 * scale;
  for (let i = -h; i < w + h; i += s * 2) {
    ctx.fillStyle = i % (s * 4) < s * 2 ? '#ffb020' : '#1b1f27';
    ctx.beginPath();
    ctx.moveTo(x + i, y + h - 40 * scale);
    ctx.lineTo(x + i + s, y + h - 40 * scale);
    ctx.lineTo(x + i + s - 20 * scale, y + h - 20 * scale);
    ctx.lineTo(x + i - 20 * scale, y + h - 20 * scale);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // tail lights + marker lights
  const lit = braking ? '#ff2d3a' : '#8a1a24';
  if (braking) {
    ctx.shadowColor = '#ff2d3a';
    ctx.shadowBlur = 18 * scale;
  }
  ctx.fillStyle = lit;
  rr(ctx, x + 8 * scale, y + h - 60 * scale, w * 0.16, 14 * scale, 3 * scale);
  ctx.fill();
  rr(ctx, x + w - 8 * scale - w * 0.16, y + h - 60 * scale, w * 0.16, 14 * scale, 3 * scale);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffb020';
  for (const dx of [-0.3, -0.1, 0.1, 0.3]) ctx.fillRect(cx + dx * w, y + 4 * scale, 6 * scale, 4 * scale);

  ctx.restore();
}

/** Road-works: striped barrier + cones. */
export function drawRoadworks(ctx: CanvasRenderingContext2D, cx: number, baseY: number, scale: number): void {
  const w = 150 * scale;
  const h = 44 * scale;
  const x = cx - w / 2;
  const y = baseY - h;
  ctx.save();
  rr(ctx, x, y, w, h, 4 * scale);
  ctx.fillStyle = '#1b1f27';
  ctx.fill();
  ctx.save();
  ctx.clip();
  const s = 16 * scale;
  for (let i = -h; i < w + h; i += s * 2) {
    ctx.fillStyle = '#ffb020';
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + s, y);
    ctx.lineTo(x + i + s - h, y + h);
    ctx.lineTo(x + i - h, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#0a0d12';
  ctx.lineWidth = 2 * scale;
  rr(ctx, x, y, w, h, 4 * scale);
  ctx.stroke();
  for (const dx of [-w * 0.36, 0, w * 0.36]) cone(ctx, cx + dx, baseY + 6 * scale, scale);
  ctx.restore();
}

function cone(ctx: CanvasRenderingContext2D, cx: number, baseY: number, scale: number): void {
  const hh = 26 * scale;
  const bw = 18 * scale;
  ctx.fillStyle = '#ff6a2a';
  ctx.beginPath();
  ctx.moveTo(cx, baseY - hh);
  ctx.lineTo(cx - bw / 2, baseY);
  ctx.lineTo(cx + bw / 2, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(cx - bw * 0.28, baseY - hh * 0.62, bw * 0.56, hh * 0.16);
}

function limb(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  wdt: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = wdt;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/** A side-view walking person, feet at baseY. Legs/arms swing with `scroll`. */
export function drawPedestrian(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  scale: number,
  isChild: boolean,
  scroll: number,
): void {
  const H = (isChild ? 38 : 58) * scale;
  const sw = Math.sin(scroll * 0.7 + (isChild ? 1 : 0));
  const skin = isChild ? '#f2c191' : '#e2cba6';
  const shirt = isChild ? '#ff6a2a' : '#6f7f92';
  const shirtDark = isChild ? '#d8531c' : '#5a6879';
  const pants = isChild ? '#2f5aa8' : '#3a424e';

  const hipY = baseY - H * 0.44;
  const legLen = H * 0.44;
  const shoulderX = cx + H * 0.03;
  const shoulderY = baseY - H * 0.8;

  ctx.save();
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY, H * 0.24, 3 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // back leg then front leg (stride)
  const aB = -0.45 * sw;
  const aF = 0.45 * sw;
  limb(ctx, cx, hipY, cx + Math.sin(aB) * legLen, hipY + Math.cos(aB) * legLen, H * 0.11, pants);
  // back arm
  limb(ctx, shoulderX, shoulderY, shoulderX + Math.sin(0.4 * sw) * H * 0.34, shoulderY + Math.cos(0.4 * sw) * H * 0.32, H * 0.08, shirtDark);
  // torso
  limb(ctx, cx, hipY, shoulderX, shoulderY, H * 0.2, shirt);
  // front leg
  limb(ctx, cx, hipY, cx + Math.sin(aF) * legLen, hipY + Math.cos(aF) * legLen, H * 0.11, pants);
  // front arm (opposite swing)
  limb(ctx, shoulderX, shoulderY, shoulderX + Math.sin(-0.4 * sw) * H * 0.34, shoulderY + Math.cos(-0.4 * sw) * H * 0.32, H * 0.09, shirt);
  // head + hair
  const hr = H * 0.12;
  const hx = shoulderX + H * 0.02;
  const hy = shoulderY - hr * 1.2;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isChild ? '#7a4a24' : '#2a2f38';
  ctx.beginPath();
  ctx.arc(hx, hy - hr * 0.25, hr * 0.95, Math.PI * 1.05, Math.PI * 2.1);
  ctx.fill();
  ctx.restore();
}

export function drawBall(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
  const r = 9 * scale;
  ctx.fillStyle = '#ff6a2a';
  ctx.strokeStyle = '#7a2d10';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// Detailed rear-view vehicle & obstacle sprites for the perspective driving view.
import type { VehicleKind, VehicleVisual } from '../config/schema';

export type { VehicleVisual };

const DIMS: Record<VehicleKind, { w: number; h: number; roof: number }> = {
  sedan: { w: 116, h: 104, roof: 0.62 },
  compact: { w: 104, h: 96, roof: 0.6 },
  truck: { w: 150, h: 176, roof: 0.82 },
};

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

/** Draw a vehicle seen from behind, centred at (cx) with its base (rear bumper) at baseY. */
export function drawVehicleRear(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  scale: number,
  v: VehicleVisual,
  braking: boolean,
): void {
  const d = DIMS[v.kind];
  const w = d.w * scale;
  const h = d.h * scale;
  const x = cx - w / 2;
  const y = baseY - h;

  ctx.save();

  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 2 * scale, w * 0.52, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // wheels
  ctx.fillStyle = '#0a0d12';
  const ww = w * 0.16;
  const wh = h * 0.16;
  rr(ctx, x - ww * 0.3, baseY - wh, ww, wh, 3 * scale);
  ctx.fill();
  rr(ctx, x + w - ww * 0.7, baseY - wh, ww, wh, 3 * scale);
  ctx.fill();

  // body
  ctx.fillStyle = v.body;
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  rr(ctx, x, y, w, h, 10 * scale);
  ctx.fill();
  ctx.stroke();

  // roof / cab (narrower, on top)
  const roofH = h * (v.kind === 'truck' ? 0.5 : 0.4);
  const roofW = w * 0.82;
  ctx.fillStyle = v.cab;
  rr(ctx, cx - roofW / 2, y + h * 0.06, roofW, roofH, 8 * scale);
  ctx.fill();

  // rear window
  ctx.fillStyle = 'rgba(120,150,180,.28)';
  rr(ctx, cx - roofW / 2 + 6 * scale, y + h * 0.1, roofW - 12 * scale, roofH * 0.5, 5 * scale);
  ctx.fill();

  // trim accent line
  ctx.strokeStyle = v.trim;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(1, 1.4 * scale);
  ctx.beginPath();
  ctx.moveTo(x + 5 * scale, y + h * 0.62);
  ctx.lineTo(x + w - 5 * scale, y + h * 0.62);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // tail lights
  const tlW = w * 0.2;
  const tlH = h * 0.12;
  const tlY = y + h - tlH - 6 * scale;
  const lit = braking ? '#ff2d3a' : '#7a1520';
  if (braking) {
    ctx.shadowColor = '#ff2d3a';
    ctx.shadowBlur = 18 * scale;
  }
  ctx.fillStyle = lit;
  rr(ctx, x + 7 * scale, tlY, tlW, tlH, 3 * scale);
  ctx.fill();
  rr(ctx, x + w - 7 * scale - tlW, tlY, tlW, tlH, 3 * scale);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

/** Road-works: striped barrier + cones. */
export function drawRoadworks(ctx: CanvasRenderingContext2D, cx: number, baseY: number, scale: number): void {
  const w = 150 * scale;
  const h = 44 * scale;
  const x = cx - w / 2;
  const y = baseY - h;
  ctx.save();
  // barrier board with diagonal stripes
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
  // cones in front
  for (const dx of [-w * 0.36, 0, w * 0.36]) {
    cone(ctx, cx + dx, baseY + 6 * scale, scale);
  }
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

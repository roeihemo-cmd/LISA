import type { Frame } from '../sim/pipeline';
import { COLORS } from './theme';
import type { VehicleVisual } from '../config/schema';

/** Top-down roundabout view. */
export function drawRoundabout(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  egoVisual: VehicleVisual,
  W: number,
  H: number,
): void {
  ctx.fillStyle = '#0a1512';
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H * 0.5;
  const R = Math.min(W, H) * 0.3;
  const laneW = R * 0.42;
  const ro = R + laneW / 2;
  const ri = R - laneW / 2;
  const islR = ri - 4;

  // approach + exit roads
  ctx.fillStyle = '#171d27';
  ctx.fillRect(cx - laneW * 0.55, cy + ri, laneW * 1.1, H - (cy + ri));
  ctx.fillRect(cx - laneW * 0.55, 0, laneW * 1.1, cy - ri);
  ctx.setLineDash([14, 14]);
  ctx.strokeStyle = 'rgba(235,238,242,.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + ri);
  ctx.lineTo(cx, H);
  ctx.moveTo(cx, cy - ri);
  ctx.lineTo(cx, 0);
  ctx.stroke();
  ctx.setLineDash([]);

  // ring road
  const rg = ctx.createRadialGradient(cx, cy, ri, cx, cy, ro);
  rg.addColorStop(0, '#1c232f');
  rg.addColorStop(1, '#12171f');
  ctx.strokeStyle = rg;
  ctx.lineWidth = laneW;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(235,238,242,.5)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, ro - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, ri + 2, 0, Math.PI * 2);
  ctx.stroke();

  // central island (curb + grass + trees)
  ctx.fillStyle = '#4a5360';
  ctx.beginPath();
  ctx.arc(cx, cy, islR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e6437';
  ctx.beginPath();
  ctx.arc(cx, cy, islR - 4, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bx = cx + Math.cos(a) * islR * 0.5;
    const by = cy + Math.sin(a) * islR * 0.5;
    ctx.fillStyle = '#164a2a';
    ctx.beginPath();
    ctx.arc(bx, by, islR * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2e8b4c';
    ctx.beginPath();
    ctx.arc(bx - 2, by - 2, islR * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // ego pose by phase (smooth heading blend into/out of the ring)
  let ex = cx;
  let ey = cy + ro;
  let eh = -Math.PI / 2;
  const rnd = frame.rnd!;
  if (rnd.phase === 'approach') {
    const t = smooth(1 - Math.min(1, rnd.approach / 55));
    ey = H + 20 - t * (H + 20 - (cy + R));
    eh = -Math.PI / 2;
  } else if (rnd.phase === 'arc') {
    ex = cx + R * Math.cos(rnd.angle);
    ey = cy + R * Math.sin(rnd.angle);
    const tan = Math.atan2(-Math.cos(rnd.angle), Math.sin(rnd.angle));
    const BL = 0.18;
    if (rnd.prog < BL) eh = lerpAng(-Math.PI / 2, tan, smooth(rnd.prog / BL));
    else if (rnd.prog > 1 - BL) eh = lerpAng(tan, -Math.PI / 2, smooth((rnd.prog - (1 - BL)) / BL));
    else eh = tan;
  } else {
    ey = cy - R - smooth(rnd.prog) * (cy - R + 40);
    eh = -Math.PI / 2;
  }

  // rotating LiDAR beam
  const bl = Math.min(W, H) * 0.22;
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(eh);
  const grad = ctx.createLinearGradient(0, 0, 0, -bl);
  grad.addColorStop(0, 'rgba(57,217,138,.18)');
  grad.addColorStop(1, 'rgba(57,217,138,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-22, -bl);
  ctx.lineTo(22, -bl);
  ctx.lineTo(10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawCarTop(ctx, ex, ey, eh, egoVisual, frame.decision.brake);

  // steering wheel glyph (bottom-left)
  drawWheel(ctx, 54, H - 54, 26, frame.egoSpeed);
}

function drawCarTop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  v: VehicleVisual,
  braking: boolean,
): void {
  const w = 26;
  const h = 46;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading + Math.PI / 2);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  rrect(ctx, -w / 2 - 2, -h / 2 + 2, w + 4, h, 7);
  ctx.fill();
  // body
  ctx.fillStyle = v.body;
  ctx.strokeStyle = v.trim;
  ctx.lineWidth = 1.5;
  rrect(ctx, -w / 2, -h / 2, w, h, 7);
  ctx.fill();
  ctx.stroke();
  // windshield (front)
  ctx.fillStyle = 'rgba(10,20,30,.65)';
  rrect(ctx, -w / 2 + 4, -h / 2 + 5, w - 8, h * 0.28, 3);
  ctx.fill();
  // brake lights (rear)
  ctx.fillStyle = braking ? '#ff2d3a' : '#7a1520';
  if (braking) {
    ctx.shadowColor = '#ff2d3a';
    ctx.shadowBlur = 12;
  }
  ctx.fillRect(-w / 2 + 3, h / 2 - 5, 5, 3);
  ctx.fillRect(w / 2 - 8, h / 2 - 5, 5, 3);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawWheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, speed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = COLORS.cyan;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(Math.sin(speed * 0.2) * 0.3);
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.fillStyle = COLORS.cyan;
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}
function lerpAng(a: number, b: number, t: number): number {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

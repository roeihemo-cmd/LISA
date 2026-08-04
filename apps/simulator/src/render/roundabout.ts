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

  // ego pose by phase — tangential Bézier easements so entry/exit look natural (not robotic)
  let ex = cx;
  let ey = cy + ro;
  let eh = -Math.PI / 2;
  const rnd = frame.rnd!;
  const EA = 0.62; // merge/depart angular offset (shared → entry & exit are mirror-symmetric)
  const TH0 = Math.PI / 2 - EA; // entry merge: lower-right of the ring
  const TH1 = -Math.PI / 2 + EA; // exit depart: upper-right of the ring
  const mx0 = cx + R * Math.cos(TH0);
  const my0 = cy + R * Math.sin(TH0);
  const mt0 = Math.atan2(-Math.cos(TH0), Math.sin(TH0));
  const mx1 = cx + R * Math.cos(TH1);
  const my1 = cy + R * Math.sin(TH1);
  const mt1 = Math.atan2(-Math.cos(TH1), Math.sin(TH1));
  const preY = cy + R + 46;

  if (rnd.phase === 'approach') {
    const t = 1 - Math.min(1, rnd.approach / 55);
    if (t < 0.5) {
      ex = cx;
      ey = lerp(H + 20, preY, smooth(t / 0.5));
      eh = -Math.PI / 2;
    } else {
      const u = smooth((t - 0.5) / 0.5);
      const P: Pt[] = [[cx, preY], [cx, cy + R - 4], [mx0 - Math.cos(mt0) * 52, my0 - Math.sin(mt0) * 52], [mx0, my0]];
      const p = bez(P, u);
      const d = bezD(P, u);
      ex = p[0];
      ey = p[1];
      eh = Math.atan2(d[1], d[0]);
    }
  } else if (rnd.phase === 'arc') {
    const th = TH0 - rnd.prog * (TH0 - TH1);
    ex = cx + R * Math.cos(th);
    ey = cy + R * Math.sin(th);
    eh = Math.atan2(-Math.cos(th), Math.sin(th));
  } else {
    const p2 = Math.min(1, rnd.prog);
    if (p2 < 0.5) {
      const u = smooth(p2 / 0.5);
      const P: Pt[] = [[mx1, my1], [mx1 + Math.cos(mt1) * 52, my1 + Math.sin(mt1) * 52], [cx, cy - R + 6], [cx, cy - R - 46]];
      const p = bez(P, u);
      const d = bezD(P, u);
      ex = p[0];
      ey = p[1];
      eh = Math.atan2(d[1], d[0]);
    } else {
      ex = cx;
      ey = lerp(cy - R - 46, -40, smooth((p2 - 0.5) / 0.5));
      eh = -Math.PI / 2;
    }
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

type Pt = [number, number];
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function bez(p: Pt[], t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
    u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1],
  ];
}
function bezD(p: Pt[], t: number): Pt {
  const u = 1 - t;
  return [
    3 * u * u * (p[1][0] - p[0][0]) + 6 * u * t * (p[2][0] - p[1][0]) + 3 * t * t * (p[3][0] - p[2][0]),
    3 * u * u * (p[1][1] - p[0][1]) + 6 * u * t * (p[2][1] - p[1][1]) + 3 * t * t * (p[3][1] - p[2][1]),
  ];
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

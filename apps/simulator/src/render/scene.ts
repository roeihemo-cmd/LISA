import type { Frame } from '../sim/pipeline';
import { COLORS } from './theme';

// Top-down world view. The lead is drawn at its TRUE position; the LiDAR's
// measured/estimated range is drawn as a separate marker so the sensor error
// (truth vs perception) is visible at a glance.
export function drawScene(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  viewRange: number,
  W: number,
  H: number,
): void {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const egoY = H - 70;
  const topY = 40;
  const scale = (egoY - topY) / viewRange; // px per metre
  const laneW = Math.min(150, W * 0.34);

  // road
  ctx.fillStyle = '#0f1620';
  ctx.fillRect(cx - laneW / 2, topY - 10, laneW, egoY - topY + 30);
  ctx.strokeStyle = COLORS.edge;
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - laneW / 2, topY - 10, laneW, egoY - topY + 30);
  // centre dashes
  ctx.setLineDash([12, 14]);
  ctx.strokeStyle = 'rgba(160,175,195,.3)';
  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx, egoY);
  ctx.stroke();
  ctx.setLineDash([]);

  // range grid (every 20 m)
  ctx.fillStyle = COLORS.faint;
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  for (let r = 0; r <= viewRange; r += 20) {
    const y = egoY - r * scale;
    ctx.strokeStyle = 'rgba(88,102,117,.18)';
    ctx.beginPath();
    ctx.moveTo(cx - laneW / 2, y);
    ctx.lineTo(cx + laneW / 2, y);
    ctx.stroke();
    ctx.fillText(`${r} m`, cx + laneW / 2 + 6, y + 3);
  }

  const leadY = egoY - Math.max(0, frame.trueRange) * scale;

  // LiDAR beam cone up to the measured range
  if (frame.measRange != null) {
    const my = egoY - frame.measRange * scale;
    const grad = ctx.createLinearGradient(cx, egoY, cx, my);
    grad.addColorStop(0, 'rgba(57,217,138,.20)');
    grad.addColorStop(1, 'rgba(57,217,138,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - 6, egoY);
    ctx.lineTo(cx - 22, my);
    ctx.lineTo(cx + 22, my);
    ctx.lineTo(cx + 6, egoY);
    ctx.closePath();
    ctx.fill();
  }

  // lead vehicle (TRUE position)
  drawCar(ctx, cx, leadY, 40, 66, '#7a3038', COLORS.red);

  // estimated-range marker (what the car believes) — the green tick
  if (frame.estRange != null) {
    const ey = egoY - frame.estRange * scale;
    ctx.strokeStyle = COLORS.est;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - laneW / 2, ey);
    ctx.lineTo(cx + laneW / 2, ey);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.est;
    ctx.textAlign = 'right';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('EST', cx - laneW / 2 - 6, ey + 3);
  }

  // ego vehicle
  const egoColor = frame.decision.brake ? COLORS.red : COLORS.cyan;
  drawCar(ctx, cx, egoY, 42, 74, '#12212f', egoColor);
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  body: string,
  trim: string,
): void {
  ctx.save();
  ctx.fillStyle = body;
  ctx.strokeStyle = trim;
  ctx.lineWidth = 2;
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 8);
  ctx.fill();
  ctx.stroke();
  // windshield hint
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  roundRect(ctx, cx - w / 2 + 6, cy - h / 2 + 8, w - 12, h * 0.32, 4);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

import { COLORS } from './theme';

/** Draw a single waveform (Float32Array) with autoscale + optional threshold line. */
export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  arr: Float32Array,
  W: number,
  H: number,
  color: string,
  threshold?: number,
): void {
  ctx.clearRect(0, 0, W, H);
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of arr) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (threshold != null && threshold > hi) hi = threshold;
  const pad = 4;
  const span = hi - lo || 1;
  const y = (v: number): number => H - pad - ((v - lo) / span) * (H - 2 * pad);
  const x = (i: number): number => pad + (i / (arr.length - 1)) * (W - 2 * pad);

  if (threshold != null) {
    ctx.strokeStyle = COLORS.amber;
    ctx.globalAlpha = 0.7;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(pad, y(threshold));
    ctx.lineTo(W - pad, y(threshold));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < arr.length; i++) {
    const px = x(i);
    const py = y(arr[i]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

interface Series {
  color: string;
  data: number[];
}

/** Tiny rolling multi-series line plot with shared autoscale. */
export class TimeSeries {
  private series: Record<string, Series> = {};
  private cap: number;

  constructor(private keys: { key: string; color: string }[], cap = 260) {
    this.cap = cap;
    for (const k of keys) this.series[k.key] = { color: k.color, data: [] };
  }

  push(values: Record<string, number>): void {
    for (const k of this.keys) {
      const s = this.series[k.key];
      s.data.push(values[k.key] ?? NaN);
      if (s.data.length > this.cap) s.data.shift();
    }
  }

  reset(): void {
    for (const k of this.keys) this.series[k.key].data = [];
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.clearRect(0, 0, W, H);
    let max = 1;
    for (const k of this.keys) for (const v of this.series[k.key].data) if (isFinite(v) && v > max) max = v;
    max *= 1.1;
    const n = this.cap;
    const pad = 4;
    for (const k of this.keys) {
      const s = this.series[k.key];
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let started = false;
      s.data.forEach((v, i) => {
        if (!isFinite(v)) {
          started = false;
          return;
        }
        const x = pad + (i / (n - 1)) * (W - 2 * pad);
        const y = H - pad - (v / max) * (H - 2 * pad);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    ctx.fillStyle = COLORS.faint;
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${max.toFixed(0)} m`, W - 3, 10);
  }
}

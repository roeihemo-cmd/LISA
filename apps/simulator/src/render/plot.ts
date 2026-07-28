import { COLORS } from './theme';

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

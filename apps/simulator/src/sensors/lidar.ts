import type { LidarConfig } from '../config/schema';
import type { LidarMeasurement } from './types';
import type { TrueRange } from '../core/units';
import type { Rng } from '../core/rng';

const N_SAMPLES = 320; // N — fast-time samples, used for range-noise scaling (faithful)

// Unit-energy Gaussian pulse template norm (sqrt of sum of squares), like the
// original gaussKernel().energy — sets the matched-filter SNR gain.
function pulseShapeNorm(sigma: number): number {
  const L = Math.max(5, Math.ceil(6 * sigma) | 1);
  const c = (L - 1) / 2;
  let e = 0;
  for (let i = 0; i < L; i++) {
    const k = Math.exp(-((i - c) ** 2) / (2 * sigma * sigma));
    e += k * k;
  }
  return Math.sqrt(e);
}

/**
 * Faithful port of the original `LiDAR` object: optical radar equation with
 * Beer–Lambert extinction, matched-filter SNR, and a range measurement whose
 * noise grows as SNR falls. The WORLD passes in the true range; the LiDAR only
 * ever hands back a noisy measurement.
 */
export class Lidar {
  private sigma: number;
  private shapeNorm: number;

  constructor(noise: number) {
    this.sigma = 2 + noise * 0.8;
    this.shapeNorm = pulseShapeNorm(this.sigma);
  }

  setPulse(noise: number): void {
    this.sigma = 2 + noise * 0.8;
    this.shapeNorm = pulseShapeNorm(this.sigma);
  }

  /** Received echo amplitude: P_tx · (D²/4R²) · e^(−2αR) · ρ · gain. */
  echoAmp(range: number, cfg: LidarConfig): number {
    if (range <= 0) return 0;
    const dr = cfg.lensDiameter;
    return (
      1.0 * ((dr * dr) / (4 * range * range)) * Math.exp(-cfg.fogAlpha * 2 * range) * cfg.reflectivity * cfg.rxGain
    );
  }

  /** Measure the (true) range; returns a noisy, thresholded detection. */
  measure(range: TrueRange, cfg: LidarConfig, rng: Rng): LidarMeasurement {
    const r = range as number;
    const amp = this.echoAmp(r, cfg);
    const nf = Math.max(cfg.noise, 1e-6);
    const snr = (amp * this.shapeNorm) / nf;
    let sr = (cfg.maxRange / N_SAMPLES) * (0.5 + 6 / Math.max(snr, 1e-3));
    sr = Math.min(sr, 8);
    const detected = snr >= cfg.detThreshold;
    return {
      detected,
      measRange: detected ? r + rng.gaussian() * sr : null,
      snr,
      amp,
    };
  }
}

export interface Traces {
  recv: Float32Array; // raw received signal r(t) = echo + noise
  mf: Float32Array; // matched-filter output y(t)
  thr: number; // detection threshold (MAD-based)
  peak: number;
  pi: number; // peak index
}

function gaussRand(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Full A-scan for the visualisation plots (raw r(t) and matched filter y(t)). */
export function computeTraces(range: number, cfg: LidarConfig): Traces {
  const N = N_SAMPLES;
  const sigma = 2 + cfg.noise * 0.8;
  const L = Math.max(5, Math.ceil(6 * sigma) | 1);
  const c = (L - 1) / 2;
  const k = new Float32Array(L);
  let e = 0;
  for (let i = 0; i < L; i++) {
    k[i] = Math.exp(-((i - c) ** 2) / (2 * sigma * sigma));
    e += k[i] * k[i];
  }
  const norm = Math.sqrt(e);

  const dr = cfg.lensDiameter;
  const amp = range > 0 ? ((dr * dr) / (4 * range * range)) * Math.exp(-cfg.fogAlpha * 2 * range) * cfg.reflectivity * cfg.rxGain : 0;
  const A = Math.max(0, Math.min(amp, 3));
  const idx = Math.round(8 + sigma + (range / cfg.maxRange) * (N - 28));
  const recv = new Float32Array(N);
  for (let i = 0; i < N; i++) recv[i] = A * Math.exp(-((i - idx) ** 2) / (2 * sigma * sigma)) + gaussRand() * cfg.noise;

  const mf = new Float32Array(N);
  for (let d = 0; d < N; d++) {
    let s = 0;
    for (let j = 0; j < L; j++) {
      const ri = (d + j - c) | 0;
      if (ri >= 0 && ri < N) s += recv[ri] * k[j];
    }
    mf[d] = s / norm;
  }
  let peak = -1e9;
  let pi = 0;
  for (let i = 0; i < N; i++)
    if (mf[i] > peak) {
      peak = mf[i];
      pi = i;
    }
  const sorted = Array.from(mf).sort((a, b) => a - b);
  const med = sorted[N >> 1];
  const dev = sorted.map((x) => Math.abs(x - med)).sort((a, b) => a - b);
  const nf = Math.max(1.4826 * dev[N >> 1], 1e-6);
  return { recv, mf, thr: nf * cfg.detThreshold, peak, pi };
}

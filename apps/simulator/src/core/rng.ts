// Seeded, deterministic PRNG so every run is reproducible (and unit-testable).
// mulberry32 for the uniform stream + Box–Muller for Gaussian noise.

export class Rng {
  private s: number;

  constructor(seed: number) {
    // avoid the zero fixed-point
    this.s = (seed >>> 0) || 0x9e3779b9;
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.s |= 0;
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Standard normal N(0,1) via Box–Muller. */
  gaussian(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Sample N(mean, std). */
  normal(mean: number, std: number): number {
    return mean + std * this.gaussian();
  }
}

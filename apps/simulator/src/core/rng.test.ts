import { describe, it, expect } from 'vitest';
import { Rng } from './rng';

describe('Rng', () => {
  it('is deterministic for a given seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('produces roughly standard-normal gaussians', () => {
    const r = new Rng(7);
    let sum = 0;
    let sq = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const g = r.gaussian();
      sum += g;
      sq += g * g;
    }
    const mean = sum / n;
    const varr = sq / n - mean * mean;
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(varr - 1)).toBeLessThan(0.05);
  });
});

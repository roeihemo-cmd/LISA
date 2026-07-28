import { describe, it, expect } from 'vitest';
import { Estimator } from './estimator';
import type { LidarMeasurement } from '../sensors/types';
import { DEFAULT_CONFIG } from '../config/presets';

const cfg = DEFAULT_CONFIG.lidar;
const seen = (r: number): LidarMeasurement => ({ detected: true, measRange: r, snr: 100, amp: 1 });
const lost = (): LidarMeasurement => ({ detected: false, measRange: null, snr: 0, amp: 0 });

describe('Estimator', () => {
  it('smooths toward a constant range with ~zero closing', () => {
    const est = new Estimator(cfg);
    let out = est.update(seen(50), 0.05);
    for (let i = 0; i < 30; i++) out = est.update(seen(50), 0.05);
    expect(out.range).not.toBeNull();
    expect(out.range as number).toBeCloseTo(50, 0);
    expect(Math.abs(out.closing)).toBeLessThan(1);
  });

  it('infers closing speed from the change in measured range', () => {
    const est = new Estimator(cfg);
    let r = 60;
    let out = est.update(seen(r), 0.05);
    for (let i = 0; i < 100; i++) {
      r -= 10 * 0.05; // approaching at 10 m/s
      out = est.update(seen(r), 0.05);
    }
    expect(out.closing).toBeGreaterThan(8);
    expect(out.closing).toBeLessThan(12);
  });

  it('holds the last range briefly on dropout, then reports lost', () => {
    const est = new Estimator(cfg);
    est.update(seen(30), 0.05);
    const held = est.update(lost(), 0.1); // 0.1 s < trackHold (0.6 s)
    expect(held.range).not.toBeNull();
    let out = held;
    for (let i = 0; i < 10; i++) out = est.update(lost(), 0.1); // exceed hold
    expect(out.range).toBeNull();
  });
});

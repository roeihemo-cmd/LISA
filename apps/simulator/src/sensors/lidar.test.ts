import { describe, it, expect } from 'vitest';
import { Lidar } from './lidar';
import { Rng } from '../core/rng';
import { trueRange } from '../core/units';
import { DEFAULT_CONFIG } from '../config/presets';

const cfg = DEFAULT_CONFIG.lidar;

describe('Lidar', () => {
  it('echo amplitude falls with range (radar equation)', () => {
    const l = new Lidar(cfg.noise);
    expect(l.echoAmp(30, cfg)).toBeGreaterThan(l.echoAmp(60, cfg));
    expect(l.echoAmp(60, cfg)).toBeGreaterThan(l.echoAmp(120, cfg));
  });

  it('fog attenuates the echo (Beer–Lambert)', () => {
    const l = new Lidar(cfg.noise);
    const clear = l.echoAmp(40, { ...cfg, fogAlpha: 0.02 });
    const foggy = l.echoAmp(40, { ...cfg, fogAlpha: 0.25 });
    expect(foggy).toBeLessThan(clear);
  });

  it('measured range is unbiased around the true range when detected', () => {
    const l = new Lidar(cfg.noise);
    const rng = new Rng(3);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < 4000; i++) {
      const m = l.measure(trueRange(30), cfg, rng);
      if (m.detected && m.measRange != null) {
        sum += m.measRange;
        n++;
      }
    }
    expect(n).toBeGreaterThan(3000);
    expect(Math.abs(sum / n - 30)).toBeLessThan(0.3);
  });

  it('heavy fog blinds the sensor at long range', () => {
    const l = new Lidar(cfg.noise);
    const rng = new Rng(1);
    const m = l.measure(trueRange(100), { ...cfg, fogAlpha: 0.25 }, rng);
    expect(m.detected).toBe(false);
  });
});

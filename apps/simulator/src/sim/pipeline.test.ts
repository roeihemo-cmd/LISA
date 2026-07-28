import { describe, it, expect } from 'vitest';
import { Pipeline } from './pipeline';
import { DEFAULT_CONFIG } from '../config/presets';
import { VEHICLES, SCENARIOS } from '../config/presets';
import { kmhToMs } from '../core/units';

describe('pipeline (end-to-end)', () => {
  it('reaches a terminal outcome (stopped or collision)', () => {
    const p = new Pipeline(structuredClone(DEFAULT_CONFIG));
    let outcome = 'RUNNING';
    for (let i = 0; i < 40000; i++) {
      const f = p.tick(0.005);
      outcome = f.outcome;
      if (outcome !== 'RUNNING') break;
    }
    expect(['STOPPED', 'COLLISION']).toContain(outcome);
  });

  it('is deterministic for a fixed seed', () => {
    const a = new Pipeline(structuredClone(DEFAULT_CONFIG));
    const b = new Pipeline(structuredClone(DEFAULT_CONFIG));
    for (let i = 0; i < 500; i++) {
      const fa = a.tick(0.005);
      const fb = b.tick(0.005);
      expect(fa.trueRange).toBe(fb.trueRange);
      expect(fa.estRange).toBe(fb.estRange);
    }
  });

  it('a slow ego in fog stops in time; a fast ego collides', () => {
    const slow = structuredClone(DEFAULT_CONFIG);
    slow.scenario = { ...SCENARIOS.stalled, egoSpeed0: kmhToMs(25) };
    slow.lidar = { ...slow.lidar, fogAlpha: 0.18 };
    slow.vehicle = VEHICLES.tesla;

    const fast = structuredClone(slow);
    fast.scenario = { ...slow.scenario, egoSpeed0: kmhToMs(90) };

    const run = (cfg: typeof slow): string => {
      const p = new Pipeline(cfg);
      for (let i = 0; i < 60000; i++) {
        const f = p.tick(0.005);
        if (f.outcome !== 'RUNNING') return f.outcome;
      }
      return 'RUNNING';
    };

    expect(run(slow)).toBe('STOPPED');
    expect(run(fast)).toBe('COLLISION');
  });
});

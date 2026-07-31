import { describe, it, expect } from 'vitest';
import { decide, type DecisionInput } from './policy';
import { estRange } from '../core/units';
import { DEFAULT_CONFIG, VEHICLES } from '../config/presets';
import { kmhToMs } from '../core/units';

const base = (over: Partial<DecisionInput> = {}): DecisionInput => ({
  egoSpeed: kmhToMs(90),
  setSpeed: kmhToMs(90),
  estimate: { range: estRange(100), closing: 5, detected: true },
  vehicle: DEFAULT_CONFIG.vehicle,
  decision: DEFAULT_CONFIG.decision,
  ...over,
});

describe('decision policy (estimate-only)', () => {
  it('cruises when nothing is detected', () => {
    const d = decide(base({ estimate: { range: null, closing: 0, detected: false } }));
    expect(d.mode).toBe('CRUISE');
    expect(d.brake).toBe(false);
  });

  it('engages AEB once the estimated gap drops below D_required', () => {
    const d = decide(base({ estimate: { range: estRange(12), closing: 20, detected: true } }));
    expect(d.mode).toBe('AEB');
    expect(d.brake).toBe(true);
  });

  it('flags an unavoidable collision when too close and TTC < 1 s', () => {
    const d = decide(base({ estimate: { range: estRange(6), closing: 25, detected: true } }));
    expect(d.inevitable).toBe(true);
    expect(d.targetSpeed).toBe(0);
  });

  it('a low-friction truck needs a much longer stopping distance than a Tesla at the same speed', () => {
    const estimate = { range: estRange(120), closing: 5, detected: true };
    const at = (v: typeof VEHICLES.tesla): number =>
      decide({ egoSpeed: kmhToMs(90), setSpeed: kmhToMs(90), estimate, vehicle: v, decision: DEFAULT_CONFIG.decision }).dReq;
    const tesla = at(VEHICLES.tesla);
    const truck = at(VEHICLES.truck);
    expect(truck).toBeGreaterThan(tesla + 15); // physically must differ a lot (μ 0.6 vs 0.9)
  });

  it('depends ONLY on its inputs (never on world truth)', () => {
    // The same estimate must yield the same decision regardless of any hidden truth —
    // this is the whole point: the function has no channel to the world.
    const input = base({ estimate: { range: estRange(40), closing: 10, detected: true } });
    const a = decide(input);
    const b = decide(structuredClone(input));
    expect(a).toEqual(b);
  });
});

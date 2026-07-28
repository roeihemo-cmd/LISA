import { describe, it, expect } from 'vitest';
import { Vehicle } from './dynamics';
import type { DecisionState } from '../decision/types';
import { VEHICLES, DEFAULT_CONFIG } from '../config/presets';
import { G } from '../core/units';

const brakeCmd: DecisionState = {
  mode: 'AEB',
  brake: true,
  targetSpeed: 0,
  inevitable: false,
  ttc: 0.5,
  dReq: 0,
  dMinStop: 0,
  reasons: [],
};

function stoppingDistance(vehKey: keyof typeof VEHICLES, v0: number): number {
  const veh = VEHICLES[vehKey];
  const dec = DEFAULT_CONFIG.decision;
  const car = new Vehicle(v0);
  const dt = 0.005;
  let dist = 0;
  for (let i = 0; i < 8000 && car.speed > 0.01; i++) {
    dist += car.speed * dt; // integrate before the step (matches world semi-implicit order)
    car.apply(brakeCmd, v0, veh, dec, dt);
  }
  return dist;
}

describe('vehicle dynamics', () => {
  it('stopping distance matches V·latency + V²/(2μg)', () => {
    const veh = VEHICLES.tesla;
    const dec = DEFAULT_CONFIG.decision;
    const v0 = 25;
    const latency = dec.tDsp + dec.tFilter + veh.actuatorLatency;
    const expected = v0 * latency + (v0 * v0) / (2 * veh.mu * G);
    const measured = stoppingDistance('tesla', v0);
    expect(measured).toBeGreaterThan(expected * 0.95);
    expect(measured).toBeLessThan(expected * 1.05);
  });

  it('higher friction stops shorter (Tesla < Corolla < Truck)', () => {
    const tesla = stoppingDistance('tesla', 25);
    const corolla = stoppingDistance('corolla', 25);
    const truck = stoppingDistance('truck', 25);
    expect(tesla).toBeLessThan(corolla);
    expect(corolla).toBeLessThan(truck);
  });

  it('higher speed stops longer', () => {
    expect(stoppingDistance('tesla', 30)).toBeGreaterThan(stoppingDistance('tesla', 15));
  });
});

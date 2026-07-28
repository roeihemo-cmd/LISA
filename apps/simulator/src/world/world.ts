import type { WorldTruth, EgoTruth, TargetTruth } from './types';
import type { ScenarioConfig } from '../config/schema';
import { trueRange, type TrueRange } from '../core/units';

// The WORLD owns the true physical state. Only sensors read it; the decision
// layer never sees it — that is the whole point (the car acts on the LiDAR).
export class World {
  time = 0;
  ego: EgoTruth;
  targets: TargetTruth[];
  readonly roadLength: number;
  private scenario: ScenarioConfig;

  constructor(scenario: ScenarioConfig) {
    this.scenario = scenario;
    this.roadLength = scenario.roadLength;
    this.ego = { s: 0, v: scenario.egoSpeed0, a: 0 };
    this.targets = [
      { id: 1, s: scenario.leadRange0, v: scenario.leadSpeed0, braking: false },
    ];
  }

  /** Advance the truth: integrate positions, run the lead's scripted behaviour. */
  step(dt: number): void {
    this.time += dt;
    // integrate ego position with its current (already-updated) velocity
    this.ego.s += this.ego.v * dt;
    for (const t of this.targets) {
      t.s += t.v * dt;
      if (this.time >= this.scenario.leadBrakeAt) {
        t.braking = true;
        t.v = Math.max(0, t.v - this.scenario.leadDecel * dt);
      }
    }
  }

  /** The ego's own motion is set by the vehicle layer (proprioception is legitimate). */
  applyEgo(v: number, a: number): void {
    this.ego.v = v;
    this.ego.a = a;
  }

  /** True range to the nearest lead target — consumed ONLY by sensors / render. */
  trueRangeToLead(): TrueRange {
    const lead = this.targets[0];
    return trueRange(lead.s - this.ego.s);
  }

  snapshot(): WorldTruth {
    return {
      time: this.time,
      ego: { ...this.ego },
      targets: this.targets.map((t) => ({ ...t })),
      roadLength: this.roadLength,
    };
  }
}

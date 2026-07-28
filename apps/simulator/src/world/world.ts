import type { WorldTruth, EgoTruth, TargetTruth } from './types';
import type { ScenarioConfig } from '../config/schema';
import { trueRange, type TrueRange } from '../core/units';

// The WORLD owns the true physical state. Only sensors read it; the decision
// layer never sees it — the car acts on the LiDAR.
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
      {
        id: 1,
        s: scenario.leadRange0,
        lat: scenario.lat0,
        v: scenario.leadSpeed0,
        braking: false,
        kind: scenario.targetKind,
        behavior: scenario.behavior,
      },
    ];
  }

  step(dt: number): void {
    this.time += dt;
    this.ego.s += this.ego.v * dt;
    const sc = this.scenario;
    for (const t of this.targets) {
      t.s += t.v * dt;
      switch (t.behavior) {
        case 'brake':
          if (this.time >= sc.leadBrakeAt) {
            t.braking = true;
            t.v = Math.max(0, t.v - sc.leadDecel * dt);
          }
          break;
        case 'cutin':
          // merge from the adjacent lane into our lane after a short delay
          if (this.time > 1.0) t.lat = Math.max(0, t.lat - sc.crossSpeed * dt);
          break;
        case 'cross':
          // walk/roll straight across the road (one direction)
          t.lat += sc.crossSpeed * dt;
          break;
        case 'stalled':
        case 'static':
        default:
          break;
      }
    }
  }

  applyEgo(v: number, a: number): void {
    this.ego.v = v;
    this.ego.a = a;
  }

  /** True longitudinal range to the lead — consumed ONLY by sensors / render. */
  trueRangeToLead(): TrueRange {
    return trueRange(this.targets[0].s - this.ego.s);
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

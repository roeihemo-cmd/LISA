import type { TargetKind, TargetBehavior } from '../config/schema';

// The TRUTH domain. These structures hold the real physical state of the world.
// ONLY sensor modules are allowed to read them.

export interface EgoTruth {
  s: number; // position along the road [m]
  v: number; // speed [m/s]
  a: number; // acceleration [m/s^2]
}

export interface TargetTruth {
  id: number;
  s: number; // longitudinal position along the road [m]
  lat: number; // lateral offset from lane centre [m]
  v: number; // longitudinal speed [m/s]
  braking: boolean;
  kind: TargetKind;
  behavior: TargetBehavior;
}

export interface WorldTruth {
  time: number; // [s]
  ego: EgoTruth;
  targets: TargetTruth[];
  roadLength: number;
}

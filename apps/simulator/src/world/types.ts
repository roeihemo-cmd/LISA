// The TRUTH domain. These structures hold the real physical state of the world.
// ONLY sensor modules are allowed to read them (enforced by the ESLint wall rule).

export interface EgoTruth {
  s: number; // position along the road [m]
  v: number; // speed [m/s]
  a: number; // acceleration [m/s^2]
}

export interface TargetTruth {
  id: number;
  s: number; // position along the road [m]
  v: number; // speed [m/s]
  braking: boolean;
}

export interface WorldTruth {
  time: number; // [s]
  ego: EgoTruth;
  targets: TargetTruth[];
  roadLength: number;
}

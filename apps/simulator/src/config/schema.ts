// Every simulator parameter, in SI units, grouped by pipeline stage.
// Values faithfully reproduce the original simulator's constants.

export type VehicleKind = 'sedan' | 'compact' | 'truck';

export interface VehicleVisual {
  kind: VehicleKind;
  body: string;
  cab: string;
  trim: string;
}

export interface VehicleConfig {
  name: string;
  mu: number; // tyre–road friction coefficient [-]  (decel = mu*g)
  aMax: number; // max forward acceleration [m/s^2]
  actuatorLatency: number; // brake actuator delay tAct [s]
  maxSpeed: number; // [m/s]
  visual: VehicleVisual;
}

export type TargetKind = 'car' | 'obstacle' | 'pedestrian' | 'child';
export type TargetBehavior = 'brake' | 'stalled' | 'static' | 'cutin' | 'cross' | 'roundabout';

export interface ScenarioConfig {
  name: { en: string; he: string };
  egoSpeed0: number; // initial ego speed [m/s]
  leadRange0: number; // initial longitudinal gap to the target [m]
  leadSpeed0: number; // target longitudinal speed [m/s] (0 = static)
  leadBrakeAt: number; // sim time the lead slams the brakes [s]; Infinity = never
  leadDecel: number; // lead braking deceleration [m/s^2]
  targetKind: TargetKind;
  behavior: TargetBehavior;
  lat0: number; // initial lateral offset [m] (0 = in-lane; adjacent lane ≈ 3.5)
  crossSpeed: number; // lateral speed for crossing/merging [m/s]
  fog: number; // scene fog/dust alpha [1/m]
  reflectivity: number; // scene target reflectivity rho [-]
  roadLength: number; // [m]
  challenge: { en: string; he: string }; // one-line description for the picker
  eqs: string[]; // equation ids relevant to this scenario
}

export interface LidarConfig {
  maxRange: number; // MAXV — range scale [m]
  rxGain: number; // receiver gain RX_GAIN
  lensDiameter: number; // DR [m]
  reflectivity: number; // target reflectivity rho [-]
  fogAlpha: number; // atmospheric extinction coefficient [1/m]
  noise: number; // receiver noise floor sigma (ns)
  detThreshold: number; // DET — detection SNR threshold
  maWindow: number; // moving-average window [frames]
  trackHold: number; // hold last range on dropout [s]
}

export interface DecisionConfig {
  tDsp: number; // DSP latency T_DSP [s]
  tFilter: number; // matched-filter latency T_FILTER [s]
  safetyBuffer: number; // BUFFER — desired stopped gap [m]
  dvThreshold: number; // DV_THR — closing-speed threshold [km/h]
}

export interface SimConfig {
  seed: number;
  vehicle: VehicleConfig;
  scenario: ScenarioConfig;
  lidar: LidarConfig;
  decision: DecisionConfig;
}

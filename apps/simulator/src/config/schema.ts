// Every simulator parameter, in SI units, grouped by pipeline stage.
// Values faithfully reproduce the original simulator's constants.

export interface VehicleConfig {
  name: string;
  mu: number; // tyre–road friction coefficient [-]  (decel = mu*g)
  aMax: number; // max forward acceleration [m/s^2]
  actuatorLatency: number; // brake actuator delay tAct [s]
  maxSpeed: number; // [m/s]
}

export interface ScenarioConfig {
  name: string;
  egoSpeed0: number; // initial ego speed [m/s]
  leadRange0: number; // initial gap to the lead object [m]
  leadSpeed0: number; // lead speed [m/s] (0 = stalled)
  leadBrakeAt: number; // sim time the lead slams the brakes [s]; Infinity = never
  leadDecel: number; // lead braking deceleration [m/s^2]
  roadLength: number; // [m]
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

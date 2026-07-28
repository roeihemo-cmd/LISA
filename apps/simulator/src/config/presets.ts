import type { SimConfig, VehicleConfig, ScenarioConfig } from './schema';
import { kmhToMs } from '../core/units';

// Faithful to the original simulator's VEHICLES table (decel = mu*g).
export const VEHICLES: Record<string, VehicleConfig> = {
  tesla: { name: 'Tesla Model 3', mu: 0.9, aMax: 8.0, actuatorLatency: 0.15, maxSpeed: kmhToMs(200) },
  corolla: { name: 'Toyota Corolla', mu: 0.75, aMax: 3.0, actuatorLatency: 0.25, maxSpeed: kmhToMs(180) },
  truck: { name: 'Heavy Truck', mu: 0.6, aMax: 1.2, actuatorLatency: 0.45, maxSpeed: kmhToMs(90) },
};

export const SCENARIOS: Record<string, ScenarioConfig> = {
  hardBrake: {
    name: 'Hard Brake',
    egoSpeed0: kmhToMs(90),
    leadRange0: 90,
    leadSpeed0: kmhToMs(80),
    leadBrakeAt: 3.0,
    leadDecel: 8.0, // LEAD_HARD_DECEL
    roadLength: 500,
  },
  stalled: {
    name: 'Heavy Fog · Stalled Car',
    egoSpeed0: kmhToMs(70),
    leadRange0: 110,
    leadSpeed0: 0,
    leadBrakeAt: Infinity,
    leadDecel: 0,
    roadLength: 500,
  },
};

export const DEFAULT_CONFIG: SimConfig = {
  seed: 1,
  vehicle: VEHICLES.tesla,
  scenario: SCENARIOS.hardBrake,
  lidar: {
    maxRange: 120, // MAXV
    rxGain: 2.5e8, // RX_GAIN
    lensDiameter: 0.05, // DR
    reflectivity: 0.6, // rho
    fogAlpha: 0.02, // clear-air alpha
    noise: 0.15, // ns
    detThreshold: 6, // DET
    maWindow: 8, // MA_WIN
    trackHold: 0.6, // [s]
  },
  decision: {
    tDsp: 0.03, // T_DSP
    tFilter: 0.13, // T_FILTER
    safetyBuffer: 5, // BUFFER
    dvThreshold: 15, // DV_THR [km/h]
  },
};

import type { SimConfig, VehicleConfig, ScenarioConfig } from './schema';
import { kmhToMs } from '../core/units';

// Faithful to the original simulator's VEHICLES table (decel = mu*g).
export const VEHICLES: Record<string, VehicleConfig> = {
  tesla: {
    name: 'Tesla Model 3', mu: 0.9, aMax: 8.0, actuatorLatency: 0.15, maxSpeed: kmhToMs(200),
    visual: { kind: 'sedan', body: '#c7d0dd', cab: '#0b1420', trim: '#00e0ff' },
  },
  corolla: {
    name: 'Toyota Corolla', mu: 0.75, aMax: 3.0, actuatorLatency: 0.25, maxSpeed: kmhToMs(180),
    visual: { kind: 'compact', body: '#5f7488', cab: '#0b1420', trim: '#9fb3c8' },
  },
  truck: {
    name: 'Heavy Truck', mu: 0.6, aMax: 1.2, actuatorLatency: 0.45, maxSpeed: kmhToMs(90),
    visual: { kind: 'truck', body: '#c14a4a', cab: '#0b1420', trim: '#ffb020' },
  },
};

export const SCENARIOS: Record<string, ScenarioConfig> = {
  hardBrake: {
    name: 'Hard Brake', egoSpeed0: kmhToMs(90), leadRange0: 90, leadSpeed0: kmhToMs(80),
    leadBrakeAt: 3.0, leadDecel: 8.0, leadKind: 'car', fog: 0.02, reflectivity: 0.6, roadLength: 600,
  },
  fog: {
    name: 'Heavy Fog · Stalled Car', egoSpeed0: kmhToMs(70), leadRange0: 120, leadSpeed0: 0,
    leadBrakeAt: Infinity, leadDecel: 0, leadKind: 'car', fog: 0.2, reflectivity: 0.6, roadLength: 600,
  },
  roadworks: {
    name: 'Road Works', egoSpeed0: kmhToMs(80), leadRange0: 100, leadSpeed0: 0,
    leadBrakeAt: Infinity, leadDecel: 0, leadKind: 'obstacle', fog: 0.02, reflectivity: 0.4, roadLength: 600,
  },
};

export const DEFAULT_CONFIG: SimConfig = {
  seed: 1,
  vehicle: VEHICLES.tesla,
  scenario: SCENARIOS.hardBrake,
  lidar: {
    maxRange: 120, rxGain: 2.5e8, lensDiameter: 0.05, reflectivity: 0.6,
    fogAlpha: 0.02, noise: 0.15, detThreshold: 6, maWindow: 8, trackHold: 0.6,
  },
  decision: { tDsp: 0.03, tFilter: 0.13, safetyBuffer: 5, dvThreshold: 15 },
};

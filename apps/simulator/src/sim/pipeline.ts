import type { SimConfig } from '../config/schema';
import type { DecisionState } from '../decision/types';
import { Rng } from '../core/rng';
import { World } from '../world/world';
import { Lidar } from '../sensors/lidar';
import { Estimator } from '../perception/estimator';
import { decide } from '../decision/policy';
import { Vehicle } from '../vehicle/dynamics';

export type Outcome = 'RUNNING' | 'STOPPED' | 'COLLISION';

/** Immutable per-tick record handed to render + telemetry. */
export interface Frame {
  time: number;
  // truth (render / metrics only — the decision never sees these)
  trueRange: number;
  egoSpeed: number;
  leadSpeed: number;
  // sensor + perception (what the car knows)
  measRange: number | null;
  snr: number;
  detected: boolean;
  estRange: number | null;
  estClosing: number;
  // decision
  decision: DecisionState;
  outcome: Outcome;
}

const COLLISION_GAP = 1.5; // m — bumper contact
const STOP_SPEED = 0.2; // m/s — considered stopped

export class Pipeline {
  private cfg: SimConfig;
  private rng: Rng;
  private world: World;
  private lidar: Lidar;
  private estimator: Estimator;
  private vehicle: Vehicle;
  private setSpeed: number;
  outcome: Outcome = 'RUNNING';

  constructor(cfg: SimConfig) {
    this.cfg = cfg;
    this.rng = new Rng(cfg.seed);
    this.world = new World(cfg.scenario);
    this.lidar = new Lidar(cfg.lidar.noise);
    this.estimator = new Estimator(cfg.lidar);
    this.vehicle = new Vehicle(cfg.scenario.egoSpeed0);
    this.setSpeed = cfg.scenario.egoSpeed0;
  }

  tick(dt: number): Frame {
    if (this.outcome === 'RUNNING') {
      this.world.step(dt);

      const trueRange = this.world.trueRangeToLead();
      const meas = this.lidar.measure(trueRange, this.cfg.lidar, this.rng);
      const est = this.estimator.update(meas, dt);
      const decision = decide({
        egoSpeed: this.world.ego.v,
        setSpeed: this.setSpeed,
        estimate: est,
        vehicle: this.cfg.vehicle,
        decision: this.cfg.decision,
      });
      this.vehicle.apply(decision, this.setSpeed, this.cfg.vehicle, this.cfg.decision, dt);
      this.world.applyEgo(this.vehicle.speed, this.vehicle.a);

      const gap = trueRange as number;
      if (gap <= COLLISION_GAP) this.outcome = 'COLLISION';
      else if (this.vehicle.speed <= STOP_SPEED && this.world.targets[0].v <= STOP_SPEED) this.outcome = 'STOPPED';

      this.lastDecision = decision;
      return this.frame(trueRange as number, meas, est, decision);
    }
    // frozen on outcome — re-emit a static frame
    return this.staticFrame();
  }

  private frame(
    trueRange: number,
    meas: ReturnType<Lidar['measure']>,
    est: ReturnType<Estimator['update']>,
    decision: DecisionState,
  ): Frame {
    return {
      time: this.world.time,
      trueRange,
      egoSpeed: this.world.ego.v,
      leadSpeed: this.world.targets[0].v,
      measRange: meas.measRange,
      snr: meas.snr,
      detected: meas.detected,
      estRange: est.range as number | null,
      estClosing: est.closing,
      decision,
      outcome: this.outcome,
    };
  }

  private lastDecision: DecisionState | null = null;
  private staticFrame(): Frame {
    const decision =
      this.lastDecision ??
      ({ mode: 'CRUISE', brake: false, targetSpeed: 0, inevitable: false, ttc: Infinity, dReq: 0, dMinStop: 0, reasons: [] } as DecisionState);
    return {
      time: this.world.time,
      trueRange: this.world.trueRangeToLead() as number,
      egoSpeed: this.world.ego.v,
      leadSpeed: this.world.targets[0].v,
      measRange: null,
      snr: 0,
      detected: false,
      estRange: null,
      estClosing: 0,
      decision,
      outcome: this.outcome,
    };
  }
}

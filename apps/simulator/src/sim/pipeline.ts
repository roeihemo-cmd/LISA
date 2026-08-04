import type { SimConfig, TargetKind } from '../config/schema';
import type { DecisionState } from '../decision/types';
import { Rng } from '../core/rng';
import { World } from '../world/world';
import { Lidar } from '../sensors/lidar';
import { Estimator } from '../perception/estimator';
import { decide } from '../decision/policy';
import { Vehicle } from '../vehicle/dynamics';
import { G, trueRange } from '../core/units';

export type Outcome = 'RUNNING' | 'STOPPED' | 'COLLISION' | 'CROSSED';

export interface RoundState {
  phase: 'approach' | 'arc' | 'exit';
  prog: number; // 0..1 within the current phase
  angle: number; // ego angular position on the ring [rad]
  vSafe: number; // safe cornering speed [m/s]
  approach: number; // remaining approach distance [m]
}

/** Immutable per-tick record handed to render + telemetry. */
export interface Frame {
  time: number;
  // truth (render / metrics only — the decision never sees these)
  trueRange: number;
  egoSpeed: number;
  leadSpeed: number;
  targetLat: number;
  targetKind: TargetKind;
  inPath: boolean;
  // sensor + perception (what the car knows)
  measRange: number | null;
  snr: number;
  detected: boolean;
  estRange: number | null;
  estClosing: number;
  // decision
  decision: DecisionState;
  outcome: Outcome;
  rnd?: RoundState;
}

const COLLISION_GAP = 1.5; // m — bumper contact
const STOP_SPEED = 0.2; // m/s — considered stopped
const LANE_HALF = 2.0; // m — a target beyond this lateral offset is out of the driving path
export const ROUND_R = 25; // roundabout radius [m]
const ISLAND_GAP = 6.2; // radial distance the LiDAR ranges to the central island [m]

export class Pipeline {
  private cfg: SimConfig;
  private rng: Rng;
  private world: World;
  private lidar: Lidar;
  private estimator: Estimator;
  private vehicle: Vehicle;
  private setSpeed: number;
  outcome: Outcome = 'RUNNING';

  // roundabout mode
  private isRound: boolean;
  private roundV: number;
  private rndPhase: RoundState['phase'] = 'approach';
  private rndProg = 0;
  private rndAngle = Math.PI / 2;
  private appDist = 55;

  constructor(cfg: SimConfig) {
    this.cfg = cfg;
    this.rng = new Rng(cfg.seed);
    this.world = new World(cfg.scenario);
    this.lidar = new Lidar(cfg.lidar.noise);
    this.estimator = new Estimator(cfg.lidar);
    this.vehicle = new Vehicle(cfg.scenario.egoSpeed0);
    this.setSpeed = cfg.scenario.egoSpeed0;
    this.isRound = cfg.scenario.behavior === 'roundabout';
    this.roundV = cfg.scenario.egoSpeed0;
  }

  tick(dt: number): Frame {
    if (this.isRound) return this.roundTick(dt);
    if (this.outcome === 'RUNNING') {
      this.world.step(dt);

      const target = this.world.targets[0];
      const inPath = Math.abs(target.lat) < LANE_HALF;
      const trueRange = this.world.trueRangeToLead();
      let meas = this.lidar.measure(trueRange, this.cfg.lidar, this.rng);
      // A target outside the driving path is not a forward obstacle (no valid return in-lane).
      if (!inPath) meas = { detected: false, measRange: null, snr: meas.snr, amp: meas.amp };
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
      if (inPath && gap <= COLLISION_GAP) this.outcome = 'COLLISION';
      else if (target.behavior === 'cross' && Math.abs(target.lat) > 5) this.outcome = 'CROSSED';
      else if (this.vehicle.speed <= STOP_SPEED && target.v <= STOP_SPEED && gap > COLLISION_GAP) this.outcome = 'STOPPED';

      this.lastDecision = decision;
      return this.frame(trueRange as number, meas, est, decision, target.lat, target.kind, inPath);
    }
    // frozen on outcome — re-emit a static frame
    return this.staticFrame();
  }

  private frame(
    trueRange: number,
    meas: ReturnType<Lidar['measure']>,
    est: ReturnType<Estimator['update']>,
    decision: DecisionState,
    targetLat: number,
    targetKind: TargetKind,
    inPath: boolean,
  ): Frame {
    return {
      time: this.world.time,
      trueRange,
      egoSpeed: this.world.ego.v,
      leadSpeed: this.world.targets[0].v,
      targetLat,
      targetKind,
      inPath,
      measRange: meas.measRange,
      snr: meas.snr,
      detected: meas.detected,
      estRange: est.range as number | null,
      estClosing: est.closing,
      decision,
      outcome: this.outcome,
    };
  }

  /** Roundabout mode: slow to the safe cornering speed, circulate, exit. */
  private roundTick(dt: number): Frame {
    const V = this.cfg.vehicle;
    const vSafe = Math.sqrt(V.mu * G * ROUND_R);
    const decel = V.mu * G;
    const accel = V.aMax;
    let target = this.setSpeed;
    let mode: DecisionState['mode'] = 'ROUNDABOUT';

    if (this.outcome === 'RUNNING') {
      if (this.rndPhase === 'approach') {
        target = Math.min(this.setSpeed, vSafe);
        mode = 'SLOWING';
        this.appDist -= this.roundV * dt;
        if (this.appDist <= 0) {
          this.rndPhase = 'arc';
          this.rndProg = 0;
          this.rndAngle = Math.PI / 2;
        }
      } else if (this.rndPhase === 'arc') {
        target = vSafe;
        const dA = (this.roundV / ROUND_R) * dt;
        this.rndAngle -= dA;
        this.rndProg += dA / Math.PI; // ~180° sweep
        if (this.rndProg >= 1) {
          this.rndPhase = 'exit';
          this.rndProg = 0;
        }
      } else {
        target = this.setSpeed;
        this.rndProg += dt * 0.5;
        if (this.rndProg >= 1) this.outcome = 'STOPPED';
      }
      this.roundV =
        this.roundV < target ? Math.min(target, this.roundV + accel * dt) : Math.max(target, this.roundV - decel * dt);
      this.world.time += dt;
    }
    this.world.applyEgo(this.roundV, 0);

    // the LiDAR ranges the central island (~constant radial gap)
    const meas = this.lidar.measure(trueRange(ISLAND_GAP), this.cfg.lidar, this.rng);
    const est = this.estimator.update(meas, dt);
    const lat = this.cfg.decision.tDsp + this.cfg.decision.tFilter + V.actuatorLatency;
    const dReq = this.roundV * lat + (this.roundV * this.roundV) / (2 * decel) + this.cfg.decision.safetyBuffer;
    const decision: DecisionState = {
      mode,
      brake: false,
      targetSpeed: vSafe,
      inevitable: false,
      ttc: Infinity,
      dReq,
      dMinStop: dReq - this.cfg.decision.safetyBuffer,
      reasons: [`V_max = √(μ·g·r) = ${(vSafe * 3.6).toFixed(0)} km/h`],
    };
    return {
      time: this.world.time,
      trueRange: ISLAND_GAP,
      egoSpeed: this.roundV,
      leadSpeed: 0,
      targetLat: 0,
      targetKind: 'obstacle',
      inPath: false,
      measRange: meas.measRange,
      snr: meas.snr,
      detected: meas.detected,
      estRange: est.range as number | null,
      estClosing: 0,
      decision,
      outcome: this.outcome,
      rnd: { phase: this.rndPhase, prog: this.rndProg, angle: this.rndAngle, vSafe, approach: Math.max(0, this.appDist) },
    };
  }

  private lastDecision: DecisionState | null = null;
  private staticFrame(): Frame {
    const decision =
      this.lastDecision ??
      ({ mode: 'CRUISE', brake: false, targetSpeed: 0, inevitable: false, ttc: Infinity, dReq: 0, dMinStop: 0, reasons: [] } as DecisionState);
    const target = this.world.targets[0];
    return {
      time: this.world.time,
      trueRange: this.world.trueRangeToLead() as number,
      egoSpeed: this.world.ego.v,
      leadSpeed: target.v,
      targetLat: target.lat,
      targetKind: target.kind,
      inPath: Math.abs(target.lat) < LANE_HALF,
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

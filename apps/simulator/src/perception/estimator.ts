import type { LidarMeasurement } from '../sensors/types';
import type { PerceptionEstimate } from './types';
import type { LidarConfig } from '../config/schema';
import { estRange } from '../core/units';

/** Faithful moving average (null-safe), as in the original `MA` class. */
class MovingAverage {
  private buf: number[] = [];
  constructor(private n: number) {}
  push(x: number): number {
    this.buf.push(x);
    if (this.buf.length > this.n) this.buf.shift();
    return this.buf.reduce((a, c) => a + c, 0) / this.buf.length;
  }
  reset(): void {
    this.buf = [];
  }
}

const CLOSING_TAU = 0.4; // EMA time-constant for the derived closing speed [s]

/**
 * Turns raw LiDAR measurements into the car's belief:
 *  - smoothed range via an 8-frame moving average + a brief track-hold on dropout
 *    (exactly the original behaviour), and
 *  - closing speed by differentiating the smoothed range over time (how a LiDAR-only
 *    system infers relative velocity — no access to the target's true speed).
 */
export class Estimator {
  private ma: MovingAverage;
  private lastSm: number | null = null;
  private holdT = 0;
  private prevRange: number | null = null;
  private closingEma = 0;
  private readonly trackHold: number;

  constructor(cfg: LidarConfig) {
    this.ma = new MovingAverage(cfg.maWindow);
    this.trackHold = cfg.trackHold;
  }

  update(meas: LidarMeasurement, dt: number): PerceptionEstimate {
    const raw = meas.detected ? meas.measRange : null;

    let sm: number | null;
    if (raw != null) {
      sm = this.ma.push(raw);
      this.lastSm = sm;
      this.holdT = 0;
    } else {
      this.holdT += dt;
      if (this.holdT < this.trackHold && this.lastSm != null) {
        sm = this.lastSm;
      } else {
        this.ma.reset();
        sm = null;
        this.lastSm = null;
      }
    }

    if (sm != null && this.prevRange != null && dt > 0) {
      const closingRaw = -(sm - this.prevRange) / dt; // range shrinking → positive
      this.closingEma += (closingRaw - this.closingEma) * Math.min(1, dt / CLOSING_TAU);
    } else if (sm == null) {
      this.closingEma = 0;
    }
    this.prevRange = sm;

    return {
      range: sm != null ? estRange(sm) : null,
      closing: sm != null ? this.closingEma : 0,
      detected: sm != null,
    };
  }
}

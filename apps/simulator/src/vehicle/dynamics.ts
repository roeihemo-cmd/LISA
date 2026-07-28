import type { VehicleConfig, DecisionConfig } from '../config/schema';
import type { DecisionState } from '../decision/types';
import { G } from '../core/units';

/**
 * Longitudinal ego dynamics, faithful to the original Ego.update:
 *  - deceleration a = μ·g,
 *  - a "coast" blind phase equal to the total latency before the brakes bite,
 *  - otherwise ease toward the set speed at a = aMax (accel) / μg (decel).
 */
export class Vehicle {
  speed: number;
  a = 0;
  private braking = false;
  private coast = 0;
  private brakeTarget = 0;

  constructor(v0: number) {
    this.speed = v0;
  }

  apply(cmd: DecisionState, setSpeed: number, vehicle: VehicleConfig, decision: DecisionConfig, dt: number): void {
    const decel = vehicle.mu * G;
    const accel = vehicle.aMax;
    const latency = decision.tDsp + decision.tFilter + vehicle.actuatorLatency;

    if (cmd.brake) {
      if (!this.braking) {
        this.braking = true;
        this.coast = latency; // reaction/blind phase — keep speed, brakes not yet biting
      }
      this.brakeTarget = cmd.targetSpeed;
    } else {
      this.braking = false;
    }

    const v0 = this.speed;
    if (this.braking) {
      if (this.coast > 0) {
        this.coast = Math.max(0, this.coast - dt);
      } else {
        this.speed = Math.max(this.brakeTarget, this.speed - decel * dt);
      }
    } else if (this.speed < setSpeed) {
      this.speed = Math.min(setSpeed, this.speed + accel * dt);
    } else if (this.speed > setSpeed) {
      this.speed = Math.max(setSpeed, this.speed - decel * dt);
    }

    this.speed = Math.max(0, this.speed);
    this.a = dt > 0 ? (this.speed - v0) / dt : 0;
  }
}

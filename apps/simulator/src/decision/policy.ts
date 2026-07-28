import type { PerceptionEstimate } from '../perception/types';
import type { VehicleConfig, DecisionConfig } from '../config/schema';
import type { DecisionState } from './types';
import { G } from '../core/units';

export interface DecisionInput {
  egoSpeed: number; // ego's OWN speed [m/s] (proprioception — legitimately known)
  setSpeed: number; // driver's set cruise speed [m/s]
  estimate: PerceptionEstimate; // the LiDAR belief — the ONLY view of the world
  vehicle: VehicleConfig;
  decision: DecisionConfig;
}

const FCW_TTC = 2.6; // forward-collision warning threshold [s]

/**
 * Faithful reproduction of the original braking model, but driven by the
 * ESTIMATED range/closing (what the LiDAR sees) instead of ground truth:
 *   D_required = V·(T_dsp + T_filter + T_act) + V²/(2μg) + buffer
 *   TTC        = range_est / closing_est
 *   inevitable = range_est < V²/(2μg) + V·latency  AND  TTC < 1.0 s
 * Never imports the world — it cannot see the truth.
 */
export function decide(input: DecisionInput): DecisionState {
  const { egoSpeed: ve, setSpeed, estimate, vehicle, decision } = input;
  const decel = vehicle.mu * G;
  const latency = decision.tDsp + decision.tFilter + vehicle.actuatorLatency;

  const dMech = (ve * ve) / (2 * decel);
  const dReq = ve * latency + dMech + decision.safetyBuffer;
  const dMinStop = dMech + ve * latency;

  const range = estimate.range as number | null;
  const closing = estimate.closing;
  const ttc = estimate.detected && range != null && closing > 0.2 ? range / closing : Infinity;

  const reasons: string[] = [];

  // No target in view → normal cruise toward the set speed.
  if (!estimate.detected || range == null) {
    return { mode: 'CRUISE', brake: false, targetSpeed: setSpeed, inevitable: false, ttc: Infinity, dReq, dMinStop, reasons };
  }

  const inevitable = range < dMinStop && isFinite(ttc) && ttc < 1.0;
  const estLeadSpeed = Math.max(0, ve - closing); // inferred, not truth

  if (inevitable) {
    reasons.push(`range ${range.toFixed(1)} m < min-stop ${dMinStop.toFixed(1)} m`, `TTC ${ttc.toFixed(2)} s < 1.0 s`);
    return { mode: 'AEB', brake: true, targetSpeed: 0, inevitable: true, ttc, dReq, dMinStop, reasons };
  }

  // AEB engages once the gap the LiDAR sees drops below the required stopping distance.
  if (range < dReq) {
    reasons.push(`range ${range.toFixed(1)} m < D_required ${dReq.toFixed(1)} m`);
    return { mode: 'AEB', brake: true, targetSpeed: estLeadSpeed, inevitable: false, ttc, dReq, dMinStop, reasons };
  }

  if (isFinite(ttc) && ttc < FCW_TTC) {
    reasons.push(`TTC ${ttc.toFixed(1)} s < ${FCW_TTC} s`);
    return { mode: 'FCW', brake: false, targetSpeed: setSpeed, inevitable: false, ttc, dReq, dMinStop, reasons };
  }

  return { mode: 'CRUISE', brake: false, targetSpeed: setSpeed, inevitable: false, ttc, dReq, dMinStop, reasons };
}

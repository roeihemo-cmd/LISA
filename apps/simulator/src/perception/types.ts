import type { EstRange } from '../core/units';

// What the car actually believes about the world — derived ONLY from LiDAR.
export interface PerceptionEstimate {
  range: EstRange | null; // smoothed measured range [m]; null when the track is lost
  closing: number; // closing speed [m/s] from the change in measured range (+ = approaching)
  detected: boolean;
}

// What the LiDAR reports to the perception stack — a NOISY measurement, never truth.
export interface LidarMeasurement {
  detected: boolean;
  /** Measured range [m] (true range + noise) when detected, else null. */
  measRange: number | null;
  snr: number; // linear SNR
  amp: number; // received echo amplitude (P_rec proxy)
}

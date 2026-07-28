// Fixed-timestep clock. The simulation advances in constant DT steps,
// decoupled from the display refresh rate — deterministic, testable, and
// Monte-Carlo-able headless. Render interpolates with the leftover alpha.

export const DT = 0.005; // fixed simulation step [s] (200 Hz)

export class SimClock {
  private accumulator = 0;
  paused = false;
  private stepsQueued = 0;
  /** Total simulated time [s]. */
  t = 0;

  /** Feed real elapsed wall time; returns how many fixed steps to run now. */
  pump(realDelta: number): number {
    if (this.paused) {
      const n = this.stepsQueued;
      this.stepsQueued = 0;
      this.t += n * DT;
      return n;
    }
    // clamp to avoid the "spiral of death" after a tab was backgrounded
    this.accumulator += Math.min(realDelta, 0.25);
    let steps = 0;
    while (this.accumulator >= DT) {
      this.accumulator -= DT;
      steps++;
    }
    this.t += steps * DT;
    return steps;
  }

  /** Advance exactly n fixed steps on the next pump while paused. */
  step(n = 1): void {
    this.stepsQueued += n;
  }

  /** Fractional progress toward the next step, for render interpolation. */
  alpha(): number {
    return this.accumulator / DT;
  }
}

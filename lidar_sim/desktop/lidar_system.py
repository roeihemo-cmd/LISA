"""LiDARSystem: OOP wrapper around the existing signal-processing pipeline.

The underlying mathematics (Gaussian pulse, Beer-Lambert attenuation, optical
radar equation, AWGN receiver, matched-filter convolution, peak detection) is
reused verbatim from lidar_sim.physics and lidar_sim.dsp — nothing changed.
"""

import numpy as np

from .. import config
from ..physics import waveform, noise
from ..dsp import matched_filter, detection


class LiDARSystem:
    """Performs one end-to-end range measurement per call to measure()."""

    def __init__(self, pulse_width_ns: float = config.DEFAULTS["pulse_width_ns"]):
        self.sigma = pulse_width_ns * 1e-9
        self.t = waveform.time_axis()
        self.template = waveform.reference_pulse(self.t, self.sigma)
        self.rng = np.random.default_rng()
        # matched-filter gain of the (amplitude-1) pulse shape, used by the
        # lightweight per-angle probe to estimate SNR without a full correlate.
        self.shape_norm = float(np.sqrt(np.sum(self.template ** 2)))
        self.range_res = config.C_LIGHT / (2.0 * config.SAMPLE_RATE)

    def measure(self, range_m: float, p_tx: float, rho: float,
                alpha: float, noise_sigma: float) -> dict:
        """Run the full chain for a target at range_m and return the results.

        A fresh noise realisation is drawn every call, so the matched-filter
        peak and noise floor jitter naturally frame-to-frame.
        """
        rx = noise.build_receiver(
            self.t, range_m=range_m, p_tx=p_tx, rho=rho, alpha=alpha,
            sigma=self.sigma, noise_sigma=noise_sigma, rng=self.rng)
        mf = matched_filter.apply_matched_filter(rx["received"], self.template)
        det = detection.detect(mf, self.t)
        return {
            "t": self.t,
            "received": rx["received"],
            "sent": self.template,
            "mf": mf,
            "detection": det,
        }

    def probe(self, range_m: float, p_tx: float, rho: float,
              alpha: float, noise_sigma: float) -> dict:
        """Lightweight single-angle return for the scan fan.

        Uses the same optical radar equation + AWGN model as the full chain,
        but estimates SNR analytically (echo amplitude x matched-filter gain
        over the noise floor) instead of running a full correlation — cheap
        enough to call for every scan line at 60 FPS.
        """
        amp = noise.echo_amplitude(range_m, p_tx, rho, alpha)
        nf = max(noise_sigma, 1e-6)
        snr = amp * self.shape_norm / nf
        detected = snr >= config.DETECTION_THRESHOLD_FACTOR
        # measurement jitter shrinks as SNR grows
        sigma_r = self.range_res * (0.5 + 6.0 / max(snr, 1e-3))
        sigma_r = min(sigma_r, 8.0)
        meas = range_m + float(self.rng.normal(0.0, sigma_r))
        return {"detected": bool(detected), "snr": float(snr), "range": meas}

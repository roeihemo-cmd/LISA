"""Transmit waveform generation: a narrow Gaussian laser pulse."""

import numpy as np

from .. import config


def time_axis(sample_rate: float = config.SAMPLE_RATE,
              window: float = config.WINDOW) -> np.ndarray:
    """Return the receiver time axis [s], one sample every 1/sample_rate."""
    n = int(round(window * sample_rate))
    return np.arange(n) / sample_rate


def gaussian_pulse(t: np.ndarray, t0: float, sigma: float,
                   amplitude: float = 1.0) -> np.ndarray:
    """A Gaussian pulse centred at t0 with std-dev sigma.

    s(t) = amplitude * exp(-(t - t0)^2 / (2 sigma^2))
    """
    return amplitude * np.exp(-((t - t0) ** 2) / (2.0 * sigma ** 2))


def reference_pulse(t: np.ndarray, sigma: float) -> np.ndarray:
    """The transmitted reference pulse, centred at the start of the window.

    Used both as the 'sent' signal and as the matched-filter template.
    """
    # centre a few sigma in so the pulse is fully contained
    t0 = 4.0 * sigma
    return gaussian_pulse(t, t0=t0, sigma=sigma)

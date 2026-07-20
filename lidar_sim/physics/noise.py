"""Noisy receiver model: the returned echo plus additive white Gaussian noise."""

import numpy as np

from .. import config
from . import channel, waveform


def echo_amplitude(range_m: float, p_tx: float, rho: float, alpha: float) -> float:
    """Electrical amplitude of the returned echo after detector gain."""
    p_rec = channel.received_power(range_m, p_tx, rho, alpha)
    return p_rec * config.RX_GAIN


def build_receiver(t: np.ndarray, range_m: float, p_tx: float, rho: float,
                   alpha: float, sigma: float, noise_sigma: float,
                   rng: np.random.Generator | None = None):
    """Construct the noisy received signal r(t) = A * s(t - tau) + n(t).

    Returns a dict with the clean echo, the noise, and the noisy receiver
    signal, plus the true time-of-flight tau for reference.
    """
    if rng is None:
        rng = np.random.default_rng()

    tau = channel.time_of_flight(range_m)
    amp = echo_amplitude(range_m, p_tx, rho, alpha)

    # delayed echo: same reference pulse shape, shifted by tau and scaled by amp
    t0 = 4.0 * sigma + tau
    echo = waveform.gaussian_pulse(t, t0=t0, sigma=sigma, amplitude=amp)

    noise = rng.normal(0.0, noise_sigma, size=t.shape)
    received = echo + noise

    return {
        "tau": tau,
        "amplitude": amp,
        "echo": echo,
        "noise": noise,
        "received": received,
    }

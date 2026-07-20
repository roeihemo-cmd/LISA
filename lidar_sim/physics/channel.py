"""Optical propagation channel: time-of-flight and the optical radar equation."""

import numpy as np

from .. import config


def time_of_flight(range_m: float) -> float:
    """Round-trip time of flight tau = 2R/c  [s]."""
    return 2.0 * range_m / config.C_LIGHT


def atmospheric_transmission(range_m: float, alpha: float) -> float:
    """Two-way atmospheric transmission via Beer-Lambert.

    eta_atm(R) = exp(-alpha * 2R)  (light travels to the target and back).
    alpha grows with fog/rain. alpha = 0 -> perfectly clear (eta = 1).
    """
    return float(np.exp(-alpha * 2.0 * range_m))


def received_power(range_m: float, p_tx: float, rho: float, alpha: float,
                   rx_diameter: float = config.RX_DIAMETER) -> float:
    """Received optical power from the optical radar equation.

    P_rec = P_tx * (D_r^2 / (4 R^2)) * eta_atm(R) * rho
    """
    if range_m <= 0:
        return 0.0
    geometric = rx_diameter ** 2 / (4.0 * range_m ** 2)
    eta = atmospheric_transmission(range_m, alpha)
    return p_tx * geometric * eta * rho

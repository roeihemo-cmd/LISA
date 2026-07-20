"""Numerical sanity checks for the physics and DSP core."""

import numpy as np

from lidar_sim import config
from lidar_sim.physics import channel, noise, waveform
from lidar_sim.dsp import matched_filter, detection


def test_time_of_flight():
    # 150 m -> 1 microsecond round trip (c ~ 3e8 m/s)
    tau = channel.time_of_flight(150.0)
    assert abs(tau - 1.0e-6) < 5e-9


def test_clear_air_transmission_is_unity():
    assert channel.atmospheric_transmission(50.0, alpha=0.0) == 1.0


def test_fog_attenuates():
    clear = channel.atmospheric_transmission(50.0, alpha=0.0)
    foggy = channel.atmospheric_transmission(50.0, alpha=0.1)
    assert foggy < clear


def test_received_power_falls_with_range():
    near = channel.received_power(10.0, p_tx=1.0, rho=0.3, alpha=0.0)
    far = channel.received_power(80.0, p_tx=1.0, rho=0.3, alpha=0.0)
    assert near > far > 0.0


def test_matched_filter_recovers_range_clear_air():
    R = 40.0
    sigma = config.DEFAULTS["pulse_width_ns"] * 1e-9
    t = waveform.time_axis()
    rng = np.random.default_rng(0)
    rx = noise.build_receiver(t, range_m=R, p_tx=1.0, rho=0.3, alpha=0.0,
                              sigma=sigma, noise_sigma=0.05, rng=rng)
    template = waveform.reference_pulse(t, sigma)
    mf = matched_filter.apply_matched_filter(rx["received"], template)
    det = detection.detect(mf, t)
    assert det["detected"]
    # estimated range within one range-resolution cell
    dR = config.C_LIGHT / (2 * config.SAMPLE_RATE)
    assert abs(det["range_hat"] - R) <= 2 * dR


def test_heavy_fog_loses_target():
    R = 90.0
    sigma = config.DEFAULTS["pulse_width_ns"] * 1e-9
    t = waveform.time_axis()
    rng = np.random.default_rng(1)
    rx = noise.build_receiver(t, range_m=R, p_tx=1.0, rho=0.3, alpha=0.25,
                              sigma=sigma, noise_sigma=0.2, rng=rng)
    template = waveform.reference_pulse(t, sigma)
    mf = matched_filter.apply_matched_filter(rx["received"], template)
    det = detection.detect(mf, t)
    assert not det["detected"]

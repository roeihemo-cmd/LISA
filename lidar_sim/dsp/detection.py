"""Peak detection on the matched-filter output and range estimation."""

import numpy as np

from .. import config


def detect(mf_output: np.ndarray, t: np.ndarray,
           threshold_factor: float = config.DETECTION_THRESHOLD_FACTOR) -> dict:
    """Detect the target from the matched-filter output.

    Strategy: estimate the noise floor robustly (median absolute deviation),
    find the global peak, and declare a detection only if the peak exceeds
    threshold_factor * noise_floor.

    Returns a dict with detection flag, estimated range, SNR and peak info.
    """
    peak_idx = int(np.argmax(mf_output))
    peak_val = float(mf_output[peak_idx])

    # Robust noise-floor estimate from the MAD (excludes the peak's influence).
    median = np.median(mf_output)
    mad = np.median(np.abs(mf_output - median))
    noise_floor = 1.4826 * mad if mad > 0 else (np.std(mf_output) or 1e-12)

    snr_linear = peak_val / noise_floor if noise_floor > 0 else 0.0
    snr_db = 20.0 * np.log10(snr_linear) if snr_linear > 0 else -np.inf

    detected = snr_linear >= threshold_factor

    tau_hat = float(t[peak_idx])
    range_hat = config.C_LIGHT * tau_hat / 2.0 if detected else None

    return {
        "detected": detected,
        "peak_idx": peak_idx,
        "peak_val": peak_val,
        "noise_floor": float(noise_floor),
        "snr_linear": float(snr_linear),
        "snr_db": float(snr_db),
        "tau_hat": tau_hat,
        "range_hat": range_hat,
    }

"""Matched filter: correlate the noisy receiver signal with the transmitted pulse.

The matched filter maximises SNR for a known pulse shape in AWGN, producing a
sharp 'pulse compression' peak at the echo arrival time.
"""

import numpy as np
from scipy import signal as sp_signal


def apply_matched_filter(received: np.ndarray, template: np.ndarray) -> np.ndarray:
    """Cross-correlate received signal with the (normalized) pulse template.

    Returns an output aligned to the receiver time axis (same length), where a
    peak appears at the lag corresponding to the echo delay.
    """
    # Normalize the template to unit energy so the output scale is meaningful.
    energy = np.sqrt(np.sum(template ** 2))
    if energy == 0:
        return np.zeros_like(received)
    norm_template = template / energy

    full = sp_signal.correlate(received, norm_template, mode="full")
    lags = sp_signal.correlation_lags(len(received), len(norm_template), mode="full")

    # Keep non-negative lags only and trim to the receiver length so the
    # output index maps directly to a sample delay (and hence a time delay).
    start = np.searchsorted(lags, 0)
    out = full[start:start + len(received)]
    if len(out) < len(received):
        out = np.pad(out, (0, len(received) - len(out)))
    return out

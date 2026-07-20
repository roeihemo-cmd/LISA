"""Plotly figures for the 'algorithmic' view: raw signal and matched-filter output."""

import numpy as np
import plotly.graph_objects as go

from .. import config


def raw_signal_figure(t: np.ndarray, sent: np.ndarray, received: np.ndarray) -> go.Figure:
    """Transmitted reference pulse vs. the noisy received signal."""
    t_ns = t * 1e9
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=t_ns, y=received, mode="lines",
                             name="Received r(t)", line=dict(color="#ff6b6b", width=1)))
    fig.add_trace(go.Scatter(x=t_ns, y=sent, mode="lines",
                             name="Transmitted s(t)", line=dict(color="#4dabf7", width=2)))
    fig.update_layout(
        title="Raw Signal — pulse buried in noise",
        xaxis_title="Time [ns]", yaxis_title="Amplitude",
        template="plotly_dark", height=320,
        margin=dict(l=40, r=20, t=50, b=40),
        legend=dict(orientation="h", y=1.12),
    )
    return fig


def matched_filter_figure(t: np.ndarray, mf_output: np.ndarray, det: dict) -> go.Figure:
    """Matched-filter output showing the pulse-compression peak and threshold."""
    t_ns = t * 1e9
    threshold = det["noise_floor"] * config.DETECTION_THRESHOLD_FACTOR
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=t_ns, y=mf_output, mode="lines",
                             name="MF output", line=dict(color="#51cf66", width=1.5)))
    fig.add_hline(y=threshold, line=dict(color="#ffd43b", dash="dash"),
                  annotation_text="Detection threshold", annotation_position="top left")
    if det["detected"]:
        fig.add_trace(go.Scatter(
            x=[t_ns[det["peak_idx"]]], y=[det["peak_val"]], mode="markers",
            name="Detected peak",
            marker=dict(color="#ffffff", size=11, symbol="x")))
    fig.update_layout(
        title="Matched Filter Output — pulse compression",
        xaxis_title="Time [ns]", yaxis_title="Correlation",
        template="plotly_dark", height=320,
        margin=dict(l=40, r=20, t=50, b=40),
        legend=dict(orientation="h", y=1.12),
    )
    return fig

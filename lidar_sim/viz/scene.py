"""2D top-down scene: the car, the laser beam, the obstacle and fog overlay."""

import numpy as np
import plotly.graph_objects as go

from .. import config


def scene_figure(range_m: float, alpha: float, det: dict) -> go.Figure:
    """Render the top-down LiDAR scene.

    The obstacle is green when detected, flashing red (drawn red) when lost.
    Fog density scales with alpha.
    """
    max_r = config.MAX_RANGE
    detected = det["detected"]
    obstacle_color = "#51cf66" if detected else "#ff3b30"

    fig = go.Figure()

    # --- Road background ---
    fig.add_shape(type="rect", x0=0, x1=max_r, y0=-6, y1=6,
                  fillcolor="#1a1a1a", line=dict(width=0), layer="below")

    # --- Fog overlay: stack translucent bands; opacity grows with alpha ---
    # map alpha (0..~0.3) to a visible opacity (0..0.85)
    fog_opacity = float(np.clip(alpha / 0.3, 0, 1) * 0.85)
    if fog_opacity > 0.01:
        fig.add_shape(type="rect", x0=0, x1=max_r, y0=-6, y1=6,
                      fillcolor="#d0d0d0", opacity=fog_opacity,
                      line=dict(width=0), layer="below")

    # --- Laser beam: car -> obstacle ---
    beam_color = "#51cf66" if detected else "#ff8787"
    fig.add_trace(go.Scatter(
        x=[2.0, range_m], y=[0, 0], mode="lines",
        line=dict(color=beam_color, width=4),
        name="Laser beam", hoverinfo="skip"))

    # --- Car (left) ---
    fig.add_shape(type="rect", x0=0, x1=4, y0=-1.5, y1=1.5,
                  fillcolor="#4dabf7", line=dict(color="#1c7ed6", width=2))
    fig.add_annotation(x=2, y=0, text="\U0001F697", showarrow=False,
                       font=dict(size=28))

    # --- Obstacle (at range) ---
    fig.add_shape(type="rect", x0=range_m, x1=range_m + 3, y0=-2.5, y1=2.5,
                  fillcolor=obstacle_color, line=dict(color="#ffffff", width=2))

    # --- Status label ---
    if detected:
        status = f"TARGET LOCKED   R = {det['range_hat']:.2f} m   SNR = {det['snr_db']:.1f} dB"
        status_color = "#51cf66"
    else:
        status = "⚠  TARGET LOST — Low SNR"
        status_color = "#ff3b30"
    fig.add_annotation(x=max_r / 2, y=5.2, text=status, showarrow=False,
                       font=dict(size=18, color=status_color))

    fig.update_layout(
        title="Top-Down Scene",
        xaxis=dict(title="Range [m]", range=[-2, max_r + 6], showgrid=False, zeroline=False),
        yaxis=dict(range=[-7, 7], showgrid=False, zeroline=False,
                   scaleanchor=None, showticklabels=False),
        template="plotly_dark", height=360,
        margin=dict(l=20, r=20, t=50, b=40), showlegend=False,
    )
    return fig

"""Cyberpunk 3D scene: neon vehicle, volumetric laser, fog particles and obstacle."""

import numpy as np
import plotly.graph_objects as go

from .. import config

# --- Neon palette ---
NEON_CYAN = "#00f0ff"
NEON_GREEN = "#39ff14"
NEON_RED = "#ff2d55"
NEON_AMBER = "#ffb400"
METAL_GRAY = "#3a3f4b"
GRID_GRAY = "#2a2f3a"


def _box_mesh(x0, x1, y0, y1, z0, z1, color, opacity=1.0, name=""):
    """Axis-aligned filled box (go.Mesh3d) from two opposite corners."""
    x = [x0, x0, x1, x1, x0, x0, x1, x1]
    y = [y0, y1, y1, y0, y0, y1, y1, y0]
    z = [z0, z0, z0, z0, z1, z1, z1, z1]
    i = [0, 0, 0, 0, 4, 4, 6, 6, 1, 1, 2, 2]
    j = [1, 2, 3, 4, 5, 6, 5, 7, 5, 6, 3, 7]
    k = [2, 3, 7, 5, 6, 7, 1, 3, 6, 2, 7, 6]
    return go.Mesh3d(x=x, y=y, z=z, i=i, j=j, k=k, color=color,
                     opacity=opacity, name=name, flatshading=True,
                     hoverinfo="name", showscale=False)


def _box_edges(x0, x1, y0, y1, z0, z1, color, width=4, name="", opacity=1.0):
    """Glowing wireframe edges of a box as a single Scatter3d line trace."""
    # bottom rectangle, up, top rectangle, and the 4 vertical pillars,
    # threaded into one polyline with None breaks between disjoint segments
    pts = [
        (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z0),
        (None, None, None),
        (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1), (x0, y0, z1),
        (None, None, None),
        (x0, y0, z0), (x0, y0, z1), (None, None, None),
        (x1, y0, z0), (x1, y0, z1), (None, None, None),
        (x1, y1, z0), (x1, y1, z1), (None, None, None),
        (x0, y1, z0), (x0, y1, z1),
    ]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    zs = [p[2] for p in pts]
    return go.Scatter3d(x=xs, y=ys, z=zs, mode="lines",
                        line=dict(color=color, width=width),
                        opacity=opacity, name=name, hoverinfo="name")


def _laser_beam(x_start, x_end, color):
    """Volumetric-looking beam: a thick translucent core + a brighter axis line."""
    traces = []
    # glow halo: very thick, low opacity
    traces.append(go.Scatter3d(
        x=[x_start, x_end], y=[0, 0], z=[1.0, 2.0], mode="lines",
        line=dict(color=color, width=22), opacity=0.18,
        name="Beam glow", hoverinfo="skip"))
    # bright core
    traces.append(go.Scatter3d(
        x=[x_start, x_end], y=[0, 0], z=[1.0, 2.0], mode="lines",
        line=dict(color=color, width=8), opacity=0.9,
        name="Laser beam", hoverinfo="name"))
    # cone head at the obstacle to suggest direction / volume
    traces.append(go.Cone(
        x=[x_end], y=[0], z=[2.0], u=[1], v=[0], w=[0.06],
        sizemode="absolute", sizeref=3.0, anchor="tip",
        showscale=False, colorscale=[[0, color], [1, color]],
        opacity=0.5, name="Beam head", hoverinfo="skip"))
    return traces


def scene3d_figure(range_m: float, alpha: float, det: dict, assist: dict) -> go.Figure:
    """Render the interactive cyberpunk 3D LiDAR scene."""
    detected = det["detected"]
    level = assist["level"]
    max_r = config.MAX_RANGE

    edge_color = {"safe": NEON_GREEN, "critical": NEON_RED,
                  "lowvis": NEON_AMBER}.get(level, NEON_CYAN)
    beam_color = NEON_GREEN if detected else NEON_RED

    fig = go.Figure()

    # --- Road surface (dark slab) ---
    fig.add_trace(_box_mesh(-4, max_r + 6, -5, 5, -0.1, 0.0,
                            color="#0c0e12", opacity=1.0, name="Road"))

    # --- Vehicle: metallic gray box + neon cyan edges ---
    fig.add_trace(_box_mesh(0, 4, -1, 1, 0, 1.4, color=METAL_GRAY,
                            opacity=0.95, name="Vehicle"))
    fig.add_trace(_box_edges(0, 4, -1, 1, 0, 1.4, color=NEON_CYAN, width=5,
                             name="Vehicle"))

    # --- Braking zone slab (translucent red footprint) ---
    d_brake = assist["braking_distance"]
    if d_brake > 0:
        fig.add_trace(_box_mesh(4, min(4 + d_brake, max_r + 6), -3, 3, 0, 0.05,
                                color=NEON_RED, opacity=0.22,
                                name=f"Braking zone ({d_brake:.0f} m)"))

    # --- Obstacle wall: deep gray fill, neon edge if locked / faded if lost ---
    wall_fill = "#5a1f26" if detected else "#26282e"
    wall_opacity = 0.92 if detected else 0.35
    fig.add_trace(_box_mesh(range_m, range_m + 1.5, -3, 3, 0, 4,
                            color=wall_fill, opacity=wall_opacity, name="Obstacle"))
    fig.add_trace(_box_edges(range_m, range_m + 1.5, -3, 3, 0, 4,
                             color=edge_color, width=6 if detected else 2,
                             opacity=1.0 if detected else 0.4, name="Obstacle"))

    # --- Volumetric laser beam ---
    for tr in _laser_beam(4, range_m, beam_color):
        fig.add_trace(tr)

    # --- 3D fog particle simulation (density scales with alpha) ---
    fog_frac = float(np.clip(alpha / 0.3, 0, 1))
    fog_n = int(fog_frac * 900)
    if fog_n > 0:
        rs = np.random.RandomState(42)  # deterministic across reruns
        # concentrate particles in the corridor between car and obstacle
        fx = rs.uniform(4, max(range_m, 6), fog_n)
        fy = rs.normal(0.0, 1.6, fog_n)
        fz = np.abs(rs.normal(1.6, 1.0, fog_n))
        fig.add_trace(go.Scatter3d(
            x=fx, y=fy, z=fz, mode="markers",
            marker=dict(size=3, color="#dfe3e8",
                        opacity=0.10 + 0.35 * fog_frac),
            name="Fog particles", hoverinfo="skip"))

    # --- Dark cyberpunk layout ---
    axis_common = dict(
        backgroundcolor="#05060a", gridcolor=GRID_GRAY, zerolinecolor=GRID_GRAY,
        showbackground=True, color="#7a8290",
    )
    fig.update_layout(
        paper_bgcolor="#05060a", plot_bgcolor="#05060a",
        height=540, margin=dict(l=0, r=0, t=10, b=0),
        scene=dict(
            xaxis=dict(title="Range [m]", range=[-4, max_r + 6], **axis_common),
            yaxis=dict(title="Y [m]", range=[-6, 6], **axis_common),
            zaxis=dict(title="Height [m]", range=[0, 8], **axis_common),
            aspectmode="manual",
            aspectratio=dict(x=3.0, y=0.8, z=0.6),
            camera=dict(eye=dict(x=1.6, y=-1.8, z=0.9)),
        ),
        showlegend=False,
    )
    return fig

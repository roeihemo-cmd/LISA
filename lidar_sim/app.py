"""Interactive LiDAR simulator with 3D visualization and a smart driver assistant.

Run with:  streamlit run lidar_sim/app.py
"""

import numpy as np
import streamlit as st
import streamlit.components.v1 as components

from lidar_sim import config
from lidar_sim.physics import waveform, noise
from lidar_sim.dsp import matched_filter, detection, safety
from lidar_sim.viz import scene3d, signals, canvas


st.set_page_config(page_title="LiDAR ADAS Simulator", layout="wide",
                   page_icon="\U0001F6E9")

st.title("\U0001F6E9 LiDAR Simulator + Smart Driver Assistant")
st.caption("Optical signal chain (Gaussian pulse → channel → noisy receiver → "
           "matched filter → ranging) feeding a 3D scene and ADAS decision logic.")

# --- Sidebar controls ---
d = config.DEFAULTS
with st.sidebar:
    st.header("Scene & Sensor")
    range_m = st.slider("Target range R [m]", 5.0, config.MAX_RANGE,
                        d["range_m"], 1.0)
    fog_alpha = st.slider("Fog / rain (attenuation α) [1/m]", 0.0, 0.3,
                          d["fog_alpha"], 0.005,
                          help="Beer-Lambert atmospheric attenuation. 0 = clear air.")
    p_tx = st.slider("Transmit power P_tx", 0.1, 5.0, d["p_tx"], 0.1)
    rho = st.slider("Target reflectivity ρ", 0.02, 1.0, d["rho"], 0.02)
    noise_sigma = st.slider("Receiver noise σ", 0.0, 0.5, d["noise_sigma"], 0.01)
    pulse_width_ns = st.slider("Pulse width σ [ns]", 0.5, 6.0,
                               d["pulse_width_ns"], 0.5)
    seed = st.number_input("Noise seed", min_value=0, max_value=9999, value=0, step=1)

    st.header("Driving")
    speed_kmh = st.slider("Vehicle speed V [km/h]", 0.0, 140.0, 50.0, 1.0)
    protocol_label = st.selectbox(
        "Safety protocol",
        ["Automatic Emergency Braking (AEB)",
         "Autonomous Lane Merge (Evaporative Steering)"])
    protocol = "aeb" if protocol_label.startswith("Automatic") else "merge"

    st.markdown("---")
    st.markdown("**Range resolution:** "
                f"{config.C_LIGHT / (2 * config.SAMPLE_RATE) * 100:.1f} cm")

# --- LiDAR signal chain (unchanged math) ---
sigma = pulse_width_ns * 1e-9
t = waveform.time_axis()
sent = waveform.reference_pulse(t, sigma)
rng = np.random.default_rng(int(seed))
rx = noise.build_receiver(t, range_m=range_m, p_tx=p_tx, rho=rho, alpha=fog_alpha,
                          sigma=sigma, noise_sigma=noise_sigma, rng=rng)
mf = matched_filter.apply_matched_filter(rx["received"], sent)
det = detection.detect(mf, t)

# --- Smart driver assistant ---
assist = safety.assess(det, speed_kmh)

# --- Hollywood-style system-status banner (custom HTML + neon CSS) ---
st.markdown("""
<style>
@keyframes flashRed   { 0%,100%{box-shadow:0 0 18px #ff2d55,0 0 6px #ff2d55 inset;}
                        50%{box-shadow:0 0 42px #ff2d55,0 0 18px #ff2d55 inset;} }
@keyframes flashAmber { 0%,100%{box-shadow:0 0 16px #ffb400,0 0 6px #ffb400 inset;}
                        50%{box-shadow:0 0 38px #ffb400,0 0 16px #ffb400 inset;} }
.status-banner{ border-radius:12px; padding:18px 24px; margin:6px 0 14px 0;
   font-family:'Segoe UI',sans-serif; font-weight:800; font-size:1.35rem;
   letter-spacing:1px; text-align:center; }
.banner-critical{ background:linear-gradient(90deg,#2b0008,#5a0011,#2b0008);
   color:#ffffff; border:1px solid #ff2d55; animation:flashRed 1s infinite; }
.banner-safe{ background:linear-gradient(90deg,#04130b,#0c3b22,#04130b);
   color:#9dffc4; border:1px solid #39ff14; text-shadow:0 0 8px #39ff14;
   box-shadow:0 0 18px rgba(57,255,20,.45); }
.banner-lowvis{ background:linear-gradient(90deg,#2a1d00,#4d3500,#2a1d00);
   color:#ffe7a3; border:1px solid #ffb400; animation:flashAmber 1.1s infinite; }
</style>
""", unsafe_allow_html=True)

_banner_class = {"critical": "banner-critical", "safe": "banner-safe",
                 "lowvis": "banner-lowvis"}[assist["level"]]
_banner_text = {
    "critical": "🚨 EMERGENCY: COLLISION IMMINENT — AUTOMATIC BRAKING ENGAGED!",
    "safe": "✅ SYSTEM NOMINAL: Safe Driving Distance Maintained",
    "lowvis": "⚠️ VISIBILITY CRITICAL: LiDAR Range Restricted — Reduce Speed!",
}[assist["level"]]
st.markdown(f'<div class="status-banner {_banner_class}">{_banner_text}</div>',
            unsafe_allow_html=True)

# --- Metrics row ---
m1, m2, m3, m4, m5 = st.columns(5)
m1.metric("True range", f"{range_m:.1f} m")
m2.metric("Estimated range",
          f"{det['range_hat']:.2f} m" if det["detected"] else "—")
m3.metric("Peak SNR", f"{det['snr_db']:.1f} dB")
m4.metric("Braking distance", f"{assist['braking_distance']:.1f} m")
m5.metric("Max safe speed",
          f"{assist['max_safe_speed']:.0f} km/h"
          if assist["max_safe_speed"] is not None else "—",
          delta=(f"{assist['max_safe_speed'] - speed_kmh:+.0f} km/h"
                 if assist["max_safe_speed"] is not None else None))

# --- Two-world layout ---
left, right = st.columns([3, 2])

with left:
    st.subheader("\U0001F6E3 Autonomous Driving View")
    scene_cfg = {
        "speed_kmh": speed_kmh,
        "detected": bool(det["detected"]),
        "range_hat": det["range_hat"],
        "braking_distance": assist["braking_distance"],
        "level": assist["level"],
        "protocol": protocol,
        "fog_alpha": fog_alpha,
        "max_range": config.MAX_RANGE,
        "max_speed": 140.0,
    }
    components.html(canvas.build_scene_html(scene_cfg, height=560), height=575)
    st.caption("Real-time 60 FPS scene driven by the LiDAR backend. Road scrolls "
               "with speed; AEB decelerates and flashes brake lights, Lane Merge "
               "steers the ego car clear, fog scales with α.")
    with st.expander("\U0001F697 3D LiDAR scene (rotatable)"):
        st.plotly_chart(scene3d.scene3d_figure(range_m, fog_alpha, det, assist),
                        use_container_width=True)

with right:
    st.subheader("\U0001F4C8 Signal Processing")
    st.plotly_chart(signals.raw_signal_figure(t, sent, rx["received"]),
                    use_container_width=True)
    st.plotly_chart(signals.matched_filter_figure(t, mf, det),
                    use_container_width=True)

with st.expander("The math behind the simulation"):
    st.markdown(r"""
**LiDAR signal chain**
- **Time of flight:** $\tau = \dfrac{2R}{c}$
- **Optical radar equation:** $P_{rec} = P_{tx}\cdot\dfrac{D_r^2}{4R^2}\cdot \eta_{atm}(R)\cdot \rho$
- **Atmosphere (Beer–Lambert):** $\eta_{atm}(R) = e^{-\alpha\,2R}$
- **Noisy receiver:** $r(t) = A\,s(t-\tau) + n(t),\quad n\sim\mathcal{N}(0,\sigma^2)$
- **Matched filter:** $y(t) = r(t)\star s(t)$ (maximizes SNR → pulse compression)
- **Range estimate:** $\hat{R} = \dfrac{c\,\hat{\tau}}{2}$ from the detected peak.

**Driver assistant**
- **Stopping distance:** $d = V\,t_{react} + \dfrac{V^2}{2\,g\,\mu}$  (t = 1 s, μ = 0.7, g = 9.81)
- **Decision:** brake if $\hat{R} < d$; otherwise safe. Max safe speed inverts $d(V)=\hat{R}$.
""")

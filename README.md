<div align="center">

# 🛰️ LiDAR ADAS Simulator

**An interactive, physics-accurate simulator of a LiDAR sensor and an Autonomous Emergency Braking (ADAS) decision system — from the raw optical echo all the way to the braking/steering command.**

[![Live Demo](https://img.shields.io/badge/▶_Live_Demo-Play_Now-00e0ff?style=for-the-badge)](https://roeihemo-cmd.github.io/LISA/)
[![Deploy](https://img.shields.io/badge/GitHub_Pages-deployed-39d98a?style=flat-square)](https://roeihemo-cmd.github.io/LISA/)
![JavaScript](https://img.shields.io/badge/Web-Canvas_+_JS-f7df1e?style=flat-square)
![Python](https://img.shields.io/badge/Engine-Python_·_NumPy_·_SciPy-3776ab?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)

### 👉 **[Launch the simulator → roeihemo-cmd.github.io/LISA](https://roeihemo-cmd.github.io/LISA/)**

*Runs entirely in the browser — no install, works on desktop and mobile.*

</div>

---

## Overview

This project implements the **complete perception-to-control pipeline of an automotive LiDAR system**:

> **Gaussian laser pulse → atmospheric propagation → noisy optical echo → matched-filter detection → range estimate → physics-based driving decision (AEB / Lane-Merge / Adaptive-Cruise) → actuation.**

It is both an **engineering sandbox** (every DSP and physics parameter is live-adjustable) and a **teaching tool** (each equation is documented term-by-term inside the UI). The autonomous logic is grounded in real vehicle dynamics — braking distance scales with `V²/(2μg)`, reaction latency is modeled explicitly, and the system honestly reports a **physically unavoidable collision** when the stopping distance exceeds the available range.

---

## Key Features

| Area | What it does |
|---|---|
| 🔬 **Real signal processing** | Gaussian pulse, optical radar equation, Beer–Lambert attenuation, AWGN receiver, matched-filter pulse compression, MAD-based CFAR-style detection, moving-average range smoothing. |
| 🚗 **Vehicle dynamics** | Three presets (Tesla / Corolla / Truck), each with distinct friction μ, acceleration, deceleration `a = μg`, and brake-actuator latency. |
| 🧠 **Autonomous decision** | Physics-based AEB, Lane-Merge, Adaptive-Cruise-Follow, Forward-Collision-Warning, and **Unavoidable-Collision** detection. |
| 🎬 **7 scenarios** | Cut-In, Hard-Brake, Pedestrian, Child + Ball, Heavy Fog, Static Obstacle, Roundabout (dedicated top-down circuit). |
| 📊 **Live analytics** | Real-time `r(t)` and matched-filter `y(t)` plots, range/TTC/SNR/stop-distance telemetry, and contextual per-scenario equation cards. |
| 🌐 **Bilingual by design** | 100% English UI; Hebrew reserved for the in-app `[i]` learning panels. |

---

## The Engineering

### Signal chain (unchanged, real DSP)

| Stage | Model |
|---|---|
| Transmitted pulse | `s(t) = exp(−(t−t₀)² / 2σ²)` |
| Time of flight | `τ = 2R / c` |
| Atmospheric loss (Beer–Lambert) | `η(R) = e^(−2αR)` |
| Optical radar equation | `P_rec = P_tx · ρ · (D² / 4R²) · e^(−2αR)`  (D = receiver lens diameter) |
| Noisy receiver | `r(t) = A·s(t−τ) + n(t),  n ~ 𝒩(0, σ²)` |
| Matched filter | `y(t) = r(t) ⋆ s(t)` (maximizes SNR → pulse compression) |
| Detection | peak `≥ 6 × MAD` noise floor |
| Range estimate | `R̂ = c·τ̂ / 2`, smoothed over an 8-frame moving average |

### Autonomous braking model

```
D_required = V·(T_DSP + T_filter + T_actuator)  +  V²/(2·μ·g)  +  D_buffer
             └──────── blind / reaction ───────┘   └── mechanical ──┘   └ margin ┘
```

- **Deceleration is `a = μ·g`** — so a Tesla (μ=0.90) stops *farther* from the target, while a truck (μ=0.60) needs many more metres and stops *much closer*.
- **`TTC = R / (V − V_target)`** drives the Forward-Collision-Warning and the AEB-vs-Lane-Merge choice.
- **Vulnerable road users:** `TTC ≤ 1.2 s` (or high speed) → full AEB; otherwise a smooth lane-shift avoidance.
- **Unavoidable collision:** when `R < V²/(2μg) + V·T_latency` **and** `TTC < 1.0 s`, no braking effort can stop in time — the system flags `COLLISION INEVITABLE`.
- **Roundabout:** safe cornering speed `V_max = √(μ·g·r)`.

Every equation above is explained term-by-term inside the app via the `[i]` buttons, and collected in the model reference: **[`docs/physics.html`](docs/physics.html)**.

---

## Scenarios

| # | Scenario | Engineering challenge |
|---|---|---|
| 1 | **Cut-In** | Sudden lane intrusion at short range — detect and slow / follow. |
| 2 | **Hard Brake** | Lead vehicle brakes hard — full AEB to a stop. |
| 3 | **Pedestrian** | Low reflectivity (ρ=0.1) → weak echo, low SNR — detection under noise. |
| 4 | **Child + Ball** | Very short TTC ⇒ full AEB, or smooth avoidance at low speed. |
| 5 | **Heavy Fog** | Beer–Lambert attenuation blinds the sensor beyond short range. |
| 6 | **Static Obstacle** | Stop or steer around, decided by braking distance. |
| 7 | **Roundabout** | Dedicated top-down circuit: entry → curved driving → exit, at the safe cornering speed. |

---

## Controls

- **Scenario Select** — visual picker with a preview and the challenge of each scenario.
- **Vehicle Preset** — Tesla / Corolla / Truck (truck speed realistically capped at 90 km/h).
- **Sliders** — Speed, Fog/Dust (α), Reflectivity (ρ), Noise (σ).
- **Click the car** → live physics spec sheet · **Double-click** → double the speed (stress test).
- **[i]** → learn the equation behind any value.

---

## Architecture

```
Web build (client-side, zero dependencies)
└── docs/
    ├── index.html        # deployed simulator (GitHub Pages)
    ├── simulator.html    # single self-contained source (Canvas + JS)
    └── physics.html      # equation / model reference

Python engine (original implementation)
└── lidar_sim/
    ├── physics/          # waveform · optical channel (radar eq + Beer–Lambert) · AWGN receiver
    ├── dsp/              # matched filter · detection · moving-average · safety model
    ├── desktop/          # 60 FPS Pygame app (LiDARSystem · AutonomousVehicle · SimulationApp)
    ├── viz/              # Streamlit / Plotly dashboards
    └── tests/            # numerical physics tests
```

The **JavaScript decision core mirrors the Python engine exactly** and is validated the same way (deterministic scenario sweeps, no-collision invariants, deceleration measured against `a = μg`).

---

## Run the Python engine (optional)

```bash
pip install -r lidar_sim/requirements.txt

python -m lidar_sim.desktop.app     # native 60 FPS desktop app (Pygame)
streamlit run lidar_sim/app.py      # interactive web dashboard (Streamlit)
pytest lidar_sim/tests/             # numerical physics validation
```

---

## Tech Stack

**Web:** HTML5 Canvas + vanilla JavaScript (60 FPS `requestAnimationFrame`, no libraries).
**Engine:** Python · NumPy · SciPy (`scipy.signal` for correlation) · Pygame · Streamlit · Plotly.

---

<div align="center">

**[▶ Launch the Simulator](https://roeihemo-cmd.github.io/LISA/)** · Built with a focus on physical correctness and clear, teachable engineering.

</div>

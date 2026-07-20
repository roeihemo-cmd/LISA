# 🛰️ LiDAR ADAS Simulator

An interactive, physics-based **LiDAR + Autonomous Emergency Braking (ADAS)** simulator.
It models the full optical signal chain end-to-end — a Gaussian laser pulse propagating
through atmosphere, returning buried in noise, recovered by a matched filter — and feeds the
estimated range into a physics-based autonomous driving system (AEB / Lane Merge / Adaptive
Cruise / Roundabout).

## ▶️ Play it now (live, no install)

### **https://roeihemo-cmd.github.io/LISA/**

Opens in any browser on desktop or mobile — nothing to install. (Runs entirely client-side.)

## Controls

- **Scenario Select** — open the picker to choose a driving scenario (preview + challenge).
- **Vehicle Preset** — Tesla Model 3 / Toyota Corolla / Heavy Truck (each with its own μ, acceleration, deceleration and actuator delay).
- **Sliders** — Speed, Fog/Dust (α), Reflectivity (ρ), Noise (σ).
- **Click the car** → live physics spec sheet · **Double-click** → double the speed.
- **[i] buttons** → learn the equation behind each value.

## Scenarios

| Scenario | What happens |
|---|---|
| **Cut-In** | A car merges into our lane — detect and slow / follow. |
| **Hard Brake** | Lead vehicle brakes hard — full AEB to a stop. |
| **Pedestrian** | Low-reflectivity (ρ=0.1) pedestrian crossing — weak echo, hard to detect. |
| **Child + Ball** | Child crosses after a ball — short TTC ⇒ full AEB, or smooth avoidance at low speed. |
| **Heavy Fog** | Beer–Lambert attenuation blinds the sensor at range. |
| **Static Obstacle** | Barrier/cone — stop or steer around by braking distance. |
| **Roundabout** | Top-down circuit: slow to the safe cornering speed and drive the arc. |

## The engineering

**Signal chain (unchanged, real DSP):** Gaussian pulse → optical radar equation → Beer–Lambert
atmospheric attenuation → AWGN receiver → matched-filter pulse compression → MAD-based
detection → range estimate `R̂ = c·τ̂/2`, smoothed by an 8-frame moving average.

**Autonomous decision (physics):**

```
D_required = V·(T_DSP + T_filter + T_actuator) + V²/(2·μ·g) + D_buffer
```

- Braking decelerates at **a = μ·g** — so a Tesla (μ=0.90) stops farther from the target,
  while a truck (μ=0.60) needs many more metres and stops much closer.
- **TTC = R / (V − V_target)** drives Forward Collision Warning and the AEB-vs-Lane-Merge choice.
- Vulnerable road users: **TTC ≤ 1.2 s** or high speed ⇒ full AEB; low speed ⇒ smooth lane-shift.
- Roundabout: **V_max = √(μ·g·r)** safe cornering speed.

The model reference (every equation, with term-by-term explanations) lives in
[`docs/physics.html`](docs/physics.html).

## Repository layout

```
docs/
├── index.html        # the live web simulator (served by GitHub Pages)
├── simulator.html    # simulator source (single self-contained file)
└── physics.html      # model / equation reference
index.html            # root copy of the simulator (for the Pages root URL)

lidar_sim/            # original Python implementation (Streamlit + Pygame desktop app)
├── physics/          # waveform, optical channel, AWGN receiver
├── dsp/              # matched filter, detection, moving-average, safety model
├── desktop/          # Pygame app (LiDARSystem, AutonomousVehicle, SimulationApp)
└── tests/            # numerical physics tests
```

## Run the Python versions (optional)

```bash
pip install -r lidar_sim/requirements.txt
python -m lidar_sim.desktop.app       # native 60 FPS desktop app
# or
streamlit run lidar_sim/app.py        # web dashboard
pytest lidar_sim/tests/               # physics tests
```

## Tech

Pure client-side **HTML5 Canvas + JavaScript** (no dependencies) for the web build;
**Python / NumPy / SciPy / Pygame** for the original engine.

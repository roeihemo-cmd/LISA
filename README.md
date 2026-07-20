# LiDAR ADAS Simulator

An interactive, physics-based **LiDAR + Autonomous Emergency Braking (ADAS)** simulator.
It models the full optical signal chain end-to-end — a Gaussian laser pulse propagating
through atmosphere, returning buried in noise, recovered by a matched filter — and feeds the
estimated range into a physics-based autonomous decision system (AEB / Lane Merge / Adaptive Cruise).

## Highlights

- **Real signal processing** — Gaussian pulse, Beer–Lambert atmospheric attenuation, optical
  radar equation, AWGN receiver, matched-filter pulse compression, MAD-based detection.
- **2D scanning point cloud** — an angular scan fan renders detections on the target's bumper.
- **Autonomous decision logic** — braking distance `v²/(2a)` + reaction buffer + closing-rate
  gate; chooses **AEB**, **Lane Merge**, or **Adaptive-Cruise Follow** from physics alone.
- **Two front-ends** — a native 60 FPS **Pygame** desktop app and a self-contained **web** build.

## Run — desktop (Pygame)

```bash
pip install -r lidar_sim/requirements.txt
python -m lidar_sim.desktop.app
```

Controls: `SPACE` random scenario · `1`/`2`/`3` force target (static / 50 km/h / brake-threat) ·
`H` toggle equations · sliders for speed, fog, power, reflectivity, noise.

## Run — web

Open [`docs/simulator.html`](docs/simulator.html) in any browser — no dependencies.

## Tests

```bash
pytest lidar_sim/tests/
```

## Structure

```
lidar_sim/
├── physics/     # waveform, optical channel (radar eq + Beer–Lambert), AWGN receiver
├── dsp/         # matched filter, detection, moving-average filter, safety model
├── desktop/     # Pygame app: LiDARSystem, AutonomousVehicle, TargetVehicle, SimulationApp
├── viz/         # Plotly / canvas visualizations (Streamlit + 3D)
└── tests/       # numerical physics validation
docs/            # web build (simulator.html) + model reference (physics.html)
```

## Model reference

See [`docs/physics.html`](docs/physics.html) for every equation used across the signal chain
and the decision logic.

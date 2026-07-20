"""Physical constants and default simulation parameters for the LiDAR simulator.

All SI units unless noted otherwise.
"""

# --- Physical constants ---
C_LIGHT = 299_792_458.0  # speed of light [m/s]

# --- Time / sampling ---
# We sample the receiver fast enough that a single pulse spans several samples.
# Range resolution dR = c / (2 * fs). With fs = 3 GHz -> dR ~ 5 cm.
SAMPLE_RATE = 3.0e9          # [Hz]
MAX_RANGE = 120.0            # [m] max simulated range -> sets the time window
WINDOW = 2 * MAX_RANGE / C_LIGHT  # [s] round-trip time for max range

# --- Default scene / system parameters (also used as slider defaults) ---
DEFAULTS = {
    "range_m": 40.0,         # target distance R [m]
    "fog_alpha": 0.02,       # atmospheric attenuation coefficient alpha [1/m]
    "p_tx": 1.0,             # transmit power (normalized) [W]
    "rho": 0.3,              # target reflectivity / albedo [-]
    "noise_sigma": 0.15,     # std-dev of receiver AWGN [-]
    "pulse_width_ns": 2.0,   # gaussian pulse sigma [ns]
}

# --- Receiver optics ---
RX_DIAMETER = 0.05           # receiver lens diameter D_r [m]

# Detector gain: converts the tiny received optical power into a normalized
# electrical signal amplitude (~order 1) for display and processing.
RX_GAIN = 2.0e8

# --- Detection ---
# Detection threshold expressed as a multiple of the matched-filter noise floor.
DETECTION_THRESHOLD_FACTOR = 6.0

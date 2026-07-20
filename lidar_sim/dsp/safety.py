"""Smart driver-assistance layer: braking physics and collision decision logic.

Sits on top of the LiDAR detection output and turns an estimated range into a
driving decision (safe / brake / low-visibility) plus a max-safe-speed advisory.
"""

import math

# --- Driving model constants ---
REACTION_TIME = 1.0       # driver/system reaction time [s]
FRICTION_DRY = 0.7        # tyre-road friction coefficient (dry asphalt) [-]
G = 9.81                  # gravitational acceleration [m/s^2]

KMH_TO_MS = 1.0 / 3.6
MS_TO_KMH = 3.6


def braking_distance(speed_kmh: float, reaction_time: float = REACTION_TIME,
                     friction: float = FRICTION_DRY, g: float = G) -> float:
    """Total stopping distance [m] = reaction distance + braking distance.

    d = V*t_reaction + V^2 / (2*g*mu)
    """
    v = speed_kmh * KMH_TO_MS
    reaction = v * reaction_time
    braking = v ** 2 / (2.0 * g * friction)
    return reaction + braking


def max_safe_speed(range_m: float, reaction_time: float = REACTION_TIME,
                   friction: float = FRICTION_DRY, g: float = G) -> float:
    """Largest speed [km/h] whose stopping distance still fits within range_m.

    Invert d(V) = V*t + V^2/(2*g*mu) = range_m  (quadratic in V, take + root).
    """
    if range_m <= 0:
        return 0.0
    a = 1.0 / (2.0 * g * friction)
    b = reaction_time
    c = -range_m
    disc = b ** 2 - 4.0 * a * c
    v_ms = (-b + math.sqrt(disc)) / (2.0 * a)
    return max(0.0, v_ms * MS_TO_KMH)


def assess(detection: dict, speed_kmh: float) -> dict:
    """Combine LiDAR detection with the braking model into a driving decision.

    Returns a dict describing the alert level ('safe' | 'critical' | 'lowvis'),
    a message, the braking distance and the max safe speed.
    """
    d_brake = braking_distance(speed_kmh)

    if not detection["detected"]:
        return {
            "level": "lowvis",
            "message": "⚠️ Visibility Low — Reduce Speed",
            "braking_distance": d_brake,
            "max_safe_speed": None,
            "range_m": None,
        }

    range_m = detection["range_hat"]
    v_safe = max_safe_speed(range_m)

    if range_m < d_brake:
        level = "critical"
        message = "\U0001F6A8 CRITICAL WARNING: BRAKE NOW! Collision Course!"
    else:
        level = "safe"
        message = "✅ Safe Driving Conditions"

    return {
        "level": level,
        "message": message,
        "braking_distance": d_brake,
        "max_safe_speed": v_safe,
        "range_m": range_m,
    }

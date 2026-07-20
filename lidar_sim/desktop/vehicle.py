"""Vehicle state machines (ego + target), driven by dt.

Uses the existing safety braking model (lidar_sim.dsp.safety) unchanged.
"""

import random

from ..dsp import safety

# Realistic braking deceleration shared by physics AND the D=v^2/(2a) UI figure,
# so the on-screen stopping distance matches the displayed braking distance.
BRAKE_DECEL_MS2 = 6.5                       # [m/s^2]
BRAKE_DECEL_KMH_PER_S = BRAKE_DECEL_MS2 * 3.6


class AutonomousVehicle:
    """The ego vehicle. Position is a lateral lane coordinate in world units."""

    DECEL_KMH_PER_S = BRAKE_DECEL_KMH_PER_S   # matches D_braking = v^2/(2a)
    STEER_RATE = 3.5                          # lane-change lateral easing [1/s]

    def __init__(self, speed_kmh: float, lane_x: float):
        self.speed = speed_kmh          # current speed [km/h]
        self.cruise_speed = speed_kmh   # target when not braking
        self.x = lane_x                 # lateral position (world units)
        self.target_x = lane_x          # steering target
        self.braking = False
        self.merging = False
        self.avoided = False            # obstacle cleared via lane change
        self.brake_target_speed = 0.0   # AEB decelerates DOWN TO this speed

    def braking_distance(self) -> float:
        """Delegates to the shared physical model d = V t + V^2/(2 g mu)."""
        return safety.braking_distance(self.speed)

    def engage_aeb(self, target_speed=0.0):
        """Brake toward target_speed (0 for a static obstacle, or the lead
        car's speed so we slow to match a moving vehicle instead of halting)."""
        self.braking = True
        self.brake_target_speed = target_speed

    def engage_merge(self, escape_x: float):
        if not self.merging:
            self.merging = True
            self.target_x = escape_x

    def release(self):
        """No hazard: resume cruising (unless a merge already cleared it)."""
        self.braking = False

    def update(self, dt: float):
        # --- longitudinal dynamics ---
        if self.braking:
            self.speed = max(self.brake_target_speed,
                             self.speed - self.DECEL_KMH_PER_S * dt)
        elif not self.merging and self.speed < self.cruise_speed:
            # gentle throttle back up to cruise when clear
            self.speed = min(self.cruise_speed, self.speed + 15.0 * dt)
        elif not self.merging and self.speed > self.cruise_speed:
            # coast/brake down to a lowered cruise target (adaptive-cruise follow)
            self.speed = max(self.cruise_speed,
                             self.speed - self.DECEL_KMH_PER_S * dt)

        # --- lateral dynamics (smooth easing toward target lane) ---
        self.x += (self.target_x - self.x) * min(1.0, self.STEER_RATE * dt)
        if self.merging and abs(self.target_x - self.x) < 0.03:
            self.avoided = True


class TargetVehicle:
    """The leading vehicle ahead, with a randomized behaviour per encounter."""

    BEHAVIORS = ("static", "slow", "brake_threat")
    THREAT_TRIGGER_S = 3.0          # brake_threat: seconds before slamming brakes
    THREAT_DECEL_MS2 = 8.0          # target's own maximum braking

    def __init__(self, behavior=None):
        self.behavior = behavior or random.choice(self.BEHAVIORS)
        self.timer = 0.0
        self.braking = False
        self.speed = {"static": 0.0, "slow": 50.0,
                      "brake_threat": 80.0}[self.behavior]

    def label(self):
        return {
            "static": "STATIC OBSTACLE  (0 km/h)",
            "slow": "CONSTANT PACE  (50 km/h)",
            "brake_threat": "EMERGENCY BRAKE THREAT",
        }[self.behavior]

    def update(self, dt):
        self.timer += dt
        if self.behavior == "brake_threat" and self.timer >= self.THREAT_TRIGGER_S:
            self.braking = True
            self.speed = max(0.0, self.speed
                             - self.THREAT_DECEL_MS2 * 3.6 * dt)

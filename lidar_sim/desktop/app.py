"""SimulationApp: the 60 FPS Pygame game loop, rendering and scenario logic.

Run with:  python -m lidar_sim.desktop.app
"""

import math

import numpy as np
import pygame

from .. import config
from ..dsp.filters import MovingAverage
from . import widgets as W
from .lidar_system import LiDARSystem
from .vehicle import AutonomousVehicle, TargetVehicle, BRAKE_DECEL_MS2

# --- window / layout ---
WIN_W, WIN_H = 1280, 720
PANEL_W = 300                      # left control panel
VIEW_X0, VIEW_X1 = PANEL_W, 900    # centre driving view
RIGHT_X0 = 900                     # analytics column

# --- driving view geometry ---
HORIZON_Y = 130
EGO_Y = 620
MAXV = config.MAX_RANGE            # metres mapped to full road depth

# --- scenario constants ---
CRUISE_KMH = 110.0
START_RANGE = 110.0
LANE_MID, LANE_RIGHT = 0.0, 1.0

# --- autonomous-decision safety model ---
REACTION_TIME_S = 0.8         # system + driver reaction lag
STATIC_BUFFER_M = 5.0         # constant safety margin
A_COMFORT_MS2 = 3.5           # comfortable deceleration (< physical max 6.5)

# --- scan fan / point-cloud geometry ---
LANE_WIDTH_M = 3.5             # world lane spacing in metres
TARGET_HALF_W = 1.4            # half-width of the target rear bumper [m]
SCAN_FOV_DEG = 15.0           # +/- angular sector
SCAN_LINES = 41               # number of scan angles (denser cloud)
MA_WINDOW = 8                 # moving-average window [frames]


class SimulationApp:
    def __init__(self):
        pygame.init()
        pygame.display.set_caption("LiDAR ADAS — Autonomous Driving Simulator")
        self.screen = pygame.display.set_mode((WIN_W, WIN_H))
        self.clock = pygame.time.Clock()
        self.font = pygame.font.SysFont("consolas", 15)
        self.font_sm = pygame.font.SysFont("consolas", 12)
        self.font_big = pygame.font.SysFont("segoeui", 30, bold=True)
        self.font_hud = pygame.font.SysFont("consolas", 18, bold=True)

        self.lidar = LiDARSystem()

        d = config.DEFAULTS
        sx, sw = 24, PANEL_W - 48
        self.s_speed = W.Slider(sx, 120, sw, "Cruise Speed  V [km/h]", 0.0, 140.0,
                                CRUISE_KMH, "{:.0f}")
        self.s_alpha = W.Slider(sx, 185, sw, "Fog / Rain  α [1/m]", 0.0, 0.3,
                                d["fog_alpha"], "{:.3f}")
        self.s_ptx = W.Slider(sx, 250, sw, "Transmit Power  P_tx", 0.1, 5.0,
                              d["p_tx"], "{:.2f}")
        self.s_rho = W.Slider(sx, 315, sw, "Reflectivity  ρ", 0.02, 1.0,
                              d["rho"], "{:.2f}")
        self.s_noise = W.Slider(sx, 380, sw, "Receiver Noise  σ", 0.0, 0.5,
                                d["noise_sigma"], "{:.2f}")
        self.sliders = [self.s_speed, self.s_alpha, self.s_ptx, self.s_rho,
                        self.s_noise]

        self.b_eq = W.Button(sx, 578, sw, 34, "Show / Hide Equations  [H]")
        self.b_eq.active = True
        self.show_eq = True

        self.vehicle = AutonomousVehicle(self.s_speed.value, LANE_MID)

        # target behaviour control: RANDOM (SPACE) or MANUAL (keys 1/2/3)
        self.target_mode = "RANDOM"
        self.forced_behavior = None
        self.target = TargetVehicle()
        self.lane_free = True          # adjacent lane availability for merges

        # autonomous decision state (latched per encounter)
        self.decision = "CRUISE"       # CRUISE | AEB | LANE MERGE | FOLLOW
        self.committed = False
        self.following = False         # adaptive-cruise follow of a moving lead
        self.d_braking_phys = 0.0      # v^2/(2a) [m]
        self.d_required = 0.0          # D_braking + reaction buffer [m]
        self.speed_diff = 0.0          # closing rate ego - target [km/h]

        # scan angles (radians) and range smoothing filter
        self.scan_angles = np.deg2rad(
            np.linspace(-SCAN_FOV_DEG, SCAN_FOV_DEG, SCAN_LINES))
        self.range_filter = MovingAverage(MA_WINDOW)
        self.scan_points = []          # per-frame [(screen_x, screen_y, detected)]
        self.raw_est = None
        self.smoothed_est = None

        self.range_m = START_RANGE
        self.scroll = 0.0
        self.last = None          # last LiDAR measurement dict
        self.running = True
        self.t_sec = 0.0
        self.stopped_timer = 0.0

    # ---------------------------------------------------------------- reset
    def reset_scenario(self):
        self.range_m = START_RANGE
        self.vehicle = AutonomousVehicle(self.s_speed.value, LANE_MID)
        self.vehicle.merging = False
        # MANUAL keeps the forced behaviour; RANDOM re-rolls it
        if self.target_mode == "MANUAL" and self.forced_behavior:
            self.target = TargetVehicle(self.forced_behavior)
        else:
            self.target = TargetVehicle()
        self.decision = "CRUISE"
        self.committed = False
        self.following = False
        self.stopped_timer = 0.0
        self.range_filter.reset()

    # ------------------------------------------------------------- events
    def handle_events(self):
        for ev in pygame.event.get():
            if ev.type == pygame.QUIT:
                self.running = False
            elif ev.type == pygame.KEYDOWN and ev.key == pygame.K_SPACE:
                self.target_mode = "RANDOM"
                self.forced_behavior = None
                self.reset_scenario()
            elif ev.type == pygame.KEYDOWN and ev.key in (
                    pygame.K_1, pygame.K_2, pygame.K_3):
                forced = {pygame.K_1: "static", pygame.K_2: "slow",
                          pygame.K_3: "brake_threat"}[ev.key]
                self.target_mode = "MANUAL"
                self.forced_behavior = forced
                self.reset_scenario()
            elif ev.type == pygame.KEYDOWN and ev.key == pygame.K_h:
                self.show_eq = not self.show_eq
            for s in self.sliders:
                s.handle_event(ev)
            if self.b_eq.handle_event(ev):
                self.show_eq = not self.show_eq
        self.b_eq.active = self.show_eq

    # ------------------------------------------------------------- update
    def update(self, dt):
        self.t_sec += dt
        v = self.vehicle
        # live speed control from slider; while following a lead, cap to its pace
        if self.following:
            v.cruise_speed = min(self.s_speed.value, self.target.speed)
        else:
            v.cruise_speed = self.s_speed.value

        # 1) LiDAR measurement of the true gap (identical math, fresh noise)
        self.last = self.lidar.measure(
            self.range_m, p_tx=self.s_ptx.value, rho=self.s_rho.value,
            alpha=self.s_alpha.value, noise_sigma=self.s_noise.value)
        det = self.last["detection"]
        detected = det["detected"]
        raw_est = det["range_hat"] if detected else None

        # 1b) moving-average smoothing of the raw range (anti-jitter).
        #     A lost target clears the buffer so stale data can't linger.
        if detected:
            smoothed = self.range_filter.update(raw_est)
        else:
            self.range_filter.reset()
            smoothed = None

        # 2) distances the ego needs (all physics-based):
        #    D_braking : minimum physical stop distance at max deceleration
        #    D_safe    : reaction lag + static buffer
        #    D_total   : the distance actually required to stop SAFELY
        #    D_engage  : comfortable-braking engagement threshold (react early)
        v_ego = v.speed / 3.6
        d_braking = v_ego ** 2 / (2.0 * BRAKE_DECEL_MS2)
        d_safe = v_ego * REACTION_TIME_S + STATIC_BUFFER_M
        d_total = d_braking + d_safe
        d_engage = v_ego ** 2 / (2.0 * A_COMFORT_MS2) + d_safe
        self.d_braking_phys = d_braking
        self.d_brake = d_braking            # physical stop distance (dashboard)
        self.d_required = d_total           # safe required distance (dashboard)
        self.detected = detected
        self.raw_est = raw_est
        self.smoothed_est = smoothed
        self.est = smoothed                 # filtered range the AD logic acts on
        self.blinded = not detected

        # 3) scan fan -> 2D point cloud (radar equation + noise per angle)
        self._run_scan()

        # 4) AUTONOMOUS DECISION (latched once per encounter):
        d_sensor = smoothed
        threat = (detected and d_sensor is not None
                  and d_sensor < d_engage and not v.avoided)
        self.critical = threat

        # closing rate: how much faster we are than the target ahead [km/h].
        # A slowly-approached moving car does NOT warrant a full stop.
        speed_diff = v.speed - self.target.speed
        self.speed_diff = speed_diff

        if threat and not self.committed:
            # AEB only if the gap is dangerous AND we can safely stop AND we are
            # closing fast (>15 km/h). Otherwise steer around instead of braking.
            if d_sensor >= d_total and speed_diff > 15.0:
                self.decision = "AEB"
                # brake DOWN TO the lead's speed (0 only for a static obstacle),
                # so we don't halt in the middle of the road behind a moving car.
                v.engage_aeb(target_speed=self.target.speed)
            elif self.lane_free:
                self.decision = "LANE MERGE"
                v.engage_merge(LANE_RIGHT)
            else:
                self.decision = "AEB"              # no free lane -> last resort
                v.engage_aeb(target_speed=self.target.speed)
            self.committed = True
        elif not threat and not self.committed:
            self.decision = "CRUISE"
            if not v.merging and not v.braking:
                v.release()

        # 4b) keep the AEB stop target tracking the lead's LIVE speed, so a lead
        #     that keeps braking (brake-threat) is followed all the way down to a
        #     full stop instead of coasting into it at a stale snapshot speed.
        if v.braking:
            v.brake_target_speed = max(0.0, self.target.speed)

        # 4c) once AEB has slowed us to a MOVING lead's steady pace, stop braking
        #     and follow it (adaptive cruise) instead of coming to a full stop.
        if (self.decision == "AEB" and v.braking
                and self.target.speed > 1.0 and not self.target.braking
                and v.speed <= self.target.speed + 0.5):
            v.braking = False
            self.following = True
            self.decision = "FOLLOW"

        # 5) vehicle physics
        v.update(dt)
        self.target.update(dt)

        # 6) scenario kinematics — gap closes by ego/target relative speed
        v_target = self.target.speed / 3.6
        if v.avoided:
            rel = -(abs(v_ego) + 4.0)       # cleared: target falls behind
        else:
            rel = v_target - v_ego          # ego faster -> gap shrinks
        self.range_m += rel * dt
        self.range_m = max(5.0, min(MAXV, self.range_m))

        # 5) road scroll proportional to ego speed
        self.scroll = (self.scroll + v_ego * dt * 9.0) % 2000.0

        # 6) auto-reset once cleared, collided, or stopped for a moment
        if v.speed < 1.0 and v.braking:
            self.stopped_timer += dt
        else:
            self.stopped_timer = 0.0
        if ((v.avoided and self.range_m >= MAXV - 1)
                or self.range_m <= 5.5
                or self.stopped_timer > 2.5):
            self.reset_scenario()

    # ---------------------------------------------------- view transforms
    def _range_to_y(self, r):
        f = max(0.0, min(1.0, r / MAXV))
        return EGO_Y + (HORIZON_Y - EGO_Y) * f

    def _road_half(self, y):
        f = (y - HORIZON_Y) / (EGO_Y - HORIZON_Y)
        return 30 + (270 - 30) * f

    def _world_x(self, world_x, y):
        cx = (VIEW_X0 + VIEW_X1) / 2
        return cx + world_x * self._road_half(y) * 0.55

    # --------------------------------------------------------------- scan
    def _run_scan(self):
        """Sweep the angular sector; each ray that strikes the target rear
        bumper produces a point-cloud return via the radar equation + noise."""
        pts = []
        R = self.range_m
        ego_lat = self.vehicle.x * LANE_WIDTH_M
        target_lat = LANE_MID * LANE_WIDTH_M
        y_face = self._range_to_y(R)
        sc = 0.25 + 0.85 * (y_face - HORIZON_Y) / (EGO_Y - HORIZON_Y)
        for ang in self.scan_angles:
            lateral = ego_lat + R * math.tan(ang)
            if abs(lateral - target_lat) > TARGET_HALF_W:
                continue                      # ray misses the target
            slant = R / math.cos(ang)
            p = self.lidar.probe(slant, self.s_ptx.value, self.s_rho.value,
                                 self.s_alpha.value, self.s_noise.value)
            sx = self._world_x(lateral / LANE_WIDTH_M, y_face)
            # two rows across the bumper height -> a fuller 2D point cloud
            for dy in (-9 * sc, 9 * sc):
                pts.append((sx, y_face + dy, p["detected"], sc))
        self.scan_points = pts

    def _draw_scan_points(self, s):
        for sx, sy, detected, sc in self.scan_points:
            col = W.GREEN if detected else W.RED
            r = max(2, int(4 * sc))
            glow = pygame.Surface((r * 6, r * 6), pygame.SRCALPHA)
            pygame.draw.circle(glow, (*col, 90), (r * 3, r * 3), r * 3)
            s.blit(glow, (sx - r * 3, sy - r * 3))
            pygame.draw.circle(s, col, (int(sx), int(sy)), r)
            pygame.draw.circle(s, (255, 255, 255), (int(sx), int(sy)),
                               max(1, r // 2))

    # ------------------------------------------------------------- render
    def render(self):
        s = self.screen
        s.fill(W.BG)
        self._draw_panel(s)
        self._draw_view(s)
        self._draw_analytics(s)
        pygame.display.flip()

    def _draw_panel(self, s):
        pygame.draw.rect(s, W.PANEL, (0, 0, PANEL_W, WIN_H))
        pygame.draw.line(s, W.PANEL_EDGE, (PANEL_W, 0), (PANEL_W, WIN_H), 2)
        title = self.font_hud.render("LiDAR CONTROL", True, W.CYAN)
        s.blit(title, (24, 28))
        sub = self.font_sm.render("Sensor & Environment", True, W.TEXT_DIM)
        s.blit(sub, (24, 58))
        for sl in self.sliders:
            sl.draw(s, self.font)

        # --- target behaviour + control mode ---
        mode_txt = ("TARGET MODE: RANDOM" if self.target_mode == "RANDOM"
                    else "TARGET MODE: MANUAL [1/2/3]")
        s.blit(self.font_sm.render(mode_txt, True,
               W.CYAN if self.target_mode == "MANUAL" else W.TEXT_DIM), (24, 430))
        s.blit(self.font.render(self.target.label(), True, W.AMBER), (24, 448))
        s.blit(self.font_sm.render(f"target speed: {self.target.speed:4.0f} km/h",
               True, W.TEXT_DIM), (24, 470))
        diff_col = W.RED if self.speed_diff > 15.0 else W.GREEN
        s.blit(self.font_sm.render(f"closing Δv: {self.speed_diff:+4.0f} km/h",
               True, diff_col), (24, 486))

        # --- autonomous decision ---
        dec_col = {"CRUISE": W.CYAN, "AEB": W.RED, "LANE MERGE": W.GREEN,
                   "FOLLOW": W.AMBER}.get(self.decision, W.CYAN)
        s.blit(self.font_sm.render("AUTONOMOUS DECISION", True, W.TEXT_DIM),
               (24, 508))
        box = pygame.Rect(24, 526, PANEL_W - 48, 32)
        pygame.draw.rect(s, (12, 16, 22), box, border_radius=8)
        pygame.draw.rect(s, dec_col, box, 2, border_radius=8)
        dtxt = self.font.render(self.decision, True, dec_col)
        s.blit(dtxt, (box.centerx - dtxt.get_width() // 2,
                      box.centery - dtxt.get_height() // 2))

        self.b_eq.draw(s, self.font_sm)
        eq_hint = "H equations" if self.show_eq else "H equations (hidden)"
        hint = self.font_sm.render(f"SPACE random · 1/2/3 force · {eq_hint}",
                                   True, W.TEXT_DIM)
        s.blit(hint, (24, WIN_H - 26))

    def _draw_view(self, s):
        view = pygame.Rect(VIEW_X0, 0, VIEW_X1 - VIEW_X0, WIN_H)
        s.set_clip(view)
        cx = (VIEW_X0 + VIEW_X1) / 2

        # sky/ground gradient
        pygame.draw.rect(s, (9, 12, 18), view)
        # asphalt trapezoid
        top_h, bot_h = self._road_half(HORIZON_Y), self._road_half(EGO_Y + 60)
        road = [(cx - top_h, HORIZON_Y), (cx + top_h, HORIZON_Y),
                (cx + bot_h, EGO_Y + 60), (cx - bot_h, EGO_Y + 60)]
        pygame.draw.polygon(s, (22, 26, 34), road)
        # neon shoulders
        for side in (-1, 1):
            pygame.draw.line(s, W.CYAN,
                             (cx + side * top_h, HORIZON_Y),
                             (cx + side * bot_h, EGO_Y + 60), 3)
        # scrolling dashed lane dividers
        for lane in (-0.5, 0.5):
            for k in range(-1, 30):
                yy = HORIZON_Y + ((k * 45 + self.scroll) % (EGO_Y - HORIZON_Y + 80))
                if yy < HORIZON_Y or yy > EGO_Y + 40:
                    continue
                y2 = min(yy + 20, EGO_Y + 40)
                w = max(1, int(1 + 4 * (yy - HORIZON_Y) / (EGO_Y - HORIZON_Y)))
                pygame.draw.line(s, (210, 214, 220),
                                 (self._world_x(lane, yy), yy),
                                 (self._world_x(lane, y2), y2), w)

        # leading car
        self._draw_lead_car(s)
        # laser beam (scan fan edges)
        self._draw_beam(s)
        # 2D point cloud on the target bumper
        self._draw_scan_points(s)
        # ego car
        self._draw_ego(s)
        # weather overlay
        self._draw_weather(s, view)
        # HUD + cinematic overlay
        self._draw_hud(s)
        s.set_clip(None)

    def _draw_lead_car(self, s):
        y = self._range_to_y(self.range_m)
        sx = self._world_x(LANE_MID, y)
        sc = 0.25 + 0.85 * (y - HORIZON_Y) / (EGO_Y - HORIZON_Y)
        w, h = 46 * sc, 74 * sc
        col = (150, 40, 55) if self.detected else (40, 44, 52)
        rect = pygame.Rect(sx - w / 2, y - h / 2, w, h)
        pygame.draw.rect(s, col, rect, border_radius=int(6 * sc))
        pygame.draw.rect(s, (16, 18, 24), rect.inflate(-8 * sc, -h * 0.5),
                         border_radius=int(4 * sc))
        if self.detected:
            pygame.draw.rect(s, W.GREEN, rect, 3, border_radius=int(6 * sc))
            if math.sin(self.t_sec * 8) > 0:      # hazard blink
                for dx in (-w / 2 + 5 * sc, w / 2 - 5 * sc):
                    pygame.draw.circle(s, W.AMBER,
                                       (int(sx + dx), int(y + h / 2 - 5 * sc)),
                                       max(1, int(3 * sc)))

    def _draw_beam(self, s):
        """Draw the LiDAR scan fan: a translucent sector plus a bright dashed
        centre pulse from the ego bumper across the angular sector."""
        if not self.detected and self.blinded:
            return
        fx, fy = self._world_x(self.vehicle.x, EGO_Y), EGO_Y - 40
        col = W.GREEN if self.detected else W.RED
        R = self.range_m
        ego_lat = self.vehicle.x * LANE_WIDTH_M
        y_face = self._range_to_y(R)

        # translucent fan sector between the extreme scan angles
        fan = pygame.Surface((VIEW_X1 - VIEW_X0, WIN_H), pygame.SRCALPHA)
        a_min, a_max = self.scan_angles[0], self.scan_angles[-1]
        p_left = (self._world_x((ego_lat + R * math.tan(a_min)) / LANE_WIDTH_M,
                                y_face) - VIEW_X0, y_face)
        p_right = (self._world_x((ego_lat + R * math.tan(a_max)) / LANE_WIDTH_M,
                                 y_face) - VIEW_X0, y_face)
        pygame.draw.polygon(fan, (*col, 26),
                            [(fx - VIEW_X0, fy), p_left, p_right])
        s.blit(fan, (VIEW_X0, 0))

        # bright dashed pulse along the centre line
        tx, ty = self._world_x(LANE_MID, y_face), y_face
        n = 22
        for i in range(n):
            a0 = (i + (self.t_sec * 6) % 1) / n
            a1 = a0 + 0.5 / n
            if a1 > 1:
                continue
            x0, yy0 = fx + (tx - fx) * a0, fy + (ty - fy) * a0
            x1, yy1 = fx + (tx - fx) * a1, fy + (ty - fy) * a1
            pygame.draw.line(s, col, (x0, yy0), (x1, yy1), 3)

    def _draw_ego(self, s):
        x = self._world_x(self.vehicle.x, EGO_Y)
        w, h = 56, 96
        body = pygame.Rect(x - w / 2, EGO_Y - h / 2, w, h)
        pygame.draw.rect(s, (44, 56, 78), body, border_radius=12)
        pygame.draw.rect(s, (12, 22, 36), body.inflate(-14, -h * 0.5),
                         border_radius=8)
        pygame.draw.rect(s, W.CYAN, body, 2, border_radius=12)
        # headlights (front = top)
        for dx in (-w / 2 + 10, w / 2 - 10):
            pygame.draw.circle(s, (255, 255, 210),
                               (int(x + dx), int(EGO_Y - h / 2)), 4)
        # brake lights (rear = bottom), bright & flashing while braking
        braking = self.vehicle.braking and self.vehicle.speed > 0.1
        on = braking and (math.sin(self.t_sec * 12) > -0.3)
        for dx in (-w / 2 + 10, w / 2 - 10):
            c = W.RED if on else (90, 20, 30)
            pygame.draw.circle(s, c, (int(x + dx), int(EGO_Y + h / 2 - 4)), 5)

    def _draw_weather(self, s, view):
        frac = max(0.0, min(1.0, self.s_alpha.value / 0.3))
        if frac <= 0.01:
            return
        fog = pygame.Surface(view.size, pygame.SRCALPHA)
        fog.fill((205, 210, 218, int(120 * frac)))
        s.blit(fog, view.topleft)
        # deterministic drifting particles / rain
        rs = np.random.RandomState(7)
        n = int(frac * 160)
        for i in range(n):
            bx = VIEW_X0 + rs.rand() * (VIEW_X1 - VIEW_X0)
            by = (rs.rand() * WIN_H + self.t_sec * (120 + 240 * frac)) % WIN_H
            if frac > 0.55:
                pygame.draw.line(s, (225, 230, 236),
                                 (bx, by), (bx - 2, by + 11), 1)
            else:
                pygame.draw.circle(s, (230, 234, 240), (int(bx), int(by)), 2)

    def _draw_hud(self, s):
        # top-left readouts inside the view
        spd = self.font_hud.render(f"SPEED {self.vehicle.speed:5.0f} km/h",
                                   True, W.CYAN)
        s.blit(spd, (VIEW_X0 + 16, 16))
        rng = (f"RANGE {self.est:5.1f} m" if (self.detected and self.est is not None)
               else "RANGE  -- LOST")
        s.blit(self.font_hud.render(rng, True,
               W.GREEN if self.detected else W.RED), (VIEW_X0 + 16, 40))

        # braking-state indicator (flashing) next to the readouts
        if self.vehicle.braking and self.vehicle.speed > 0.1:
            if math.sin(self.t_sec * 10) > -0.2:
                dot_x = VIEW_X0 + 16
                pygame.draw.circle(s, W.RED, (dot_x + 8, 78), 8)
                s.blit(self.font_hud.render("BRAKING", True, W.RED),
                       (dot_x + 24, 68))

        # cinematic centre overlay (driven by the autonomous decision)
        msg, col = None, W.RED
        if self.blinded:
            msg, col = "SENSOR BLINDED - DISENGAGING AUTOPILOT", W.AMBER
        elif self.decision == "AEB" and self.vehicle.braking:
            msg, col = "EMERGENCY BRAKING ENGAGED", W.RED
        elif self.decision == "LANE MERGE" and self.vehicle.merging:
            msg, col = "COLLISION AVOIDANCE: LANE CHANGE", W.GREEN
        elif self.decision == "FOLLOW":
            msg, col = "ADAPTIVE CRUISE: MATCHING LEAD SPEED", W.AMBER
        if msg:
            a = 0.55 + 0.45 * abs(math.sin(self.t_sec * 4))
            surf = self.font_big.render(msg, True, col)
            # scale down to fit within the centre view with safe margins
            avail = (VIEW_X1 - VIEW_X0) - 48
            if surf.get_width() > avail:
                scale = avail / surf.get_width()
                surf = pygame.transform.smoothscale(
                    surf, (int(surf.get_width() * scale),
                           int(surf.get_height() * scale)))
            surf.set_alpha(int(255 * a))
            cx = (VIEW_X0 + VIEW_X1) / 2
            bh = surf.get_height() + 24
            bg = pygame.Surface((VIEW_X1 - VIEW_X0, bh), pygame.SRCALPHA)
            bg.fill((0, 0, 0, 140))
            s.blit(bg, (VIEW_X0, WIN_H / 2 - bh / 2))
            s.blit(surf, (cx - surf.get_width() / 2,
                          WIN_H / 2 - surf.get_height() / 2))

    def _draw_analytics(self, s):
        x0 = RIGHT_X0
        pygame.draw.rect(s, W.PANEL, (x0, 0, WIN_W - x0, WIN_H))
        pygame.draw.line(s, W.PANEL_EDGE, (x0, 0), (x0, WIN_H), 2)
        s.blit(self.font_hud.render("ANALYTICS", True, W.CYAN), (x0 + 20, 24))

        # range comparison card: true / raw / smoothed(->AEB) / braking dist
        self._metric(s, x0 + 20, 54, "TRUE RANGE", f"{self.range_m:5.1f} m", W.TEXT)
        raw_txt = f"{self.raw_est:5.1f} m" if self.raw_est is not None else "-- LOST"
        self._metric(s, x0 + 20, 100, "RAW ESTIMATE (jittery)", raw_txt,
                     W.TEXT_DIM if self.detected else W.RED)
        sm_txt = (f"{self.smoothed_est:5.1f} m"
                  if self.smoothed_est is not None else "-- LOST")
        self._metric(s, x0 + 20, 146, f"SMOOTHED  → AEB  (MA{MA_WINDOW})", sm_txt,
                     W.GREEN if self.detected else W.RED)
        self._metric(s, x0 + 20, 192, "STOP DIST  phys / safe-req",
                     f"{self.d_brake:4.1f} / {self.d_required:4.1f} m", W.AMBER)

        gw = WIN_W - x0 - 40
        mf_bottom = 400 + 150            # matched-filter graph bottom edge
        if self.last is not None:
            self._plot(s, pygame.Rect(x0 + 20, 242, gw, 148),
                       self.last["t"], self.last["received"], W.RED,
                       "Raw Signal  r(t)", center=True)
            det = self.last["detection"]
            thr = det["noise_floor"] * config.DETECTION_THRESHOLD_FACTOR
            self._plot(s, pygame.Rect(x0 + 20, 400, gw, 150),
                       self.last["t"], self.last["mf"], W.GREEN,
                       "Matched Filter  y(t)", center=False,
                       peak_idx=det["peak_idx"] if det["detected"] else None,
                       threshold=thr)
        # equations box sits cleanly BELOW the matched-filter graph box.
        # When hidden, nothing is drawn here — the graph area stays clean and
        # the helper text lives in the bottom-left status bar (see _draw_panel).
        if self.show_eq:
            self._draw_equations(s, pygame.Rect(x0 + 20, mf_bottom + 12, gw, 128))

    def _draw_equations(self, s, rect):
        pygame.draw.rect(s, (10, 13, 19), rect, border_radius=6)
        pygame.draw.rect(s, W.PANEL_EDGE, rect, 1, border_radius=6)
        s.blit(self.font_sm.render("MODEL EQUATIONS", True, W.TEXT_DIM),
               (rect.x + 8, rect.y + 6))
        lines = [
            "tau = 2R / c",
            "P_rec = P_tx * D^2/(4R^2) * e^(-2*alpha*R) * rho",
            "y(t) = r(t) * s(t)      (matched filter)",
            "R_hat = c * tau_hat / 2",
            "d_brake = V*t_r + V^2/(2*g*mu)",
        ]
        for i, ln in enumerate(lines):
            s.blit(self.font_sm.render(ln, True, W.CYAN),
                   (rect.x + 8, rect.y + 26 + i * 18))

    def _metric(self, s, x, y, label, value, color):
        s.blit(self.font_sm.render(label, True, W.TEXT_DIM), (x, y))
        s.blit(self.font_hud.render(value, True, color), (x, y + 16))

    def _plot(self, s, rect, t, y, color, title, center=False,
              peak_idx=None, threshold=None):
        pygame.draw.rect(s, (10, 13, 19), rect, border_radius=6)
        pygame.draw.rect(s, W.PANEL_EDGE, rect, 1, border_radius=6)
        s.blit(self.font_sm.render(title, True, W.TEXT_DIM),
               (rect.x + 6, rect.y + 4))
        n = 260
        idx = np.linspace(0, len(y) - 1, n).astype(int)
        yv = y[idx]
        pad = 20
        plot = pygame.Rect(rect.x + 6, rect.y + pad, rect.w - 12, rect.h - pad - 6)
        ymax = max(1e-9, float(np.max(np.abs(yv))))
        pts = []
        for i, v in enumerate(yv):
            px = plot.x + plot.w * i / (n - 1)
            if center:
                py = plot.centery - (v / ymax) * (plot.h / 2 - 2)
            else:
                py = plot.bottom - (v / ymax) * (plot.h - 2)
            pts.append((px, py))
        if threshold is not None and not center:
            ty = plot.bottom - (threshold / ymax) * (plot.h - 2)
            ty = max(plot.y, min(plot.bottom, ty))
            pygame.draw.line(s, W.AMBER, (plot.x, ty), (plot.right, ty), 1)
        if len(pts) > 1:
            pygame.draw.lines(s, color, False, pts, 2)
        if peak_idx is not None:
            pk = int(peak_idx / (len(y) - 1) * (n - 1))
            pygame.draw.circle(s, (255, 255, 255), (int(pts[pk][0]),
                               int(pts[pk][1])), 4, 1)

    # --------------------------------------------------------------- loop
    def run(self):
        while self.running:
            dt = self.clock.tick(60) / 1000.0
            dt = min(dt, 0.05)          # clamp to stay stable on hiccups
            self.handle_events()
            self.update(dt)
            self.render()
        pygame.quit()


def main():
    SimulationApp().run()


if __name__ == "__main__":
    main()

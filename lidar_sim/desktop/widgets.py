"""Lightweight embedded Pygame UI widgets (dark theme) — sliders and buttons."""

import pygame

# --- Dark neon palette ---
BG          = (7, 9, 14)
PANEL       = (16, 20, 28)
PANEL_EDGE  = (34, 40, 52)
TEXT        = (200, 208, 220)
TEXT_DIM    = (120, 130, 145)
CYAN        = (0, 240, 255)
GREEN       = (57, 255, 20)
RED         = (255, 45, 85)
AMBER       = (255, 180, 0)
TRACK       = (40, 46, 58)


class Slider:
    """A horizontal draggable slider with a label and live value readout."""

    def __init__(self, x, y, w, label, vmin, vmax, value, fmt="{:.2f}"):
        self.rect = pygame.Rect(x, y, w, 6)
        self.label = label
        self.vmin, self.vmax = vmin, vmax
        self.value = value
        self.fmt = fmt
        self.knob_r = 9
        self.dragging = False

    def _val_to_x(self):
        f = (self.value - self.vmin) / (self.vmax - self.vmin)
        return int(self.rect.x + f * self.rect.w)

    def _x_to_val(self, x):
        f = (x - self.rect.x) / self.rect.w
        f = max(0.0, min(1.0, f))
        return self.vmin + f * (self.vmax - self.vmin)

    def handle_event(self, ev):
        if ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1:
            kx, ky = self._val_to_x(), self.rect.centery
            hit = pygame.Rect(kx - 14, ky - 14, 28, 28)
            if hit.collidepoint(ev.pos) or self.rect.inflate(0, 22).collidepoint(ev.pos):
                self.dragging = True
                self.value = self._x_to_val(ev.pos[0])
        elif ev.type == pygame.MOUSEBUTTONUP and ev.button == 1:
            self.dragging = False
        elif ev.type == pygame.MOUSEMOTION and self.dragging:
            self.value = self._x_to_val(ev.pos[0])

    def draw(self, surf, font):
        lbl = font.render(self.label, True, TEXT_DIM)
        surf.blit(lbl, (self.rect.x, self.rect.y - 22))
        val = font.render(self.fmt.format(self.value), True, CYAN)
        surf.blit(val, (self.rect.right - val.get_width(), self.rect.y - 22))
        # track
        pygame.draw.rect(surf, TRACK, self.rect, border_radius=3)
        kx = self._val_to_x()
        fill = pygame.Rect(self.rect.x, self.rect.y, kx - self.rect.x, self.rect.h)
        pygame.draw.rect(surf, CYAN, fill, border_radius=3)
        # knob
        pygame.draw.circle(surf, (10, 14, 20), (kx, self.rect.centery), self.knob_r)
        pygame.draw.circle(surf, CYAN, (kx, self.rect.centery), self.knob_r, 2)


class Button:
    """A simple toggle/segmented button used for protocol selection."""

    def __init__(self, x, y, w, h, text):
        self.rect = pygame.Rect(x, y, w, h)
        self.text = text
        self.active = False

    def handle_event(self, ev):
        if ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1:
            if self.rect.collidepoint(ev.pos):
                return True
        return False

    def draw(self, surf, font):
        col = CYAN if self.active else PANEL_EDGE
        bg = (0, 40, 46) if self.active else PANEL
        pygame.draw.rect(surf, bg, self.rect, border_radius=8)
        pygame.draw.rect(surf, col, self.rect, 2, border_radius=8)
        txt = font.render(self.text, True, CYAN if self.active else TEXT_DIM)
        surf.blit(txt, (self.rect.centerx - txt.get_width() // 2,
                        self.rect.centery - txt.get_height() // 2))

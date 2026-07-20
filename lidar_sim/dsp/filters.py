"""Simple real-time smoothing filters for range measurements."""

from collections import deque


class MovingAverage:
    """Sliding-window moving-average filter over the last N samples.

    Feeds smoothed range to the AEB logic so a single noisy matched-filter
    estimate cannot trigger a false emergency brake.
    """

    def __init__(self, window: int = 8):
        self.window = window
        self.buf = deque(maxlen=window)

    def update(self, value):
        """Push a new measurement (ignored if None) and return the average."""
        if value is not None:
            self.buf.append(float(value))
        return self.value()

    def value(self):
        if not self.buf:
            return None
        return sum(self.buf) / len(self.buf)

    def reset(self):
        self.buf.clear()

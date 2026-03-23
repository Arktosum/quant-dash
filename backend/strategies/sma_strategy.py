from .base_strategy import BaseStrategy
from typing import Dict, Any


class SMACrossoverStrategy(BaseStrategy):
    def __init__(self, short_window: int = 9, long_window: int = 21):
        # Name it dynamically so it looks cool on the React scoreboard
        super().__init__(name=f"SMA_{short_window}x{long_window}_Crossover")

        self.short_window = short_window
        self.long_window = long_window
        self.prices = []
        self.position = 0  # 0 = No shares, 1 = Holding shares

    def predict(self, market_data: Dict[str, Any]) -> str:
        # 1. Add the newest closing price to our memory
        self.prices.append(market_data["close"])

        # 2. If we don't have enough data to calculate the long SMA yet, do nothing
        if len(self.prices) < self.long_window + 1:
            return "HOLD"

        # 3. Clean up memory: We only need enough history to calculate the SMAs
        if len(self.prices) > self.long_window + 2:
            self.prices.pop(0)

        # 4. Calculate the Current SMAs
        short_sma_current = sum(
            self.prices[-self.short_window:]) / self.short_window
        long_sma_current = sum(
            self.prices[-self.long_window:]) / self.long_window

        # 5. Calculate the Previous SMAs (from 1 minute ago) to detect the exact moment of a crossover
        short_sma_prev = sum(
            self.prices[-(self.short_window+1):-1]) / self.short_window
        long_sma_prev = sum(
            self.prices[-(self.long_window+1):-1]) / self.long_window

        # 6. The Execution Logic
        # Golden Cross: Fast crosses ABOVE Slow
        if short_sma_current > long_sma_current and short_sma_prev <= long_sma_prev:
            if self.position == 0:
                self.position = 1
                return "BUY"

        # Death Cross: Fast crosses BELOW Slow
        elif short_sma_current < long_sma_current and short_sma_prev >= long_sma_prev:
            if self.position == 1:
                self.position = 0
                return "SELL"

        return "HOLD"

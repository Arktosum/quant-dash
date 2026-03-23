import random
from .base_strategy import BaseStrategy
from typing import Dict, Any


class CoinFlipStrategy(BaseStrategy):
    def __init__(self):
        super().__init__(name="CoinFlip_v1")

    def predict(self, market_data: Dict[str, Any]) -> str:
        # In the future, your PyTorch/XGBoost inference goes here.
        # For now, we simulate the AI thinking...
        actions = ["BUY", "SELL", "HOLD"]

        # Heavily weight toward holding so it doesn't spam trades
        weights = [0.1, 0.1, 0.8]

        decision = random.choices(actions, weights=weights, k=1)[0]
        return decision

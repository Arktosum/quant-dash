from abc import ABC, abstractmethod
from typing import Dict, Any


class BaseStrategy(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def predict(self, market_data: Dict[str, Any]) -> str:
        """
        Takes in the latest OHLC data and returns an action.
        Must return 'BUY', 'SELL', or 'HOLD'.
        """
        pass

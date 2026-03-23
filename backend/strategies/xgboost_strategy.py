import xgboost as xgb
import pandas as pd
import numpy as np
from .base_strategy import BaseStrategy
from services.feature_engine import prepare_features
from typing import Dict, Any


class XGBoostStrategy(BaseStrategy):
    def __init__(self):
        super().__init__(name="XGBoost_Directional_v1")
        self.model = None
        self.train_size = 0  # set during training, used by caller to avoid leakage
        self.features = ['rsi', 'sma_9', 'sma_21', 'volatility',
                         'lag_close_1', 'lag_close_2', 'lag_close_3']
        self.history = []
        self.position = 0

    def train_on_history(self, all_bars: list):
        df = prepare_features(all_bars)
        self.train_size = int(len(df) * 0.8)
        train_df = df.iloc[:self.train_size]

        self.model = xgb.XGBClassifier(
            n_estimators=100, max_depth=3, learning_rate=0.1)
        self.model.fit(train_df[self.features], train_df['target'])
        print(f"🌲 {self.name} trained on {self.train_size} bars, "
              f"testing on {len(df) - self.train_size} bars.")

    def predict(self, market_data: Dict[str, Any]) -> str:
        self.history.append(market_data)

        if len(self.history) < 25:
            return "HOLD"

        if len(self.history) > 30:
            self.history.pop(0)

        df_now = prepare_features(self.history)

        if df_now.empty:
            return "HOLD"

        current_features = df_now[self.features].tail(1)
        prediction = self.model.predict(current_features)[0]

        if prediction == 1 and self.position == 0:
            self.position = 1
            return "BUY"
        elif prediction == 0 and self.position == 1:
            self.position = 0
            return "SELL"

        return "HOLD"

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
        self.features = ['rsi', 'sma_9', 'sma_21', 'volatility',
                         'lag_close_1', 'lag_close_2', 'lag_close_3']
        self.history = []  # This is the model's "Short-Term Memory"
        self.position = 0  # 0 = Cash, 1 = Holding Shares

    def train_on_history(self, all_bars: list):
        # We use our engine to create the training set
        df = prepare_features(all_bars)
        train_size = int(len(df) * 0.8)
        train_df = df.iloc[:train_size]

        self.model = xgb.XGBClassifier(
            n_estimators=100, max_depth=3, learning_rate=0.1)
        self.model.fit(train_df[self.features], train_df['target'])
        print(f"🌲 {self.name} trained and ready for inference.")

    def predict(self, market_data: Dict[str, Any]) -> str:
        # 1. Add current candle to memory
        self.history.append(market_data)

        # 2. We need at least 22 candles to calculate the features (RSI/SMA)
        if len(self.history) < 25:
            return "HOLD"

        # 3. Only keep what we need to save memory
        if len(self.history) > 30:
            self.history.pop(0)

        # 4. Convert memory to a tiny DataFrame to calculate features for THIS moment
        # We reuse the prepare_features logic but only look at the last row
        df_now = prepare_features(self.history)

        if df_now.empty:
            return "HOLD"

        # 5. Get the prediction (0 = Down, 1 = Up)
        # We take the very last row of our tiny feature dataframe
        current_features = df_now[self.features].tail(1)
        prediction = self.model.predict(current_features)[0]

        # 6. Translate "Direction" into "Action"
        # If model predicts UP and we are in CASH -> BUY
        if prediction == 1 and self.position == 0:
            self.position = 1
            return "BUY"
        # If model predicts DOWN and we are HOLDING -> SELL
        elif prediction == 0 and self.position == 1:
            self.position = 0
            return "SELL"

        return "HOLD"

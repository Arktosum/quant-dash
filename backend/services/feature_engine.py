import pandas as pd
import numpy as np


def prepare_features(bars: list):
    # 1. Convert to DataFrame
    df = pd.DataFrame(bars)

    # 2. RENAME shorthand to descriptive names
    column_map = {'c': 'close', 'o': 'open', 'h': 'high',
                  'l': 'low', 't': 'time', 'v': 'volume'}
    df = df.rename(
        columns={k: v for k, v in column_map.items() if k in df.columns})

    if 'time' in df.columns:
        df['time'] = pd.to_datetime(df['time'])
        
    # 3. Momentum & Trend Indicators
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['rsi'] = 100 - (100 / (1 + rs))

    df['sma_9'] = df['close'].rolling(window=9).mean()
    df['sma_21'] = df['close'].rolling(window=21).mean()

    # 4. Volatility (The one that was missing!)
    df['volatility'] = df['close'].pct_change().rolling(window=10).std()

    # 5. Lag Features (The memory that was missing!)
    for lag in range(1, 4):
        df[f'lag_close_{lag}'] = df['close'].shift(lag)

    # 6. The Target (Price movement in the NEXT minute)
    df['target'] = (df['close'].shift(-1) > df['close']).astype(int)

    # 7. Final Cleanup
    # We drop the first 21 rows (SMA warm-up) and the very last row (no target for it)
    return df.dropna()

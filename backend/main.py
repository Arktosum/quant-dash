import os
import numpy as np
import pandas as pd
import requests
from datetime import datetime, timedelta
from services.feature_engine import prepare_features
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import our strategies
from strategies.dummy_model import CoinFlipStrategy
from strategies.sma_strategy import SMACrossoverStrategy
from strategies.xgboost_strategy import XGBoostStrategy


def to_unix(t):
    """Helper to force anything into a Unix integer timestamp"""
    if isinstance(t, pd.Timestamp):
        return int(t.timestamp())
    if isinstance(t, str):
        # Handles Alpaca's ISO format '2026-03-13T13:50:00Z'
        dt = datetime.fromisoformat(t.replace("Z", "+00:00"))
        return int(dt.timestamp())
    return int(t)


load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/backtest/{symbol}")
def run_backtest(symbol: str):
    api_key = os.getenv("VITE_ALPACA_API_KEY")
    api_secret = os.getenv("VITE_ALPACA_API_SECRET")

    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=10)

    url = f"https://data.alpaca.markets/v2/stocks/bars?symbols={symbol}&timeframe=1Min&start={start_time.isoformat()}Z&end={end_time.isoformat()}Z&limit=10000&feed=iex"

    headers = {"APCA-API-KEY-ID": api_key, "APCA-API-SECRET-KEY": api_secret}
    response = requests.get(url, headers=headers)
    raw_bars = response.json().get("bars", {}).get(symbol, [])
    if not raw_bars:
        return {"bars": [], "markers": [], "stats": []}

    # 1. Feature Engineering (The Foundation)
    df = prepare_features(raw_bars)

    # 2. Vectorized Signals for EVERY Model
    # XGBoost Signal
    ml_model = XGBoostStrategy()
    ml_model.train_on_history(raw_bars)
    df['sig_XGB'] = ml_model.model.predict(df[ml_model.features])

    # SMA 9/21 Signal (Calculated instantly with Pandas)
    df['sig_SMA_Fast'] = (df['sma_9'] > df['sma_21']).astype(int)

    # SMA 20/50 Signal
    df['sma_20'] = df['close'].rolling(window=20).mean()
    df['sma_50'] = df['close'].rolling(window=50).mean()
    df['sig_SMA_Slow'] = (df['sma_20'] > df['sma_50']).astype(int)

    # Coin Flip Signal (Randomly 0 or 1 for every row)
    df['sig_Random'] = np.random.randint(0, 2, size=len(df))

    # 3. The Arena Simulator
    models_to_test = [
        {"id": "sig_XGB", "name": "XGBoost_v1"},
        {"id": "sig_SMA_Fast", "name": "SMA_9x21"},
        {"id": "sig_SMA_Slow", "name": "SMA_20x50"},
        {"id": "sig_Random", "name": "Lucky_Monkey"}
    ]

    leaderboard = []
    all_markers = {}

    for m in models_to_test:
        cash, shares, trades, markers = 10000.0, 0, 0, []

        for _, row in df.iterrows():
            price = row['close']
            # This handles both Pandas Timestamps and raw strings
            raw_time = row['time']
            time = int(raw_time.timestamp()) if hasattr(raw_time, 'timestamp') else int(pd.to_datetime(raw_time).timestamp())
            prediction = row[m['id']]

            if prediction == 1 and cash > 0:
                shares, cash, trades = cash / price, 0, trades + 1
                markers.append({"time": time, "position": "belowBar",
                               "color": "#26a69a", "shape": "arrowUp", "text": "BUY"})
            elif prediction == 0 and shares > 0:
                cash, shares, trades = shares * price, 0, trades + 1
                markers.append({"time": time, "position": "aboveBar",
                               "color": "#ef5350", "shape": "arrowDown", "text": "SELL"})

        final_val = cash + (shares * df.iloc[-1]['close'])
        leaderboard.append({
            "modelName": m['name'],
            "finalBalance": round(final_val, 2),
            "pnlPercentage": round(((final_val - 10000) / 10000) * 100, 2),
            "totalTrades": trades,
            "markers": markers  # Store for later
        })

    # Sort and pick the winner's markers for the chart
    leaderboard.sort(key=lambda x: x["pnlPercentage"], reverse=True)
    # Remove markers from stats list to save bandwidth
    winning_markers = leaderboard[0].pop("markers")

    formatted_bars = [
        {"time": int(row['time'].timestamp()), "open": row['open'],
         "high": row['high'], "low": row['low'], "close": row['close']}
        for _, row in df.iterrows()
    ]

    return {"bars": formatted_bars, "markers": winning_markers, "stats": leaderboard}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

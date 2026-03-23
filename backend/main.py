import os
import numpy as np
import pandas as pd
import requests
from datetime import datetime, timedelta
from services.feature_engine import prepare_features
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from strategies.dummy_model import CoinFlipStrategy
from strategies.sma_strategy import SMACrossoverStrategy
from strategies.xgboost_strategy import XGBoostStrategy


load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def compute_metrics(portfolio_values: list) -> dict:
    """
    Given a list of portfolio values (one per bar) return:
      - Sharpe ratio  (annualised, assuming 1-min bars, 390 mins/day, 252 days/year)
      - Max drawdown  (percentage, always <= 0)
    """
    series = pd.Series(portfolio_values, dtype=float)
    returns = series.pct_change().dropna()

    if returns.std() == 0:
        sharpe = 0.0
    else:
        annualisation = np.sqrt(252 * 390)   # 1-min bars
        sharpe = round(
            float((returns.mean() / returns.std()) * annualisation), 3)

    peak = series.cummax()
    drawdown = (series - peak) / peak
    max_dd = round(float(drawdown.min() * 100), 2)   # negative percentage

    return {"sharpe": sharpe, "maxDrawdown": max_dd}


@app.get("/api/backtest/{symbol}")
def run_backtest(symbol: str):
    api_key = os.getenv("VITE_ALPACA_API_KEY")
    api_secret = os.getenv("VITE_ALPACA_API_SECRET")

    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=10)

    url = (
        f"https://data.alpaca.markets/v2/stocks/bars"
        f"?symbols={symbol}&timeframe=1Min"
        f"&start={start_time.isoformat()}Z&end={end_time.isoformat()}Z"
        f"&limit=10000&feed=iex"
    )
    headers = {"APCA-API-KEY-ID": api_key, "APCA-API-SECRET-KEY": api_secret}
    response = requests.get(url, headers=headers)
    raw_bars = response.json().get("bars", {}).get(symbol, [])

    if not raw_bars:
        return {"bars": [], "allMarkers": {}, "stats": []}

    # ── Feature engineering ─────────────────────────────────────────────────
    df = prepare_features(raw_bars)

    # ── XGBoost: train on first 80%, predict ONLY on the remaining 20% ─────
    # FIX: previously predicted on the full df, leaking training data into
    # the backtest and inflating XGBoost's apparent performance.
    ml_model = XGBoostStrategy()
    ml_model.train_on_history(raw_bars)

    train_size = ml_model.train_size
    df['sig_XGB'] = 0   # flat / no signal during the training window

    if train_size < len(df):
        oos_preds = ml_model.model.predict(
            df.iloc[train_size:][ml_model.features])
        df.iloc[train_size:, df.columns.get_loc('sig_XGB')] = oos_preds

    # ── SMA 9/21: true golden/death-cross detection ─────────────────────────
    above_fast = df['sma_9'] > df['sma_21']
    df['sig_SMA_Fast'] = np.nan
    df.loc[above_fast & ~above_fast.shift(1).fillna(False), 'sig_SMA_Fast'] = 1
    df.loc[~above_fast & above_fast.shift(1).fillna(False), 'sig_SMA_Fast'] = 0
    df['sig_SMA_Fast'] = df['sig_SMA_Fast'].ffill().fillna(0).astype(int)

    # ── SMA 20/50: true golden/death-cross detection ─────────────────────────
    # FIX: previously used a raw boolean (1 on every bar where sma_20 > sma_50),
    # which is semantically different from crossover detection and made this
    # strategy incomparable to SMA_9x21. Both now use identical logic.
    df['sma_20'] = df['close'].rolling(window=20).mean()
    df['sma_50'] = df['close'].rolling(window=50).mean()
    above_slow = df['sma_20'] > df['sma_50']
    df['sig_SMA_Slow'] = np.nan
    df.loc[above_slow & ~above_slow.shift(1).fillna(False), 'sig_SMA_Slow'] = 1
    df.loc[~above_slow & above_slow.shift(1).fillna(False), 'sig_SMA_Slow'] = 0
    df['sig_SMA_Slow'] = df['sig_SMA_Slow'].ffill().fillna(0).astype(int)

    # ── Random baseline ──────────────────────────────────────────────────────
    df['sig_Random'] = np.random.randint(0, 2, size=len(df))

    # ── Arena simulator ──────────────────────────────────────────────────────
    models_to_test = [
        {"id": "sig_XGB",      "name": "XGBoost_v1"},
        {"id": "sig_SMA_Fast", "name": "SMA_9x21"},
        {"id": "sig_SMA_Slow", "name": "SMA_20x50"},
        {"id": "sig_Random",   "name": "Lucky_Monkey"},
    ]

    leaderboard = []

    for m in models_to_test:
        cash, shares, trades = 10000.0, 0, 0
        markers: list = []
        portfolio_values: list = []

        for _, row in df.iterrows():
            price = row['close']
            time = (
                int(row['time'].timestamp())
                if hasattr(row['time'], 'timestamp')
                else int(pd.to_datetime(row['time']).timestamp())
            )

            # Snapshot portfolio value before acting on this bar
            portfolio_values.append(cash + shares * price)

            prediction = row[m['id']]

            if prediction == 1 and cash > 0:
                shares, cash, trades = cash / price, 0, trades + 1
                markers.append({
                    "time": time, "position": "belowBar",
                    "color": "#26a69a", "shape": "arrowUp", "text": "BUY",
                })
            elif prediction == 0 and shares > 0:
                cash, shares, trades = shares * price, 0, trades + 1
                markers.append({
                    "time": time, "position": "aboveBar",
                    "color": "#ef5350", "shape": "arrowDown", "text": "SELL",
                })

        final_val = cash + (shares * df.iloc[-1]['close'])
        metrics = compute_metrics(portfolio_values)

        leaderboard.append({
            "modelName":     m['name'],
            "finalBalance":  round(final_val, 2),
            "pnlPercentage": round(((final_val - 10000) / 10000) * 100, 2),
            "totalTrades":   trades,
            "sharpe":        metrics["sharpe"],
            "maxDrawdown":   metrics["maxDrawdown"],
            "markers":       markers,
        })

    # Sort by Sharpe — better risk-adjusted measure than raw PnL for research
    leaderboard.sort(key=lambda x: x["sharpe"], reverse=True)

    all_markers: dict = {}
    for entry in leaderboard:
        all_markers[entry["modelName"]] = entry.pop("markers")

    formatted_bars = [
        {
            "time":  int(row['time'].timestamp()),
            "open":  row['open'],
            "high":  row['high'],
            "low":   row['low'],
            "close": row['close'],
        }
        for _, row in df.iterrows()
    ]

    return {"bars": formatted_bars, "allMarkers": all_markers, "stats": leaderboard}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

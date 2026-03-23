# QuantDash: Real-Time Algorithmic Trading Terminal

## Project Goals
This repository serves as the frontend command center for a modular, real-time algorithmic trading system. It is designed to visualize live market data, track multi-model machine learning inferences, and monitor paper-trading execution.

### Phase 1: The Presentation Layer (Current)
- [x] Initialize high-performance Canvas-based charting (TradingView Lightweight Charts).
- [x] Implement a strict dark-themed UI for optimal high-contrast data visualization.
- [x] Build isolated components for chart rendering, independent of data-fetching logic.
- [x] Strategy Arena: backtest 4 models head-to-head on 10 days of 1-min OHLC data.
- [x] Toggleable per-strategy buy/sell markers on the candlestick chart.

### Phase 2: The Ingestion Layer
- [ ] Integrate Alpaca Market Data API via WebSockets for real-time OHLC streaming.
- [ ] Build a decoupled state management system to pipe live ticks to the UI without blocking the main thread.

### Phase 3: The Inference & Execution Layer
- [ ] Connect to external Python ML backend via REST/WebSockets.
- [ ] Visualize model predictions (Buy/Sell/Hold signals) directly on the candlestick charts.
- [ ] Track live Paper Trading PnL metrics across multiple deployed strategies.

---

## Strategies

All four strategies are evaluated in a vectorized arena simulator. Each starts with **$10,000** in cash, no fractional position limits, and no transaction costs. A prediction of `1` = expect price to go **up**, `0` = expect price to go **down**.

---

### 1. `XGBoost_v1` — Machine Learning Directional Classifier

**What it does:**
Trains an XGBoost gradient-boosted classifier on the first 80% of the fetched price history, then generates predictions on the full dataset for the backtest.

**Inputs (features):**
| Feature | Description |
|---|---|
| `rsi` | 14-period Relative Strength Index — momentum oscillator (0–100) |
| `sma_9` | 9-period Simple Moving Average of close price |
| `sma_21` | 21-period Simple Moving Average of close price |
| `volatility` | Rolling 10-period standard deviation of 1-minute returns |
| `lag_close_1` | Close price from 1 minute ago |
| `lag_close_2` | Close price from 2 minutes ago |
| `lag_close_3` | Close price from 3 minutes ago |

**Target (what it was trained to predict):**
Binary label — `1` if the *next* minute's close is higher than the current close, `0` otherwise.

**Output:**
`1` (predict up) → **BUY** if in cash.  
`0` (predict down) → **SELL** if holding shares.

**Hyperparameters:** `n_estimators=100`, `max_depth=3`, `learning_rate=0.1`.

---

### 2. `SMA_9x21` — Fast SMA Crossover

**What it does:**
Detects crossover events between a fast (9-period) and slow (21-period) Simple Moving Average of the close price. Only trades on the *exact candle* the crossover happens — not while the fast SMA is merely above or below.

**Inputs:**
| Feature | Description |
|---|---|
| `sma_9` | Mean of the last 9 closing prices |
| `sma_21` | Mean of the last 21 closing prices |

Both the *current* and *previous* values of each SMA are used to identify the moment of crossover.

**Output:**
- **Golden Cross** — `sma_9` crosses *above* `sma_21`: **BUY** (if flat).  
- **Death Cross** — `sma_9` crosses *below* `sma_21`: **SELL** (if holding).  
- No signal if already in the correct position or no crossover occurred.

---

### 3. `SMA_20x50` — Slow SMA Crossover

**What it does:**
Identical logic to `SMA_9x21` but uses slower, longer-period averages. Produces far fewer signals and captures larger, more sustained trends rather than short-term momentum.

**Inputs:**
| Feature | Description |
|---|---|
| `sma_20` | Mean of the last 20 closing prices |
| `sma_50` | Mean of the last 50 closing prices |

**Output:**
- **Golden Cross** — `sma_20` crosses *above* `sma_50`: signal = `1` → **BUY** (if flat).  
- **Death Cross** — `sma_20` crosses *below* `sma_50`: signal = `0` → **SELL** (if holding).

> Note: Unlike `SMA_9x21`, this variant uses a vectorized Pandas signal column (`sig_SMA_Slow`) rather than crossover detection, so it buys/sells on every bar where the condition holds — not just at the moment of crossover. This is a known behavioural difference between the two SMA strategies.

---

### 4. `Lucky_Monkey` — Random Baseline

**What it does:**
Assigns a uniformly random `0` or `1` to every bar using `numpy.random.randint`. No market data is read whatsoever.

**Inputs:** None.

**Output:**
`1` → **BUY** (if flat). `0` → **SELL** (if holding). Purely random, re-seeded on every backtest run.

**Purpose:** Establishes a random baseline. Any strategy that cannot consistently beat `Lucky_Monkey` over many runs has no statistically meaningful edge.

---

## Feature Engineering (`services/feature_engine.py`)

All features are computed by `prepare_features()` before any strategy sees the data:

| Feature | Calculation |
|---|---|
| `rsi` | 14-period Wilder RSI via rolling gain/loss averages |
| `sma_9` | `close.rolling(9).mean()` |
| `sma_21` | `close.rolling(21).mean()` |
| `volatility` | `close.pct_change().rolling(10).std()` |
| `lag_close_1/2/3` | `close.shift(1/2/3)` |
| `target` | `1` if `close.shift(-1) > close` else `0` |

The first 21 rows are dropped (SMA warm-up period) and the final row is dropped (no future target available), so the usable dataset is `len(raw_bars) - 22` candles.

---

## Architecture
Strict separation of concerns:
- `components/`: Pure, dumb UI elements (Charts, Dashboards).
- `services/`: External API connections (Alpaca WebSockets, ML Backend).
- `hooks/`: State management gluing services to components.
- `types/`: Strict TypeScript interfaces for all financial data structures.
- `backend/strategies/`: One file per strategy, all extend `BaseStrategy`.
- `backend/services/feature_engine.py`: Single source of truth for all feature computation.
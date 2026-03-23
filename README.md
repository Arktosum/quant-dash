# QuantDash: Real-Time Algorithmic Trading Terminal

## Project Goals
This repository serves as the frontend command center for a modular, real-time algorithmic trading system. It is designed to visualize live market data, track multi-model machine learning inferences, and monitor paper-trading execution.

### Phase 1: The Presentation Layer (Current)
- [ ] Initialize high-performance Canvas-based charting (TradingView Lightweight Charts).
- [ ] Implement a strict dark-themed UI for optimal high-contrast data visualization.
- [ ] Build isolated components for chart rendering, independent of data-fetching logic.

### Phase 2: The Ingestion Layer
- [ ] Integrate Alpaca Market Data API via WebSockets for real-time OHLC streaming.
- [ ] Build a decoupled state management system to pipe live ticks to the UI without blocking the main thread.

### Phase 3: The Inference & Execution Layer
- [ ] Connect to external Python ML backend via REST/WebSockets.
- [ ] Visualize model predictions (Buy/Sell/Hold signals) directly on the candlestick charts.
- [ ] Track live Paper Trading PnL metrics across multiple deployed strategies.

## Architecture
Strict separation of concerns:
- `components/`: Pure, dumb UI elements (Charts, Dashboards).
- `services/`: External API connections (Alpaca WebSockets, ML Backend).
- `hooks/`: State management gluing services to components.
- `types/`: Strict TypeScript interfaces for all financial data structures.
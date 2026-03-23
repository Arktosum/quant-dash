import { useState } from "react";
import { CandlestickChart } from "./components/chart/CandlestickChart";
import { useMarketData } from "./hooks/useMarketData";

export default function App() {
  const [ticker, setTicker] = useState("AAPL");
  const [input, setInput] = useState("AAPL");
  const { chartData, markers, stats, isLoading } = useMarketData(ticker);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setTicker(input.toUpperCase());
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0a0a0f",
        color: "#d1d4dc",
        fontFamily: "monospace",
      }}
    >
      <div style={{ padding: "20px", borderBottom: "1px solid #2B2B43" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h2 style={{ margin: 0 }}>STRATEGY ARENA</h2>
          <form
            onSubmit={handleSearch}
            style={{ display: "flex", gap: "10px" }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{
                backgroundColor: "#131722",
                border: "1px solid #2B2B43",
                color: "white",
                padding: "8px",
                borderRadius: "4px",
                outline: "none",
              }}
              placeholder="Ticker (e.g. TSLA)"
            />
            <button
              type="submit"
              style={{
                backgroundColor: "#2962FF",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              RUN BACKTEST
            </button>
          </form>
        </div>

        <div
          style={{
            display: "flex",
            gap: "15px",
            overflowX: "auto",
            paddingBottom: "10px",
          }}
        >
          {stats &&
            stats.map((model: any, index: number) => (
              <div
                key={model.modelName}
                style={{
                  minWidth: "260px",
                  padding: "15px",
                  backgroundColor: index === 0 ? "#1a2332" : "#131722",
                  borderRadius: "6px",
                  border:
                    index === 0 ? "1px solid #2962FF" : "1px solid #2B2B43",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      color: index === 0 ? "#2962FF" : "#d1d4dc",
                    }}
                  >
                    #{index + 1} {model.modelName}
                  </span>
                  <span
                    style={{
                      color: model.pnlPercentage >= 0 ? "#26a69a" : "#ef5350",
                      fontWeight: "bold",
                    }}
                  >
                    {model.pnlPercentage >= 0 ? "+" : ""}
                    {model.pnlPercentage}%
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    color: "#787B86",
                  }}
                >
                  <span>Trades: {model.totalTrades}</span>
                  <span>Bal: ${model.finalBalance.toLocaleString()}</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div style={{ flex: 1, position: "relative", width: "100%" }}>
        {isLoading ? (
          <div style={{ padding: "20px" }}>
            Fetching {ticker} data and running models...
          </div>
        ) : chartData.length > 0 ? (
          <CandlestickChart data={chartData} markers={markers} />
        ) : (
          <div style={{ padding: "20px", color: "#ef5350" }}>
            No data found for {ticker}.
          </div>
        )}
      </div>
    </div>
  );
}

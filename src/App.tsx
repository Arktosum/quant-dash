import { useState, useEffect } from "react";
import { CandlestickChart } from "./components/chart/CandlestickChart";
import { useMarketData, type ModelStat } from "./hooks/useMarketData";

// ── colour palette per rank ──────────────────────────────────────────────────
const RANK_ACCENT = ["#2962FF", "#7B61FF", "#00BCD4", "#546E7A"];

const pnlColour = (pct: number) => (pct >= 0 ? "#26a69a" : "#ef5350");
const sharpeColour = (s: number) =>
  s >= 1 ? "#26a69a" : s >= 0 ? "#f0b429" : "#ef5350";

// ── proportional PnL bar ─────────────────────────────────────────────────────
function PnlBar({ pct, max }: { pct: number; max: number }) {
  const width = max === 0 ? 0 : Math.round((Math.abs(pct) / max) * 100);
  return (
    <div
      style={{
        marginTop: 6,
        height: 3,
        borderRadius: 2,
        backgroundColor: "#2B2B43",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          backgroundColor: pnlColour(pct),
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

// ── metric pill ───────────────────────────────────────────────────────────────
function Pill({
  label,
  value,
  colour,
}: {
  label: string;
  value: string;
  colour: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
      }}
    >
      <span style={{ fontSize: 10, color: "#546E7A", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: "bold", color: colour }}>
        {value}
      </span>
    </div>
  );
}

// ── strategy card ─────────────────────────────────────────────────────────────
interface CardProps {
  model: ModelStat;
  rank: number;
  isActive: boolean;
  maxAbsPnl: number;
  onClick: () => void;
}

function StrategyCard({
  model,
  rank,
  isActive,
  maxAbsPnl,
  onClick,
}: CardProps) {
  const accent = RANK_ACCENT[rank] ?? "#546E7A";
  return (
    <button
      onClick={onClick}
      title={
        isActive ? "Showing on chart — click to hide" : "Click to show on chart"
      }
      style={{
        all: "unset",
        cursor: "pointer",
        display: "block",
        minWidth: 230,
        padding: "12px 15px",
        borderRadius: 8,
        border: `1px solid ${isActive ? accent : "#2B2B43"}`,
        backgroundColor: isActive ? `${accent}18` : "#131722",
        boxShadow: isActive ? `0 0 0 1px ${accent}55` : "none",
        transition: "all 0.2s ease",
        userSelect: "none",
      }}
    >
      {/* Name + PnL */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontWeight: "bold",
            fontSize: 12,
            color: isActive ? accent : "#d1d4dc",
            letterSpacing: "0.03em",
          }}
        >
          #{rank + 1} {model.modelName}
        </span>
        <span
          style={{
            fontWeight: "bold",
            fontSize: 13,
            color: pnlColour(model.pnlPercentage),
          }}
        >
          {model.pnlPercentage >= 0 ? "+" : ""}
          {model.pnlPercentage}%
        </span>
      </div>

      {/* PnL bar */}
      <PnlBar pct={model.pnlPercentage} max={maxAbsPnl} />

      {/* Risk metrics row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
          paddingTop: 8,
          borderTop: "1px solid #2B2B43",
        }}
      >
        <Pill
          label="SHARPE"
          value={model.sharpe.toFixed(2)}
          colour={sharpeColour(model.sharpe)}
        />
        <Pill
          label="MAX DD"
          value={`${model.maxDrawdown.toFixed(1)}%`}
          colour={
            model.maxDrawdown < -10
              ? "#ef5350"
              : model.maxDrawdown < -5
                ? "#f0b429"
                : "#26a69a"
          }
        />
        <Pill
          label="TRADES"
          value={String(model.totalTrades)}
          colour="#d1d4dc"
        />
        <Pill
          label="BALANCE"
          value={`$${model.finalBalance.toLocaleString()}`}
          colour="#d1d4dc"
        />
      </div>

      {/* Active badge */}
      {isActive && (
        <div
          style={{
            marginTop: 7,
            fontSize: 10,
            color: accent,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          ● Showing on chart
        </div>
      )}
    </button>
  );
}

// ── root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [ticker, setTicker] = useState("AAPL");
  const [input, setInput] = useState("AAPL");
  const [active, setActive] = useState<string | null>(null);

  const { chartData, allMarkers, stats, isLoading } = useMarketData(ticker);

  // Default to the top-ranked strategy (by Sharpe) when results arrive
  useEffect(() => {
    if (stats.length > 0) setActive(stats[0].modelName);
  }, [stats]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (sym) setTicker(sym);
  };

  const activeMarkers = active ? (allMarkers[active] ?? []) : [];
  const maxAbsPnl = Math.max(...stats.map((s) => Math.abs(s.pnlPercentage)), 1);

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
      {/* ── header ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #2B2B43" }}>
        {/* Title + search bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={{ margin: 0, letterSpacing: "0.05em" }}>
              STRATEGY ARENA
            </h2>
            {!isLoading && stats.length > 0 && (
              <div style={{ fontSize: 11, color: "#787B86", marginTop: 2 }}>
                {ticker} · ranked by Sharpe ratio · click a card to toggle its
                signals
              </div>
            )}
          </div>

          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{
                backgroundColor: "#131722",
                border: "1px solid #2B2B43",
                color: "white",
                padding: "8px 10px",
                borderRadius: 4,
                outline: "none",
                fontFamily: "monospace",
                width: 140,
              }}
              placeholder="e.g. TSLA"
            />
            <button
              type="submit"
              disabled={isLoading}
              style={{
                backgroundColor: isLoading ? "#1a2332" : "#2962FF",
                color: isLoading ? "#546E7A" : "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: 4,
                cursor: isLoading ? "not-allowed" : "pointer",
                fontFamily: "monospace",
                fontWeight: "bold",
                transition: "background 0.2s",
              }}
            >
              {isLoading ? "RUNNING…" : "RUN BACKTEST"}
            </button>
          </form>
        </div>

        {/* Strategy cards */}
        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    minWidth: 230,
                    height: 100,
                    borderRadius: 8,
                    border: "1px solid #2B2B43",
                    backgroundColor: "#131722",
                    opacity: 0.4,
                  }}
                />
              ))
            : stats.map((model, index) => (
                <StrategyCard
                  key={model.modelName}
                  model={model}
                  rank={index}
                  isActive={active === model.modelName}
                  maxAbsPnl={maxAbsPnl}
                  onClick={() =>
                    setActive((prev) =>
                      prev === model.modelName ? null : model.modelName,
                    )
                  }
                />
              ))}
        </div>
      </div>

      {/* ── chart ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: "relative", width: "100%" }}>
        {isLoading ? (
          <div
            style={{
              padding: 20,
              color: "#787B86",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: "#2962FF",
                animation: "pulse 1s infinite",
              }}
            />
            Fetching {ticker} data and running models…
          </div>
        ) : chartData.length > 0 ? (
          <CandlestickChart data={chartData} markers={activeMarkers} />
        ) : (
          <div style={{ padding: 20, color: "#ef5350" }}>
            No data found for {ticker}. The market may be closed or the ticker
            invalid.
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        button:hover:not(:disabled) { filter: brightness(1.15); }
      `}</style>
    </div>
  );
}

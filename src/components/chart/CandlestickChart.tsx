import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  createSeriesMarkers, // <-- NEW: Import the standalone primitive
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { type OHLCData } from "../../types/market";
import { darkThemeConfig, candlestickSeriesConfig } from "./chartTheme";

interface CandlestickChartProps {
  data: OHLCData[];
  markers?: SeriesMarker<Time>[];
}

export const CandlestickChart = ({
  data,
  markers = [],
}: CandlestickChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // NEW: We need a dedicated ref to track the marker plugin
  const markersRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      ...darkThemeConfig,
    });

    const candlestickSeries = chart.addSeries(
      CandlestickSeries,
      candlestickSeriesConfig,
    );

    // V5 ARCHITECTURE FIX: Initialize the markers plugin and attach it to our series
    const markerPrimitive = createSeriesMarkers(candlestickSeries, []);

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    markersRef.current = markerPrimitive;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      seriesRef.current.setData(data);
    }

    // V5 ARCHITECTURE FIX: Update markers via the primitive, not the series
    if (markersRef.current) {
      markersRef.current.setMarkers(markers);
    }
  }, [data, markers]);

  return (
    <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }} />
  );
};

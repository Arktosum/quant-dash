import { useState, useEffect } from 'react';
import { type OHLCData } from '../types/market';

export const useMarketData = (symbol: string) => {
    const [chartData, setChartData] = useState<OHLCData[]>([]);
    const [markers, setMarkers] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null); // NEW: State for our scoreboard
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const runBacktest = async () => {
            try {
                const response = await fetch(`http://localhost:8000/api/backtest/${symbol}`);
                const data = await response.json();

                setChartData(data.bars);
                setMarkers(data.markers);
                setStats(data.stats); // Store the PnL stats
            } catch (error) {
                console.error("Failed to connect to Python backend:", error);
            } finally {
                setIsLoading(false);
            }
        };

        runBacktest();
    }, [symbol]);

    return { chartData, markers, stats, isLoading };
};
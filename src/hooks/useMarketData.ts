import { useState, useEffect } from 'react';
import { type OHLCData } from '../types/market';

export interface ModelStat {
    modelName: string;
    finalBalance: number;
    pnlPercentage: number;
    totalTrades: number;
    sharpe: number;
    maxDrawdown: number;   // always <= 0, expressed as a percentage
}

export const useMarketData = (symbol: string) => {
    const [chartData, setChartData] = useState<OHLCData[]>([]);
    const [allMarkers, setAllMarkers] = useState<Record<string, any[]>>({});
    const [stats, setStats] = useState<ModelStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Reset immediately so stale data never shows for a new symbol
        setIsLoading(true);
        setChartData([]);
        setAllMarkers({});
        setStats([]);

        const runBacktest = async () => {
            try {
                const response = await fetch(`http://localhost:8000/api/backtest/${symbol}`);
                const data = await response.json();

                setChartData(data.bars ?? []);
                setAllMarkers(data.allMarkers ?? {});
                setStats(data.stats ?? []);
            } catch (error) {
                console.error('Failed to connect to Python backend:', error);
            } finally {
                setIsLoading(false);
            }
        };

        runBacktest();
    }, [symbol]);

    return { chartData, allMarkers, stats, isLoading };
};
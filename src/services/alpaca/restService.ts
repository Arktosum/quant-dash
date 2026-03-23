import { type OHLCData } from '../../types/market';
import { type Time } from 'lightweight-charts';

export const fetchHistoricalBars = async (symbol: string): Promise<OHLCData[]> => {
    const key = import.meta.env.VITE_ALPACA_API_KEY;
    const secret = import.meta.env.VITE_ALPACA_API_SECRET;

    // Fetch the last 3 days of data to guarantee we grab some active market hours
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 3); 

    const url = `https://data.alpaca.markets/v2/stocks/bars?symbols=${symbol}&timeframe=1Min&start=${start.toISOString()}&end=${end.toISOString()}&limit=1000&feed=iex`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'APCA-API-KEY-ID': key,
                'APCA-API-SECRET-KEY': secret,
            }
        });

        const data = await response.json();
        
        // If the market was closed or the symbol is invalid, return empty
        if (!data.bars || !data.bars[symbol]) return [];

        // Map Alpaca's specific JSON structure into our strict OHLCData interface
        return data.bars[symbol].map((bar: any) => ({
            time: Math.floor(new Date(bar.t).getTime() / 1000) as Time,
            open: bar.o,
            high: bar.h,
            low: bar.l,
            close: bar.c
        }));
    } catch (error) {
        console.error("Failed to fetch historical data:", error);
        return [];
    }
};
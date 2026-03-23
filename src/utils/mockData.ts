import { type Time } from 'lightweight-charts';
import { type OHLCData } from '../types/market';

export const generateMockData = (): OHLCData[] => {
    const data: OHLCData[] = [];

    // Start 100 candles ago (5 minutes each). 
    // Intraday time must be a Unix timestamp in seconds.
    let currentTime = Math.floor(Date.now() / 1000) - (100 * 5 * 60);
    let lastClose = 150.00; // Let's pretend we're tracking a stock like Apple

    for (let i = 0; i < 100; i++) {
        const volatility = 1.5; // Max price swing per 5-minute candle

        // Add a slight random gap between previous close and new open
        const open = lastClose + (Math.random() * 0.4 - 0.2);

        // Calculate random highs and lows around the open
        const high = open + (Math.random() * volatility);
        const low = open - (Math.random() * volatility);

        // Close is somewhere between the high and low
        const close = low + (Math.random() * (high - low));

        data.push({
            time: currentTime as Time, // Safely cast to satisfy V5 types
            open,
            high,
            low,
            close,
        });

        // Set up for the next loop iteration
        lastClose = close;
        currentTime += 5 * 60; // Advance time by 300 seconds (5 minutes)
    }

    return data;
};
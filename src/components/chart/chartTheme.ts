import { ColorType } from 'lightweight-charts';

export const darkThemeConfig = {
    layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#d1d4dc',
    },
    grid: {
        vertLines: { color: '#2b2b43' },
        horzLines: { color: '#2b2b43' },
    },
    timeScale: {
        borderColor: '#2b2b43',
        timeVisible: true,
        secondsVisible: false,
    },
    rightPriceScale: {
        borderColor: '#2b2b43',
    },
};

export const candlestickSeriesConfig = {
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
};
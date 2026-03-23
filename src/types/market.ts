import { type Time } from 'lightweight-charts';

export interface OHLCData {
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
}
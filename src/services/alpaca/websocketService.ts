export class AlpacaWebsocketService {
    private ws: WebSocket | null = null;
    private key: string;
    private secret: string;
    private onBarCallback: ((bar) => void) | null = null;

    constructor(key: string, secret: string) {
        this.key = key;
        this.secret = secret;
    }

    connect(symbols: string[], onBar: (bar) => void) {
        this.onBarCallback = onBar;

        // Connect to Alpaca's IEX stream (the free real-time data tier)
        this.ws = new WebSocket('wss://stream.data.alpaca.markets/v2/iex');

        this.ws.onopen = () => {
            // 1. Authenticate immediately upon connection
            const authPayload = {
                action: 'auth',
                key: this.key,
                secret: this.secret
            };
            this.ws?.send(JSON.stringify(authPayload));
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            for (const msg of data) {
                // 2. Once authorized, subscribe to the minute-bars of your chosen symbols
                if (msg.T === 'success' && msg.msg === 'authenticated') {
                    const subPayload = {
                        action: 'subscribe',
                        bars: symbols
                    };
                    this.ws?.send(JSON.stringify(subPayload));
                }

                // 3. Pass live bar data back to the application
                if (msg.T === 'b') {
                    this.onBarCallback?.(msg);
                }
            }
        };

        this.ws.onerror = (err) => console.error("Alpaca WS Error:", err);
    }

    disconnect() {
        if (this.ws) {
            // readyState 1 means OPEN. It is safe to close.
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
            }
            // readyState 0 means CONNECTING. 
            else if (this.ws.readyState === WebSocket.CONNECTING) {
                // If it's still connecting, we intercept the open event 
                // and tell it to close the moment it finishes, preventing the browser error.
                this.ws.onopen = () => this.ws?.close();
            }
            this.ws = null;
        }
    }
}
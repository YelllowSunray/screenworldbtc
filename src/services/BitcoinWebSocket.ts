import { BitcoinTransaction } from '../types/bitcoin';

export class BitcoinWebSocket {
  private ws: WebSocket | null = null;
  private onTransactionCallback: ((tx: BitcoinTransaction) => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    console.log('BitcoinWebSocket: Initializing...');
    this.connect();
  }

  private connect() {
    try {
      console.log('BitcoinWebSocket: Attempting to connect...');
      this.ws = new WebSocket('wss://ws.blockchain.info/inv');

      this.ws.onopen = () => {
        console.log('BitcoinWebSocket: Connected successfully');
        this.reconnectAttempts = 0;
        
        // Subscribe to new transactions
        if (this.ws) {
          console.log('BitcoinWebSocket: Subscribing to transactions...');
          this.ws.send(JSON.stringify({ "op": "unconfirmed_sub" }));
          console.log('BitcoinWebSocket: Subscription request sent');
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('BitcoinWebSocket: Received message:', data.op);
          
          if (data.op === 'utx') {
            const tx = data.x;
            console.log('BitcoinWebSocket: Processing transaction:', tx.hash);
            
            // Calculate total value in satoshis
            const value = tx.out.reduce((sum: number, output: any) => sum + output.value, 0);
            console.log('BitcoinWebSocket: Transaction value:', value / 100000000, 'BTC');

            // Create transaction with random coordinates for now
            const transaction: BitcoinTransaction = {
              hash: tx.hash,
              value: value,
              timestamp: Date.now(),
              location: {
                lat: (Math.random() * 180) - 90,
                lng: (Math.random() * 360) - 180
              }
            };

            console.log('BitcoinWebSocket: Sending transaction to callback');
            this.onTransactionCallback?.(transaction);
          }
        } catch (error) {
          console.error('BitcoinWebSocket: Error processing message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('BitcoinWebSocket: Connection closed');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('BitcoinWebSocket: Connection error:', error);
        this.attemptReconnect();
      };

    } catch (error) {
      console.error('BitcoinWebSocket: Error creating connection:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`BitcoinWebSocket: Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('BitcoinWebSocket: Max reconnection attempts reached');
    }
  }

  public onTransaction(callback: (tx: BitcoinTransaction) => void) {
    console.log('BitcoinWebSocket: Transaction callback registered');
    this.onTransactionCallback = callback;
  }

  public disconnect() {
    if (this.ws) {
      console.log('BitcoinWebSocket: Disconnecting...');
      this.ws.close();
      this.ws = null;
    }
  }
} 
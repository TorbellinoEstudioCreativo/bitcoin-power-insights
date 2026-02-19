import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface WebSocketTickerData {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

interface BinanceMiniTickerMessage {
  e: string;   // Event type
  E: number;   // Event time
  s: string;   // Symbol
  c: string;   // Close price (last price)
  o: string;   // Open price
  h: string;   // High price
  l: string;   // Low price
  v: string;   // Total traded base asset volume
}

// ============================================================================
// HOOK
// ============================================================================

export function useBinanceWebSocket(symbol: string = 'btcusdt') {
  const [data, setData] = useState<WebSocketTickerData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const streamName = `${symbol.toLowerCase()}@miniTicker`;
    const url = `wss://stream.binance.com:9443/ws/${streamName}`;

    logger.log(`[WebSocket] Connecting to ${streamName}...`);

    const ws = new WebSocket(url);

    ws.onopen = () => {
      logger.log('[WebSocket] Connected');
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg: BinanceMiniTickerMessage = JSON.parse(event.data);
        const closePrice = parseFloat(msg.c);
        const openPrice = parseFloat(msg.o);
        const change24h = openPrice > 0 ? ((closePrice - openPrice) / openPrice) * 100 : 0;

        setData({
          price: closePrice,
          change24h,
          high24h: parseFloat(msg.h),
          low24h: parseFloat(msg.l),
          volume24h: parseFloat(msg.v),
        });
      } catch {
        // Ignore parse errors from ping/pong frames
      }
    };

    ws.onclose = () => {
      logger.log('[WebSocket] Disconnected');
      setIsConnected(false);
      wsRef.current = null;

      // Auto-reconnect with backoff
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30_000);
        reconnectAttempts.current++;
        logger.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      logger.warn('[WebSocket] Error occurred');
      ws.close();
    };

    wsRef.current = ws;
  }, [symbol]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { data, isConnected };
}

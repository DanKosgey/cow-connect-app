import { useState, useEffect, useCallback, useRef } from 'react';

interface WebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (data: any) => void;
}

export const useWebSocket = (
  url: string | null,
  options: WebSocketOptions = {}
) => {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onOpen,
    onClose,
    onError,
    onMessage
  } = options;

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnect = useRef(true);

  const connect = useCallback(() => {
    // Clear any existing reconnect timeout
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    // Don't connect if URL is null
    if (!url) {
      console.warn('WebSocket URL is null, skipping connection');
      return;
    }

    // Create new WebSocket connection
    const websocket = new WebSocket(url);
    
    websocket.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttempts.current = 0;
      onOpen?.();
    };

    websocket.onclose = (event) => {
      setIsConnected(false);
      setWs(null);
      
      // Attempt to reconnect if needed
      if (shouldReconnect.current && reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
      
      onClose?.();
    };

    websocket.onerror = (error) => {
      setError(error);
      onError?.(error);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    setWs(websocket);
  }, [url, reconnectInterval, maxReconnectAttempts, onOpen, onClose, onError, onMessage]);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (ws) {
      ws.close();
    }
  }, [ws]);

  const sendMessage = useCallback((message: any) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent.');
    }
  }, [ws, isConnected]);

  useEffect(() => {
    // Initialize connection only if URL is provided
    if (url) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [url, connect, disconnect]);

  return {
    ws,
    isConnected,
    error,
    sendMessage,
    reconnect: connect
  };
};
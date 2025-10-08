import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  autoConnect?: boolean;
}

interface WebSocketData {
  type: string;
  data: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface ConnectionStats {
  connected: boolean;
  reconnectAttempts: number;
  lastConnected: number | null;
  lastDisconnected: number | null;
  totalReconnects: number;
  latency: number;
}

export const useWebSocket = (
  endpoint: string,
  options: UseWebSocketOptions = {}
) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState<WebSocketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    connected: false,
    reconnectAttempts: 0,
    lastConnected: null,
    lastDisconnected: null,
    totalReconnects: 0,
    latency: 0
  });
  
  const reconnectAttemptsRef = useRef(0);
  const totalReconnectsRef = useRef(0);
  const maxReconnectAttempts = options.reconnectAttempts || 10;
  const reconnectInterval = options.reconnectInterval || 3000;
  const autoConnect = options.autoConnect !== false;
  const latencyCheckInterval = useRef<NodeJS.Timeout>();

  const updateConnectionStats = useCallback((updates: Partial<ConnectionStats>) => {
    setConnectionStats(prev => ({ ...prev, ...updates }));
  }, []);

  const measureLatency = useCallback(() => {
    if (socket && isConnected) {
      const startTime = Date.now();
      socket.emit('ping', startTime);
      
      socket.once('pong', (timestamp: number) => {
        const latency = Date.now() - timestamp;
        updateConnectionStats({ latency });
      });
    }
  }, [socket, isConnected, updateConnectionStats]);

  const connect = useCallback(() => {
    if (socket?.connected) return;

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const token = localStorage.getItem('authToken');
    
    const newSocket = io(API_BASE_URL, {
      path: endpoint,
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    newSocket.on('connect', () => {
      const now = Date.now();
      setIsConnected(true);
      setError(null);
      
      updateConnectionStats({
        connected: true,
        lastConnected: now,
        reconnectAttempts: reconnectAttemptsRef.current,
        totalReconnects: totalReconnectsRef.current
      });
      
      reconnectAttemptsRef.current = 0;
      
      // Start latency monitoring
      latencyCheckInterval.current = setInterval(measureLatency, 30000); // Every 30 seconds
      measureLatency(); // Initial measurement
      
      console.log(`WebSocket connected to ${endpoint}`);
    });

    newSocket.on('disconnect', (reason) => {
      const now = Date.now();
      setIsConnected(false);
      
      updateConnectionStats({
        connected: false,
        lastDisconnected: now
      });
      
      // Clear latency monitoring
      if (latencyCheckInterval.current) {
        clearInterval(latencyCheckInterval.current);
      }
      
      console.log(`WebSocket disconnected from ${endpoint}:`, reason);
      
      // Auto-reconnect for unexpected disconnections
      if (reason === 'io server disconnect' || reason === 'transport close') {
        if (options.reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          setTimeout(() => {
            reconnectAttemptsRef.current++;
            totalReconnectsRef.current++;
            connect();
          }, reconnectInterval);
        }
      }
    });

    newSocket.on('error', (err) => {
      setError(err.message);
      console.error(`WebSocket error on ${endpoint}:`, err);
    });

    // Enhanced data handling with different event types
    newSocket.on('data', (receivedData: WebSocketData) => {
      setData(receivedData);
    });

    newSocket.on('ml-performance-update', (receivedData: any) => {
      setData({
        type: 'ml-performance-update',
        data: receivedData,
        timestamp: Date.now()
      });
    });

    newSocket.on('model-alert', (receivedData: any) => {
      setData({
        type: 'model-alert',
        data: receivedData,
        timestamp: Date.now()
      });
    });

    newSocket.on('drift-detected', (receivedData: any) => {
      setData({
        type: 'drift-detected',
        data: receivedData,
        timestamp: Date.now()
      });
    });

    newSocket.on('ab-test-result', (receivedData: any) => {
      setData({
        type: 'ab-test-result',
        data: receivedData,
        timestamp: Date.now()
      });
    });

    newSocket.on('live-metrics', (receivedData: any) => {
      setData({
        type: 'live-metrics',
        data: receivedData,
        timestamp: Date.now()
      });
    });

    newSocket.on('connect_error', (err) => {
      setError(err.message);
      
      if (options.reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        totalReconnectsRef.current++;
        
        updateConnectionStats({
          reconnectAttempts: reconnectAttemptsRef.current,
          totalReconnects: totalReconnectsRef.current
        });
        
        setTimeout(() => {
          console.log(`Attempting to reconnect... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          connect();
        }, reconnectInterval * Math.min(reconnectAttemptsRef.current, 5)); // Exponential backoff
      }
    });

    // Handle pong for latency measurement
    newSocket.on('pong', (timestamp: number) => {
      const latency = Date.now() - timestamp;
      updateConnectionStats({ latency });
    });

    setSocket(newSocket);
  }, [endpoint, options.reconnect, maxReconnectAttempts, reconnectInterval, measureLatency, updateConnectionStats]);

  const disconnect = useCallback(() => {
    if (socket) {
      if (latencyCheckInterval.current) {
        clearInterval(latencyCheckInterval.current);
      }
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      updateConnectionStats({ connected: false });
    }
  }, [socket, updateConnectionStats]);

  const emit = useCallback((event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }, [socket, isConnected]);

  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    if (socket) {
      socket.on(event, callback);
      return () => socket.off(event, callback);
    }
    return () => {};
  }, [socket]);

  const subscribeToModelUpdates = useCallback((
    modelIds: string[],
    callback: (update: any) => void
  ) => {
    if (socket && isConnected) {
      // Subscribe to specific model updates
      socket.emit('subscribe-models', { modelIds });
      return subscribe('model-update', callback);
    }
    return () => {};
  }, [socket, isConnected, subscribe]);

  const subscribeToTimeframeData = useCallback((
    timeframe: string,
    callback: (data: any) => void
  ) => {
    if (socket && isConnected) {
      socket.emit('subscribe-timeframe', { timeframe });
      return subscribe(`timeframe-data-${timeframe}`, callback);
    }
    return () => {};
  }, [socket, isConnected, subscribe]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (latencyCheckInterval.current) {
        clearInterval(latencyCheckInterval.current);
      }
    };
  }, []);

  return {
    socket,
    isConnected,
    data,
    error,
    connectionStats,
    connect,
    disconnect,
    emit,
    subscribe,
    subscribeToModelUpdates,
    subscribeToTimeframeData
  };
};

// Specialized hook for ML Performance updates
export const useMLPerformanceWebSocket = () => {
  const { socket, connected, subscribe, emit } = useWebSocket('/ml-performance');
  
  const subscribeToModelUpdates = (callback: (update: any) => void) => {
    return subscribe('performance-update', callback);
  };

  const subscribeToAlerts = (callback: (alert: any) => void) => {
    return subscribe('new-alert', callback);
  };

  const subscribeToDriftAlerts = (callback: (alert: any) => void) => {
    return subscribe('model-drift-detected', callback);
  };

  const subscribeToABTestUpdates = (callback: (update: any) => void) => {
    return subscribe('ab-test-update', callback);
  };

  const subscribeToRetrainingUpdates = (callback: (update: any) => void) => {
    return subscribe('retraining-triggered', callback);
  };

  const requestModelUpdate = (modelId: string) => {
    emit('request-model-update', { modelId });
  };

  const requestDashboardUpdate = () => {
    emit('request-dashboard-update');
  };

  return {
    connected,
    subscribeToModelUpdates,
    subscribeToAlerts,
    subscribeToDriftAlerts,
    subscribeToABTestUpdates,
    subscribeToRetrainingUpdates,
    requestModelUpdate,
    requestDashboardUpdate
  };
};

// Trading-specific WebSocket hook
export const useTradingWebSocket = () => {
  const { socket, connected, subscribe, emit } = useWebSocket('/trading');
  
  const subscribeToTradeUpdates = (callback: (trade: any) => void) => {
    return subscribe('trade-update', callback);
  };

  const subscribeToPositionUpdates = (callback: (position: any) => void) => {
    return subscribe('position-update', callback);
  };

  const subscribeToOrderUpdates = (callback: (order: any) => void) => {
    return subscribe('order-update', callback);
  };

  const subscribeToRiskAlerts = (callback: (alert: any) => void) => {
    return subscribe('risk-alert', callback);
  };

  const subscribeToMarketData = (symbol: string, callback: (data: any) => void) => {
    emit('subscribe-market-data', { symbol });
    return subscribe(`market-data-${symbol}`, callback);
  };

  return {
    connected,
    subscribeToTradeUpdates,
    subscribeToPositionUpdates,
    subscribeToOrderUpdates,
    subscribeToRiskAlerts,
    subscribeToMarketData
  };
};

export default useWebSocket;
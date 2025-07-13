import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { updateBotStatus, updateBotMetrics } from '../store/slices/botsSlice';
import { addSignal, addTrade, updateTrade, updateRealTimePrice } from '../store/slices/tradingSlice';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: React.ReactNode;
}

const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const dispatch = useDispatch();
  const { token, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = io(process.env.REACT_APP_WS_URL || 'http://localhost:5000', {
        auth: {
          token,
        },
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        console.log('Connected to AAITI WebSocket');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from AAITI WebSocket');
        setIsConnected(false);
      });

      // Bot status updates
      newSocket.on('bot_status_update', (data) => {
        dispatch(updateBotStatus({ botId: data.botId, status: data.status }));
      });

      // Bot metrics updates
      newSocket.on('bot_metrics_update', (data) => {
        dispatch(updateBotMetrics({ botId: data.botId, metrics: data.metrics }));
      });

      // New trading signals
      newSocket.on('new_signal', (data) => {
        dispatch(addSignal({ botId: data.botId, signal: data.signal }));
      });

      // New trades
      newSocket.on('new_trade', (data) => {
        dispatch(addTrade({ botId: data.botId, trade: data.trade }));
      });

      // Trade updates
      newSocket.on('trade_update', (data) => {
        dispatch(updateTrade({ tradeId: data.tradeId, updates: data.updates }));
      });

      // Real-time price updates
      newSocket.on('price_update', (data) => {
        dispatch(updateRealTimePrice({ symbol: data.symbol, price: data.price }));
      });

      // Error handling
      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    }
  }, [isAuthenticated, token, dispatch]);

  // Subscribe to bot updates when bots change
  const { bots } = useSelector((state: RootState) => state.bots);
  
  useEffect(() => {
    if (socket && isConnected) {
      // Subscribe to all user's bots
      bots.forEach(bot => {
        socket.emit('subscribe_to_bot', bot.id);
      });
    }
  }, [socket, isConnected, bots]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
'use client';

import { useEffect, useRef } from 'react';
import { useWebSocketStore } from '@/stores/websocket';
import { useAuthStore } from '@/stores/auth';

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { user, token } = useAuthStore();
  const { connect, disconnect, isConnected, isConnecting } = useWebSocketStore();
  const connectionAttempted = useRef(false);

  useEffect(() => {
    // Only connect if user is authenticated and we haven't attempted connection
    if (user && token && !isConnected && !isConnecting && !connectionAttempted.current) {
      connectionAttempted.current = true;
      
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
      
      connect({
        url: wsUrl,
        token,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      }).catch((error) => {
        console.error('Failed to connect to WebSocket:', error);
        connectionAttempted.current = false; // Allow retry
      });
    }

    // Disconnect when user logs out
    if (!user && isConnected) {
      disconnect();
      connectionAttempted.current = false;
    }
  }, [user, token, isConnected, isConnecting, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [disconnect, isConnected]);

  return <>{children}</>;
}
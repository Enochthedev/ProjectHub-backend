'use client';

import { useEffect, useRef } from 'react';
import { useWebSocketStore } from '@/stores/websocket';
import { useAuthStore } from '@/stores/auth';

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { user, token, refreshTokens } = useAuthStore();
  const { connect, disconnect, isConnected, isConnecting } = useWebSocketStore();
  const connectionAttempted = useRef(false);
  const lastToken = useRef<string | null>(null);

  useEffect(() => {
    // Reset connection attempt if token changed (e.g., after refresh)
    if (token !== lastToken.current) {
      lastToken.current = token;
      connectionAttempted.current = false;
      
      // Disconnect old connection if token changed
      if (isConnected) {
        disconnect();
      }
    }

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
      }).catch(async (error) => {
        console.warn('WebSocket connection failed:', error);
        
        // If it's a JWT error, try to refresh the token
        if (error.message?.includes('invalid') || error.message?.includes('signature') || error.message?.includes('jwt')) {
          console.log('JWT error detected, attempting token refresh...');
          try {
            await refreshTokens();
            console.log('Token refreshed successfully, WebSocket will reconnect');
            connectionAttempted.current = false; // Allow retry with new token
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Token refresh failed, user needs to re-login
            console.log('Please log in again to restore WebSocket connection');
          }
        } else {
          // For other errors, allow retry
          connectionAttempted.current = false;
        }
      });
    }

    // Disconnect when user logs out
    if (!user && isConnected) {
      disconnect();
      connectionAttempted.current = false;
      lastToken.current = null;
    }
  }, [user, token, isConnected, isConnecting, connect, disconnect, refreshTokens]);

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
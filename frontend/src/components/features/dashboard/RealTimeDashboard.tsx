'use client';

import { useEffect, useState } from 'react';
import { useWebSocketStore } from '@/stores/websocket';
import { useWebSocket } from '@/hooks/useWebSocket';

interface RealtimeDashboardProps {
  children: React.ReactNode;
  userId?: string;
  role?: string;
}

interface DashboardUpdate {
  type: 'project' | 'milestone' | 'bookmark' | 'notification' | 'user_activity';
  data: any;
  timestamp: string;
}

export function RealtimeDashboard({ children, userId, role }: RealtimeDashboardProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [updateCount, setUpdateCount] = useState(0);
  const { isConnected } = useWebSocket();

  // Listen for dashboard updates
  useEffect(() => {
    if (!isConnected) return;

    const handleDashboardUpdate = (update: DashboardUpdate) => {
      console.log('Dashboard update received:', update);
      setLastUpdate(new Date());
      setUpdateCount(prev => prev + 1);
      
      // Trigger custom event for dashboard components to listen to
      window.dispatchEvent(new CustomEvent('dashboard-update', {
        detail: update
      }));
    };

    // Subscribe to WebSocket events (this would need to be implemented in the WebSocket store)
    // For now, we'll simulate updates
    const interval = setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance of update every 5 seconds
        handleDashboardUpdate({
          type: 'user_activity',
          data: { activeUsers: Math.floor(Math.random() * 50) + 10 },
          timestamp: new Date().toISOString()
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <div className="relative">
      {/* Real-time status indicator */}
      {isConnected && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-black shadow-brutal text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live</span>
            {updateCount > 0 && (
              <span className="text-gray-500">
                ({updateCount} updates)
              </span>
            )}
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
}

// Hook for components to listen to real-time dashboard updates
export function useDashboardUpdates() {
  const [lastUpdate, setLastUpdate] = useState<DashboardUpdate | null>(null);

  useEffect(() => {
    const handleUpdate = (event: CustomEvent<DashboardUpdate>) => {
      setLastUpdate(event.detail);
    };

    window.addEventListener('dashboard-update', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('dashboard-update', handleUpdate as EventListener);
    };
  }, []);

  return { lastUpdate };
}
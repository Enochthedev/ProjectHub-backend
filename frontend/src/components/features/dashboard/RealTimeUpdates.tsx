'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RealTimeUpdate } from './types';

interface RealTimeUpdatesProps {
  onUpdate: (update: RealTimeUpdate) => void;
  refreshInterval?: number;
  enabled?: boolean;
  userId?: string;
  role?: 'student' | 'supervisor' | 'admin';
}

const RealTimeUpdates: React.FC<RealTimeUpdatesProps> = ({
  onUpdate,
  refreshInterval = 30000, // 30 seconds default
  enabled = true,
  userId,
  role
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  // Simulate WebSocket connection for real-time updates
  const connectToUpdates = useCallback(() => {
    if (!enabled) return;

    setIsConnected(true);
    
    // Simulate periodic updates based on role
    const interval = setInterval(() => {
      const updates = generateMockUpdates(role, userId);
      
      updates.forEach(update => {
        onUpdate(update);
        setUpdateCount(prev => prev + 1);
      });
      
      setLastUpdate(new Date());
    }, refreshInterval);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, [enabled, refreshInterval, role, userId, onUpdate]);

  useEffect(() => {
    const cleanup = connectToUpdates();
    return cleanup;
  }, [connectToUpdates]);

  // Generate mock real-time updates based on role
  const generateMockUpdates = (role?: string, userId?: string): RealTimeUpdate[] => {
    const updates: RealTimeUpdate[] = [];
    const now = new Date().toISOString();

    // Random chance of updates
    if (Math.random() < 0.3) {
      switch (role) {
        case 'student':
          // Student-specific updates
          if (Math.random() < 0.5) {
            updates.push({
              type: 'widget_update',
              widgetId: 'current-project',
              data: {
                progress: Math.floor(Math.random() * 100),
                lastActivity: now
              },
              timestamp: now,
              priority: 'medium'
            });
          }
          
          if (Math.random() < 0.3) {
            updates.push({
              type: 'notification',
              data: {
                title: 'New AI Recommendation',
                message: 'Based on your recent activity, we found a relevant project.',
                type: 'recommendation'
              },
              timestamp: now,
              priority: 'low'
            });
          }
          break;

        case 'supervisor':
          // Supervisor-specific updates
          if (Math.random() < 0.4) {
            updates.push({
              type: 'widget_update',
              widgetId: 'recent-applications',
              data: {
                newApplications: Math.floor(Math.random() * 3),
                pendingReviews: Math.floor(Math.random() * 5)
              },
              timestamp: now,
              priority: 'medium'
            });
          }
          
          if (Math.random() < 0.2) {
            updates.push({
              type: 'notification',
              data: {
                title: 'Student Progress Update',
                message: 'John Doe has completed a milestone.',
                type: 'progress'
              },
              timestamp: now,
              priority: 'medium'
            });
          }
          break;

        case 'admin':
          // Admin-specific updates
          if (Math.random() < 0.6) {
            updates.push({
              type: 'widget_update',
              widgetId: 'platform-overview',
              data: {
                totalUsers: 183 + Math.floor(Math.random() * 10),
                activeProjects: 45 + Math.floor(Math.random() * 5),
                systemHealth: Math.random() < 0.9 ? 'healthy' : 'warning'
              },
              timestamp: now,
              priority: 'low'
            });
          }
          
          if (Math.random() < 0.1) {
            updates.push({
              type: 'system_alert',
              data: {
                title: 'System Alert',
                message: 'High CPU usage detected on server 2.',
                severity: 'warning'
              },
              timestamp: now,
              priority: 'high'
            });
          }
          break;
      }
    }

    return updates;
  };

  // This component doesn't render anything visible
  // It's a service component that handles real-time updates
  return null;
};

export default RealTimeUpdates;
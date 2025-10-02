'use client';

import { useEffect, useState } from 'react';
import { useWebSocketStore } from '@/stores/websocket';
import { ExclamationTriangleIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns';

interface MilestoneAlert {
  id: string;
  milestoneId: string;
  title: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  projectTitle?: string;
  isOverdue: boolean;
  daysUntilDue: number;
}

export function MilestoneDeadlineAlerts() {
  const [alerts, setAlerts] = useState<MilestoneAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const { notifications } = useWebSocketStore();

  // Process milestone deadline notifications
  useEffect(() => {
    const milestoneNotifications = notifications.filter(
      notification => notification.metadata?.milestoneId
    );

    const processedAlerts: MilestoneAlert[] = milestoneNotifications.map(notification => {
      const dueDate = new Date(notification.metadata!.dueDate);
      const now = new Date();
      const isOverdue = isAfter(now, dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: notification.id,
        milestoneId: notification.metadata!.milestoneId,
        title: notification.title,
        dueDate: notification.metadata!.dueDate,
        priority: notification.type === 'error' ? 'high' : notification.type === 'warning' ? 'medium' : 'low',
        isOverdue,
        daysUntilDue,
      };
    });

    setAlerts(processedAlerts.filter(alert => !dismissedAlerts.has(alert.id)));
  }, [notifications, dismissedAlerts]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const getAlertStyles = (alert: MilestoneAlert) => {
    if (alert.isOverdue) {
      return 'border-l-black bg-red-50 border-red-200';
    }
    
    if (alert.daysUntilDue <= 1) {
      return 'border-l-gray-600 bg-orange-50 border-orange-200';
    }
    
    if (alert.daysUntilDue <= 3) {
      return 'border-l-gray-400 bg-yellow-50 border-yellow-200';
    }
    
    return 'border-l-gray-300 bg-blue-50 border-blue-200';
  };

  const getAlertIcon = (alert: MilestoneAlert) => {
    if (alert.isOverdue) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
    }
    return <ClockIcon className="h-5 w-5 text-orange-600" />;
  };

  const getAlertMessage = (alert: MilestoneAlert) => {
    if (alert.isOverdue) {
      return `Overdue by ${formatDistanceToNow(new Date(alert.dueDate))}`;
    }
    
    if (alert.daysUntilDue === 0) {
      return 'Due today';
    }
    
    if (alert.daysUntilDue === 1) {
      return 'Due tomorrow';
    }
    
    return `Due in ${alert.daysUntilDue} days`;
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40 w-80 space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`
            border-2 border-l-4 p-4 shadow-brutal
            ${getAlertStyles(alert)}
          `}
        >
          <div className="flex items-start gap-3">
            {getAlertIcon(alert)}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-gray-900">
                Milestone Deadline
              </h4>
              <p className="text-sm text-gray-700 mt-1">
                {alert.title}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {getAlertMessage(alert)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => window.location.href = `/milestones/${alert.milestoneId}`}
                  className="text-xs font-medium text-black hover:underline"
                >
                  View Milestone →
                </button>
              </div>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
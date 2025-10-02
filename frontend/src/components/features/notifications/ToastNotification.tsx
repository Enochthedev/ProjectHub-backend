'use client';

import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useWebSocketStore } from '@/stores/websocket';
import { RealtimeNotification } from '@/lib/websocket';

interface ToastProps {
  notification: RealtimeNotification;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto-dismiss after 5 seconds for low/medium priority
    if (notification.priority === 'low' || notification.priority === 'medium') {
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification.priority]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleClick = () => {
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    handleClose();
  };

  const getPriorityStyles = () => {
    switch (notification.priority) {
      case 'urgent':
        return 'border-black bg-white shadow-lg';
      case 'high':
        return 'border-gray-600 bg-white shadow-md';
      case 'medium':
        return 'border-gray-400 bg-white shadow-sm';
      case 'low':
      default:
        return 'border-gray-300 bg-gray-50 shadow-sm';
    }
  };

  const getTypeIcon = () => {
    switch (notification.type) {
      case 'milestone_deadline':
        return '⏰';
      case 'project_update':
        return '📋';
      case 'ai_response':
        return '🤖';
      case 'bookmark_update':
        return '🔖';
      case 'system_alert':
        return '⚠️';
      default:
        return '📢';
    }
  };

  return (
    <div
      className={`
        w-80 border-2 p-4 mb-3 cursor-pointer transition-all duration-300 ease-in-out
        ${getPriorityStyles()}
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${notification.actionUrl ? 'hover:shadow-lg' : ''}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <span className="text-lg flex-shrink-0">
            {getTypeIcon()}
          </span>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-black">
                {notification.title}
              </h4>
              
              {notification.priority === 'urgent' && (
                <span className="text-xs font-bold text-black bg-gray-200 px-2 py-1 border border-black ml-2">
                  URGENT
                </span>
              )}
            </div>
            
            <p className="text-sm text-gray-700 mt-1 line-clamp-2">
              {notification.message}
            </p>
            
            {notification.actionUrl && (
              <p className="text-xs text-gray-500 mt-2">
                Click to view details
              </p>
            )}
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="ml-2 p-1 text-gray-400 hover:text-black transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { notifications } = useRealtimeStore();
  const [toastNotifications, setToastNotifications] = useState<RealtimeNotification[]>([]);

  useEffect(() => {
    // Show toast for new notifications (only unread ones)
    const newNotifications = notifications.filter(
      n => !n.isRead && !toastNotifications.find(t => t.id === n.id)
    );

    if (newNotifications.length > 0) {
      setToastNotifications(prev => [...prev, ...newNotifications].slice(-5)); // Max 5 toasts
    }
  }, [notifications]);

  const removeToast = (notificationId: string) => {
    setToastNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <div className="space-y-2 pointer-events-auto">
        {toastNotifications.map((notification) => (
          <Toast
            key={notification.id}
            notification={notification}
            onClose={() => removeToast(notification.id)}
          />
        ))}
      </div>
    </div>
  );
};
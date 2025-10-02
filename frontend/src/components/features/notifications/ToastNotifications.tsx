'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useWebSocketStore } from '@/stores/websocket';
import { RealtimeNotification } from '@/lib/websocket';

interface Toast extends RealtimeNotification {
  isVisible: boolean;
  timeoutId?: NodeJS.Timeout;
}

export function ToastNotifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { notifications } = useWebSocketStore();

  // Listen for new notifications and create toasts
  useEffect(() => {
    const latestNotification = notifications[0];
    if (latestNotification && !toasts.find(t => t.id === latestNotification.id)) {
      const toast: Toast = {
        ...latestNotification,
        isVisible: true,
      };

      setToasts(prev => [toast, ...prev.slice(0, 4)]); // Keep max 5 toasts

      // Auto-dismiss after 5 seconds
      const timeoutId = setTimeout(() => {
        dismissToast(toast.id);
      }, 5000);

      toast.timeoutId = timeoutId;
    }
  }, [notifications]);

  const dismissToast = (toastId: string) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === toastId 
          ? { ...toast, isVisible: false }
          : toast
      )
    );

    // Remove from DOM after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== toastId));
    }, 300);
  };

  const getToastStyles = (type: RealtimeNotification['type']) => {
    switch (type) {
      case 'success':
        return 'border-black bg-white';
      case 'warning':
        return 'border-gray-600 bg-gray-50';
      case 'error':
        return 'border-black bg-gray-100';
      default:
        return 'border-gray-400 bg-white';
    }
  };

  const getToastIcon = (type: RealtimeNotification['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      default:
        return 'ℹ';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            transform transition-all duration-300 ease-in-out
            ${toast.isVisible 
              ? 'translate-x-0 opacity-100' 
              : 'translate-x-full opacity-0'
            }
          `}
        >
          <div className={`
            w-80 p-4 border-2 shadow-brutal
            ${getToastStyles(toast.type)}
          `}>
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0 mt-0.5">
                {getToastIcon(toast.type)}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm">
                  {toast.title}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {toast.message}
                </p>
                {toast.actionUrl && (
                  <button
                    onClick={() => {
                      window.location.href = toast.actionUrl!;
                      dismissToast(toast.id);
                    }}
                    className="text-sm font-medium text-black hover:underline mt-2"
                  >
                    View Details →
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  if (toast.timeoutId) {
                    clearTimeout(toast.timeoutId);
                  }
                  dismissToast(toast.id);
                }}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
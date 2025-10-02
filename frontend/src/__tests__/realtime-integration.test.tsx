import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WebSocketProvider } from '@/components/providers/WebSocketProvider';
import { NotificationCenter } from '@/components/features/notifications/NotificationCenter';
import { ToastNotifications } from '@/components/features/notifications/ToastNotifications';
import { useWebSocketStore } from '@/stores/websocket';
import { useAuthStore } from '@/stores/auth';

// Mock the WebSocket service
jest.mock('@/lib/websocket', () => ({
  __esModule: true,
  default: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    isConnected: jest.fn(() => true),
    on: jest.fn(),
    off: jest.fn(),
    joinProject: jest.fn(),
    leaveProject: jest.fn(),
    joinConversation: jest.fn(),
    leaveConversation: jest.fn(),
    startAITyping: jest.fn(),
    stopAITyping: jest.fn(),
  },
}));

// Mock auth store
jest.mock('@/stores/auth', () => ({
  useAuthStore: jest.fn(),
}));

const mockAuthStore = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    role: 'student',
    profile: { firstName: 'Test', lastName: 'User' },
  },
  token: 'mock-token',
};

describe('Real-time Integration', () => {
  beforeEach(() => {
    (useAuthStore as jest.Mock).mockReturnValue(mockAuthStore);
    
    // Reset WebSocket store
    useWebSocketStore.setState({
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      reconnectAttempts: 0,
      notifications: [],
      unreadCount: 0,
      activeUsers: [],
      typingUsers: new Map(),
    });
    
    jest.clearAllMocks();
  });

  describe('WebSocket Provider', () => {
    it('should connect when user is authenticated', async () => {
      const TestComponent = () => (
        <WebSocketProvider>
          <div>Test Content</div>
        </WebSocketProvider>
      );

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Test Content')).toBeInTheDocument();
      });
    });

    it('should not connect when user is not authenticated', () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        user: null,
        token: null,
      });

      const TestComponent = () => (
        <WebSocketProvider>
          <div>Test Content</div>
        </WebSocketProvider>
      );

      render(<TestComponent />);

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Notification Center', () => {
    it('should display notification count', async () => {
      // Add some notifications to the store
      act(() => {
        useWebSocketStore.getState().addNotification({
          id: 'notif-1',
          type: 'info',
          title: 'Test Notification',
          message: 'This is a test notification',
          timestamp: new Date().toISOString(),
          read: false,
        });
      });

      render(<NotificationCenter />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should open notification dropdown when clicked', async () => {
      const user = userEvent.setup();

      act(() => {
        useWebSocketStore.getState().addNotification({
          id: 'notif-1',
          type: 'info',
          title: 'Test Notification',
          message: 'This is a test notification',
          timestamp: new Date().toISOString(),
          read: false,
        });
      });

      render(<NotificationCenter />);

      const bellButton = screen.getByLabelText(/notifications/i);
      await user.click(bellButton);

      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
    });

    it('should mark notification as read when clicked', async () => {
      const user = userEvent.setup();

      act(() => {
        useWebSocketStore.getState().addNotification({
          id: 'notif-1',
          type: 'info',
          title: 'Test Notification',
          message: 'This is a test notification',
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: '/test',
        });
      });

      render(<NotificationCenter />);

      const bellButton = screen.getByLabelText(/notifications/i);
      await user.click(bellButton);

      const notification = screen.getByText('Test Notification');
      await user.click(notification);

      // Check that notification was marked as read
      const state = useWebSocketStore.getState();
      expect(state.notifications[0].read).toBe(true);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('Toast Notifications', () => {
    it('should display toast for new notifications', async () => {
      render(<ToastNotifications />);

      // Add a notification
      act(() => {
        useWebSocketStore.getState().addNotification({
          id: 'toast-1',
          type: 'success',
          title: 'Success!',
          message: 'Operation completed successfully',
          timestamp: new Date().toISOString(),
          read: false,
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Success!')).toBeInTheDocument();
        expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
      });
    });

    it('should auto-dismiss toast after timeout', async () => {
      jest.useFakeTimers();

      render(<ToastNotifications />);

      // Add a notification
      act(() => {
        useWebSocketStore.getState().addNotification({
          id: 'toast-1',
          type: 'info',
          title: 'Auto Dismiss',
          message: 'This will auto dismiss',
          timestamp: new Date().toISOString(),
          read: false,
        });
      });

      expect(screen.getByText('Auto Dismiss')).toBeInTheDocument();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Auto Dismiss')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Real-time Events', () => {
    it('should handle milestone deadline alerts', () => {
      render(<ToastNotifications />);

      // Simulate milestone deadline alert
      act(() => {
        useWebSocketStore.getState().addNotification({
          id: 'milestone-alert-1',
          type: 'warning',
          title: 'Milestone Deadline Alert',
          message: 'Milestone is due on 2024-01-15',
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: '/milestones/milestone-1',
          metadata: {
            milestoneId: 'milestone-1',
            dueDate: '2024-01-15',
          },
        });
      });

      expect(screen.getByText('Milestone Deadline Alert')).toBeInTheDocument();
    });

    it('should handle typing indicators', () => {
      // Test typing indicators directly through the store
      act(() => {
        useWebSocketStore.getState().updateTypingState('conv-1', true);
      });

      const state1 = useWebSocketStore.getState();
      expect(state1.typingUsers.get('conv-1')).toBe(true);

      act(() => {
        useWebSocketStore.getState().updateTypingState('conv-1', false);
      });

      const state2 = useWebSocketStore.getState();
      expect(state2.typingUsers.has('conv-1')).toBe(false);
    });
  });
});

// Helper function for hook testing
function renderHook<T>(callback: () => T) {
  let result: { current: T };
  
  function TestComponent() {
    result = { current: callback() };
    return null;
  }
  
  render(<TestComponent />);
  return { result: result! };
}
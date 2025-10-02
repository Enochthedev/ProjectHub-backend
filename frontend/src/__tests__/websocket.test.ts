import { renderHook, act } from '@testing-library/react';
import { useWebSocketStore } from '@/stores/websocket';
import websocketService from '@/lib/websocket';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
    io: jest.fn(() => ({
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
        connected: false,
    })),
}));

// Mock WebSocket service
jest.mock('@/lib/websocket', () => ({
    __esModule: true,
    default: {
        connect: jest.fn(),
        disconnect: jest.fn(),
        isConnected: jest.fn(() => false),
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

describe('WebSocket Store', () => {
    beforeEach(() => {
        // Reset store state
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

    describe('Connection Management', () => {
        it('should handle successful connection', async () => {
            const mockConnect = websocketService.connect as jest.Mock;
            mockConnect.mockResolvedValue(undefined);

            const { result } = renderHook(() => useWebSocketStore());

            await act(async () => {
                await result.current.connect({
                    url: 'http://localhost:3001',
                    token: 'test-token',
                });
            });

            expect(mockConnect).toHaveBeenCalledWith({
                url: 'http://localhost:3001',
                token: 'test-token',
            });
        });

        it('should handle connection error', async () => {
            const mockConnect = websocketService.connect as jest.Mock;
            const error = new Error('Connection failed');
            mockConnect.mockRejectedValue(error);

            const { result } = renderHook(() => useWebSocketStore());

            await act(async () => {
                try {
                    await result.current.connect({
                        url: 'http://localhost:3001',
                        token: 'test-token',
                    });
                } catch (e) {
                    // Expected to throw
                }
            });

            expect(result.current.connectionError).toBe('Connection failed');
            expect(result.current.isConnected).toBe(false);
        });

        it('should handle disconnection', () => {
            const mockDisconnect = websocketService.disconnect as jest.Mock;

            const { result } = renderHook(() => useWebSocketStore());

            act(() => {
                result.current.disconnect();
            });

            expect(mockDisconnect).toHaveBeenCalled();
            expect(result.current.isConnected).toBe(false);
            expect(result.current.typingUsers.size).toBe(0);
        });
    });

    describe('Notification Management', () => {
        it('should add notifications', () => {
            const { result } = renderHook(() => useWebSocketStore());

            const notification = {
                id: 'test-1',
                type: 'info' as const,
                title: 'Test Notification',
                message: 'This is a test',
                timestamp: new Date().toISOString(),
                read: false,
            };

            act(() => {
                result.current.addNotification(notification);
            });

            expect(result.current.notifications).toHaveLength(1);
            expect(result.current.notifications[0]).toEqual(notification);
            expect(result.current.unreadCount).toBe(1);
        });

        it('should mark notifications as read', () => {
            const { result } = renderHook(() => useWebSocketStore());

            const notification = {
                id: 'test-1',
                type: 'info' as const,
                title: 'Test Notification',
                message: 'This is a test',
                timestamp: new Date().toISOString(),
                read: false,
            };

            act(() => {
                result.current.addNotification(notification);
            });

            act(() => {
                result.current.markNotificationAsRead('test-1');
            });

            expect(result.current.notifications[0].read).toBe(true);
            expect(result.current.unreadCount).toBe(0);
        });

        it('should clear all notifications', () => {
            const { result } = renderHook(() => useWebSocketStore());

            const notification = {
                id: 'test-1',
                type: 'info' as const,
                title: 'Test Notification',
                message: 'This is a test',
                timestamp: new Date().toISOString(),
                read: false,
            };

            act(() => {
                result.current.addNotification(notification);
            });

            act(() => {
                result.current.clearNotifications();
            });

            expect(result.current.notifications).toHaveLength(0);
            expect(result.current.unreadCount).toBe(0);
        });
    });

    describe('Room Management', () => {
        it('should join and leave project rooms', () => {
            const mockJoinProject = websocketService.joinProject as jest.Mock;
            const mockLeaveProject = websocketService.leaveProject as jest.Mock;

            const { result } = renderHook(() => useWebSocketStore());

            act(() => {
                result.current.joinProject('project-1');
            });

            expect(mockJoinProject).toHaveBeenCalledWith('project-1');

            act(() => {
                result.current.leaveProject('project-1');
            });

            expect(mockLeaveProject).toHaveBeenCalledWith('project-1');
        });

        it('should join and leave conversation rooms', () => {
            const mockJoinConversation = websocketService.joinConversation as jest.Mock;
            const mockLeaveConversation = websocketService.leaveConversation as jest.Mock;

            const { result } = renderHook(() => useWebSocketStore());

            act(() => {
                result.current.joinConversation('conv-1');
            });

            expect(mockJoinConversation).toHaveBeenCalledWith('conv-1');

            act(() => {
                result.current.leaveConversation('conv-1');
            });

            expect(mockLeaveConversation).toHaveBeenCalledWith('conv-1');
        });
    });

    describe('Typing Indicators', () => {
        it('should update typing state', () => {
            const { result } = renderHook(() => useWebSocketStore());

            act(() => {
                result.current.updateTypingState('conv-1', true);
            });

            expect(result.current.typingUsers.get('conv-1')).toBe(true);

            act(() => {
                result.current.updateTypingState('conv-1', false);
            });

            expect(result.current.typingUsers.has('conv-1')).toBe(false);
        });
    });
});
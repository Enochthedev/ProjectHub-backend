import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import websocketService, { RealtimeNotification, WebSocketConfig } from '../lib/websocket';

interface WebSocketState {
    // Connection state
    isConnected: boolean;
    isConnecting: boolean;
    connectionError: string | null;
    reconnectAttempts: number;

    // Notifications
    notifications: RealtimeNotification[];
    unreadCount: number;

    // Real-time data
    activeUsers: string[];
    typingUsers: Map<string, boolean>; // conversationId -> isTyping

    // Actions
    connect: (config: WebSocketConfig) => Promise<void>;
    disconnect: () => void;
    markNotificationAsRead: (notificationId: string) => void;
    clearNotifications: () => void;
    joinProject: (projectId: string) => void;
    leaveProject: (projectId: string) => void;
    joinConversation: (conversationId: string) => void;
    leaveConversation: (conversationId: string) => void;

    // Internal state updates
    setConnectionState: (connected: boolean, connecting: boolean, error?: string | null) => void;
    addNotification: (notification: RealtimeNotification) => void;
    updateTypingState: (conversationId: string, isTyping: boolean) => void;
}

export const useWebSocketStore = create<WebSocketState>()(
    devtools(
        (set, get) => ({
            // Initial state
            isConnected: false,
            isConnecting: false,
            connectionError: null,
            reconnectAttempts: 0,
            notifications: [],
            unreadCount: 0,
            activeUsers: [],
            typingUsers: new Map(),

            // Actions
            connect: async (config: WebSocketConfig) => {
                const state = get();
                if (state.isConnected || state.isConnecting) {
                    return;
                }

                set({ isConnecting: true, connectionError: null });

                try {
                    await websocketService.connect(config);

                    // Set up event listeners
                    websocketService.on('connected', (data) => {
                        set({
                            isConnected: true,
                            isConnecting: false,
                            connectionError: null,
                            reconnectAttempts: 0
                        });
                    });

                    websocketService.on('disconnect', () => {
                        set({ isConnected: false, isConnecting: false });
                    });

                    websocketService.on('connect_error', (error) => {
                        set({
                            isConnected: false,
                            isConnecting: false,
                            connectionError: error.message
                        });
                    });

                    websocketService.on('notification', (notification) => {
                        get().addNotification(notification);
                    });

                    websocketService.on('ai-typing', (data) => {
                        get().updateTypingState(data.conversationId, data.isTyping);
                    });

                    websocketService.on('project-updated', (data) => {
                        // Handle project updates - could trigger store updates
                        console.log('Project updated:', data);
                    });

                    websocketService.on('bookmark-updated', (data) => {
                        // Handle bookmark updates - could trigger store updates
                        console.log('Bookmark updated:', data);
                    });

                    websocketService.on('milestone-updated', (data) => {
                        // Handle milestone updates - could trigger store updates
                        console.log('Milestone updated:', data);
                    });

                    websocketService.on('milestone-deadline-alert', (data) => {
                        // Create notification for milestone deadline
                        const notification: RealtimeNotification = {
                            id: `milestone-${data.milestoneId}-${Date.now()}`,
                            type: data.priority === 'high' ? 'error' : 'warning',
                            title: 'Milestone Deadline Alert',
                            message: `Milestone is due on ${new Date(data.dueDate).toLocaleDateString()}`,
                            timestamp: new Date().toISOString(),
                            read: false,
                            actionUrl: `/milestones/${data.milestoneId}`,
                            metadata: { milestoneId: data.milestoneId, dueDate: data.dueDate }
                        };
                        get().addNotification(notification);
                    });

                    websocketService.on('dashboard-update', (data) => {
                        // Handle dashboard updates - could trigger store updates
                        console.log('Dashboard updated:', data);
                    });

                } catch (error) {
                    set({
                        isConnected: false,
                        isConnecting: false,
                        connectionError: error instanceof Error ? error.message : 'Connection failed'
                    });
                    throw error;
                }
            },

            disconnect: () => {
                websocketService.disconnect();
                set({
                    isConnected: false,
                    isConnecting: false,
                    connectionError: null,
                    reconnectAttempts: 0,
                    typingUsers: new Map()
                });
            },

            markNotificationAsRead: (notificationId: string) => {
                set((state) => ({
                    notifications: state.notifications.map(notification =>
                        notification.id === notificationId
                            ? { ...notification, read: true }
                            : notification
                    ),
                    unreadCount: Math.max(0, state.unreadCount - 1)
                }));
            },

            clearNotifications: () => {
                set({ notifications: [], unreadCount: 0 });
            },

            joinProject: (projectId: string) => {
                websocketService.joinProject(projectId);
            },

            leaveProject: (projectId: string) => {
                websocketService.leaveProject(projectId);
            },

            joinConversation: (conversationId: string) => {
                websocketService.joinConversation(conversationId);
            },

            leaveConversation: (conversationId: string) => {
                websocketService.leaveConversation(conversationId);
            },

            // Internal state updates
            setConnectionState: (connected: boolean, connecting: boolean, error?: string | null) => {
                set({
                    isConnected: connected,
                    isConnecting: connecting,
                    connectionError: error ?? null
                });
            },

            addNotification: (notification: RealtimeNotification) => {
                set((state) => ({
                    notifications: [notification, ...state.notifications].slice(0, 50), // Keep last 50
                    unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1
                }));
            },

            updateTypingState: (conversationId: string, isTyping: boolean) => {
                set((state) => {
                    const newTypingUsers = new Map(state.typingUsers);
                    if (isTyping) {
                        newTypingUsers.set(conversationId, true);
                    } else {
                        newTypingUsers.delete(conversationId);
                    }
                    return { typingUsers: newTypingUsers };
                });
            },
        }),
        {
            name: 'websocket-store',
        }
    )
);
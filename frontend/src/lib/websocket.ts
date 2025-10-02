import { io, Socket } from 'socket.io-client';

export interface WebSocketConfig {
    url: string;
    token: string;
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    timeout?: number;
}

export interface WebSocketEvents {
    // Connection events
    connected: (data: { message: string; userId: string; timestamp: string }) => void;
    disconnect: () => void;
    connect_error: (error: Error) => void;

    // Notification events
    notification: (notification: RealtimeNotification) => void;

    // AI Assistant events
    'ai-typing': (data: { conversationId: string; isTyping: boolean; timestamp: string }) => void;
    'ai-message': (data: { conversationId: string; message: any; timestamp: string }) => void;

    // Project events
    'project-updated': (data: { projectId: string; changes: any; timestamp: string }) => void;
    'bookmark-updated': (data: { projectId: string; bookmarked: boolean; timestamp: string }) => void;

    // Milestone events
    'milestone-updated': (data: { milestoneId: string; changes: any; timestamp: string }) => void;
    'milestone-deadline-alert': (data: { milestoneId: string; dueDate: string; priority: string }) => void;

    // Dashboard events
    'dashboard-update': (data: { type: string; data: any; timestamp: string }) => void;
}

export interface RealtimeNotification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    actionUrl?: string;
    metadata?: Record<string, any>;
}

class WebSocketService {
    private socket: Socket | null = null;
    private config: WebSocketConfig | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private isConnecting = false;
    private eventListeners = new Map<string, Set<Function>>();

    connect(config: WebSocketConfig): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.socket?.connected) {
                resolve();
                return;
            }

            if (this.isConnecting) {
                reject(new Error('Connection already in progress'));
                return;
            }

            this.isConnecting = true;
            this.config = config;

            try {
                this.socket = io(`${config.url}/realtime`, {
                    auth: {
                        token: config.token,
                    },
                    reconnection: config.reconnection ?? true,
                    reconnectionAttempts: config.reconnectionAttempts ?? this.maxReconnectAttempts,
                    reconnectionDelay: config.reconnectionDelay ?? this.reconnectDelay,
                    timeout: config.timeout ?? 20000,
                    transports: ['websocket', 'polling'],
                });

                this.setupEventHandlers();

                this.socket.on('connected', (data) => {
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    console.log('WebSocket connected:', data);
                    resolve();
                });

                this.socket.on('connect_error', (error) => {
                    this.isConnecting = false;
                    console.error('WebSocket connection error:', error);
                    reject(error);
                });

                this.socket.on('disconnect', (reason) => {
                    console.log('WebSocket disconnected:', reason);
                    this.handleDisconnection(reason);
                });

            } catch (error) {
                this.isConnecting = false;
                reject(error);
            }
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.config = null;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
    }

    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    // Event subscription methods
    on<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(callback);

        if (this.socket) {
            this.socket.on(event, callback as any);
        }
    }

    off<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this.eventListeners.delete(event);
            }
        }

        if (this.socket) {
            this.socket.off(event, callback as any);
        }
    }

    // Room management
    joinProject(projectId: string): void {
        if (this.socket?.connected) {
            this.socket.emit('join-project', { projectId });
        }
    }

    leaveProject(projectId: string): void {
        if (this.socket?.connected) {
            this.socket.emit('leave-project', { projectId });
        }
    }

    joinConversation(conversationId: string): void {
        if (this.socket?.connected) {
            this.socket.emit('join-conversation', { conversationId });
        }
    }

    leaveConversation(conversationId: string): void {
        if (this.socket?.connected) {
            this.socket.emit('leave-conversation', { conversationId });
        }
    }

    // AI typing indicators
    startAITyping(conversationId: string): void {
        if (this.socket?.connected) {
            this.socket.emit('ai-typing-start', { conversationId });
        }
    }

    stopAITyping(conversationId: string): void {
        if (this.socket?.connected) {
            this.socket.emit('ai-typing-stop', { conversationId });
        }
    }

    private setupEventHandlers(): void {
        if (!this.socket) return;

        // Re-register all event listeners
        this.eventListeners.forEach((listeners, event) => {
            listeners.forEach(listener => {
                this.socket!.on(event, listener as any);
            });
        });
    }

    private handleDisconnection(reason: string): void {
        if (reason === 'io server disconnect') {
            // Server initiated disconnect, don't reconnect automatically
            return;
        }

        // Attempt to reconnect for client-side disconnections
        if (this.config && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

            setTimeout(() => {
                if (this.config) {
                    this.connect(this.config).catch(console.error);
                }
            }, this.reconnectDelay * this.reconnectAttempts);
        }
    }

    // Connection status
    getConnectionStatus(): {
        connected: boolean;
        connecting: boolean;
        reconnectAttempts: number;
        maxReconnectAttempts: number;
    } {
        return {
            connected: this.isConnected(),
            connecting: this.isConnecting,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
        };
    }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
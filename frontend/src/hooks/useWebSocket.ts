import { useEffect, useRef } from 'react';
import { useWebSocketStore } from '@/stores/websocket';

interface UseWebSocketOptions {
    // Project-specific options
    projectId?: string;
    autoJoinProject?: boolean;

    // Conversation-specific options
    conversationId?: string;
    autoJoinConversation?: boolean;

    // Event handlers
    onProjectUpdate?: (data: any) => void;
    onBookmarkUpdate?: (data: any) => void;
    onMilestoneUpdate?: (data: any) => void;
    onMilestoneDeadlineAlert?: (data: any) => void;
    onDashboardUpdate?: (data: any) => void;
    onNotification?: (notification: any) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
    const {
        projectId,
        autoJoinProject = false,
        conversationId,
        autoJoinConversation = false,
        onProjectUpdate,
        onBookmarkUpdate,
        onMilestoneUpdate,
        onMilestoneDeadlineAlert,
        onDashboardUpdate,
        onNotification,
    } = options;

    const {
        isConnected,
        isConnecting,
        connectionError,
        joinProject,
        leaveProject,
        joinConversation,
        leaveConversation,
        typingUsers,
    } = useWebSocketStore();

    const joinedProject = useRef<string | null>(null);
    const joinedConversation = useRef<string | null>(null);

    // Auto-join project room
    useEffect(() => {
        if (isConnected && projectId && autoJoinProject && joinedProject.current !== projectId) {
            // Leave previous project if any
            if (joinedProject.current) {
                leaveProject(joinedProject.current);
            }

            joinProject(projectId);
            joinedProject.current = projectId;
        }

        return () => {
            if (joinedProject.current) {
                leaveProject(joinedProject.current);
                joinedProject.current = null;
            }
        };
    }, [isConnected, projectId, autoJoinProject, joinProject, leaveProject]);

    // Auto-join conversation room
    useEffect(() => {
        if (isConnected && conversationId && autoJoinConversation && joinedConversation.current !== conversationId) {
            // Leave previous conversation if any
            if (joinedConversation.current) {
                leaveConversation(joinedConversation.current);
            }

            joinConversation(conversationId);
            joinedConversation.current = conversationId;
        }

        return () => {
            if (joinedConversation.current) {
                leaveConversation(joinedConversation.current);
                joinedConversation.current = null;
            }
        };
    }, [isConnected, conversationId, autoJoinConversation, joinConversation, leaveConversation]);

    // Set up event listeners (would need to be implemented in websocket service)
    useEffect(() => {
        // Note: This would require extending the websocket service to support custom event handlers
        // For now, components can subscribe to the store directly
    }, [onProjectUpdate, onBookmarkUpdate, onMilestoneUpdate, onMilestoneDeadlineAlert, onDashboardUpdate, onNotification]);

    // Helper functions
    const isTypingInConversation = (convId: string) => {
        return typingUsers.get(convId) || false;
    };

    const manualJoinProject = (projectId: string) => {
        if (isConnected) {
            joinProject(projectId);
            joinedProject.current = projectId;
        }
    };

    const manualLeaveProject = () => {
        if (joinedProject.current) {
            leaveProject(joinedProject.current);
            joinedProject.current = null;
        }
    };

    const manualJoinConversation = (conversationId: string) => {
        if (isConnected) {
            joinConversation(conversationId);
            joinedConversation.current = conversationId;
        }
    };

    const manualLeaveConversation = () => {
        if (joinedConversation.current) {
            leaveConversation(joinedConversation.current);
            joinedConversation.current = null;
        }
    };

    return {
        // Connection state
        isConnected,
        isConnecting,
        connectionError,

        // Room management
        joinedProject: joinedProject.current,
        joinedConversation: joinedConversation.current,
        manualJoinProject,
        manualLeaveProject,
        manualJoinConversation,
        manualLeaveConversation,

        // Typing indicators
        isTypingInConversation,

        // Direct access to store actions
        joinProject,
        leaveProject,
        joinConversation,
        leaveConversation,
    };
}

// Specialized hook for AI conversations
export function useAIConversationWebSocket(conversationId?: string) {
    return useWebSocket({
        conversationId,
        autoJoinConversation: !!conversationId,
    });
}

// Specialized hook for project pages
export function useProjectWebSocket(projectId?: string) {
    return useWebSocket({
        projectId,
        autoJoinProject: !!projectId,
    });
}
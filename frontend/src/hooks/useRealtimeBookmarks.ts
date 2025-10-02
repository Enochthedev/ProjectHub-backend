import { useEffect } from 'react';
import { useWebSocketStore } from '@/stores/websocket';
import { useBookmarkStore } from '@/stores/bookmark';
import { useWebSocket } from '@/hooks/useWebSocket';

interface BookmarkUpdate {
    projectId: string;
    bookmarked: boolean;
    userId: string;
    timestamp: string;
}

export function useRealtimeBookmarks() {
    const { isConnected } = useWebSocket();
    const { refreshBookmarks, updateBookmarkStatus } = useBookmarkStore();

    useEffect(() => {
        if (!isConnected) return;

        const handleBookmarkUpdate = (data: BookmarkUpdate) => {
            console.log('Bookmark update received:', data);

            // Update local bookmark status
            updateBookmarkStatus(data.projectId, data.bookmarked);

            // Optionally refresh bookmarks list if needed
            if (data.bookmarked) {
                // Small delay to ensure backend is updated
                setTimeout(() => {
                    refreshBookmarks();
                }, 500);
            }
        };

        // This would be implemented in the WebSocket store to listen for bookmark-updated events
        // For now, we'll create a placeholder

        return () => {
            // Cleanup listeners
        };
    }, [isConnected, updateBookmarkStatus, refreshBookmarks]);

    return {
        isConnected,
    };
}

// Hook for project-specific bookmark updates
export function useProjectBookmarkUpdates(projectId?: string) {
    const { isConnected, manualJoinProject, manualLeaveProject } = useWebSocket({
        projectId,
        autoJoinProject: !!projectId,
    });

    useEffect(() => {
        if (!projectId || !isConnected) return;

        const handleProjectBookmarkUpdate = (event: CustomEvent) => {
            const { projectId: updatedProjectId, bookmarked } = event.detail;

            if (updatedProjectId === projectId) {
                // Update UI to reflect bookmark status change
                console.log(`Project ${projectId} bookmark status changed to:`, bookmarked);

                // Dispatch event for project components to listen to
                window.dispatchEvent(new CustomEvent('project-bookmark-updated', {
                    detail: { projectId, bookmarked }
                }));
            }
        };

        window.addEventListener('bookmark-updated', handleProjectBookmarkUpdate as EventListener);

        return () => {
            window.removeEventListener('bookmark-updated', handleProjectBookmarkUpdate as EventListener);
        };
    }, [projectId, isConnected]);

    return {
        isConnected,
        joinProject: manualJoinProject,
        leaveProject: manualLeaveProject,
    };
}
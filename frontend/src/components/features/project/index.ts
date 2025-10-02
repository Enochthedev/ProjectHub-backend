// Current Project Management Components
export { CurrentProjectWidget } from './CurrentProjectWidget';
export { ProjectStatusUpdate, StatusHistory } from './ProjectStatusUpdate';
export { ProjectCommunication } from './ProjectCommunication';
export { ProjectProgressVisualization } from './ProjectProgressVisualization';
export { DeadlineNotifications, NotificationSummaryWidget } from './DeadlineNotifications';
export { default as CurrentProjectManagement } from './CurrentProjectManagement';

// Re-export types for convenience
export type {
    CurrentProject,
    ProjectAssignment,
    ProjectStatusUpdate as ProjectStatusUpdateType,
    ProjectCommunication as ProjectCommunicationType,
    ProjectProgressVisualization as ProjectProgressVisualizationType,
    ProjectDeadlineNotification
} from '@/types/project';
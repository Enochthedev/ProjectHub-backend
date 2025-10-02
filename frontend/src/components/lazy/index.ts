/**
 * Lazy-loaded components for code splitting and performance optimization
 */
import { lazy } from 'react';

// Dashboard components
export const StudentDashboard = lazy(() =>
    import('../features/dashboard/StudentDashboard').then(module => ({
        default: module.StudentDashboard
    }))
);

export const SupervisorDashboard = lazy(() =>
    import('../features/dashboard/SupervisorDashboard').then(module => ({
        default: module.SupervisorDashboard
    }))
);

export const AdminDashboard = lazy(() =>
    import('../features/dashboard/AdminDashboard').then(module => ({
        default: module.AdminDashboard
    }))
);

// Project components
export const ProjectDiscovery = lazy(() =>
    import('../features/projects/ProjectDiscovery').then(module => ({
        default: module.ProjectDiscovery
    }))
);

export const ProjectDetail = lazy(() =>
    import('../features/projects/ProjectDetail').then(module => ({
        default: module.ProjectDetail
    }))
);

// AI Assistant components
export const AIAssistant = lazy(() =>
    import('../features/ai-assistant/AIAssistant').then(module => ({
        default: module.AIAssistant
    }))
);

export const ChatInterface = lazy(() =>
    import('../features/ai-assistant/ChatInterface').then(module => ({
        default: module.ChatInterface
    }))
);

// Bookmark components
export const BookmarkManager = lazy(() =>
    import('../features/bookmarks/BookmarkManager').then(module => ({
        default: module.BookmarkManager
    }))
);

// Milestone components
export const MilestoneManager = lazy(() =>
    import('../features/milestones/MilestoneManager').then(module => ({
        default: module.MilestoneManager
    }))
);

// Admin components
export const UserManagement = lazy(() =>
    import('../features/admin/UserManagement').then(module => ({
        default: module.UserManagement
    }))
);

export const SystemAnalytics = lazy(() =>
    import('../features/admin/SystemAnalytics').then(module => ({
        default: module.SystemAnalytics
    }))
);

// Supervisor components
export const StudentProgress = lazy(() =>
    import('../features/supervisor/StudentProgress').then(module => ({
        default: module.StudentProgress
    }))
);

export const AIMonitoring = lazy(() =>
    import('../features/supervisor/AIMonitoring').then(module => ({
        default: module.AIMonitoring
    }))
);

// Settings components
export const UserSettings = lazy(() =>
    import('../features/settings/UserSettings').then(module => ({
        default: module.UserSettings
    }))
);

export const NotificationSettings = lazy(() =>
    import('../features/settings/NotificationSettings').then(module => ({
        default: module.NotificationSettings
    }))
);
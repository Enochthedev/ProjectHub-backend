export interface DashboardWidget {
    id: string;
    title: string;
    type: 'chart' | 'list' | 'metric' | 'activity' | 'progress' | 'custom';
    size: 'small' | 'medium' | 'large' | 'full';
    position: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    data?: any;
    refreshInterval?: number;
    isVisible: boolean;
    isCustomizable: boolean;
    permissions?: string[];
}

export interface DashboardLayout {
    id: string;
    name: string;
    role: 'student' | 'supervisor' | 'admin';
    widgets: DashboardWidget[];
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DashboardCustomization {
    userId: string;
    role: 'student' | 'supervisor' | 'admin';
    layouts: DashboardLayout[];
    activeLayoutId: string;
    preferences: {
        theme: 'light' | 'dark';
        refreshInterval: number;
        showNotifications: boolean;
        compactMode: boolean;
    };
}

export interface RealTimeUpdate {
    type: 'widget_update' | 'notification' | 'system_alert';
    widgetId?: string;
    data: any;
    timestamp: string;
    priority: 'low' | 'medium' | 'high';
}

export interface WidgetProps {
    widget: DashboardWidget;
    onUpdate?: (data: any) => void;
    onRemove?: (widgetId: string) => void;
    onResize?: (widgetId: string, size: DashboardWidget['size']) => void;
    isEditing?: boolean;
}

export interface DashboardMetrics {
    // Student Metrics
    projectProgress?: number;
    milestonesCompleted?: number;
    aiInteractions?: number;
    bookmarksCount?: number;

    // Supervisor Metrics
    totalProjects?: number;
    activeStudents?: number;
    pendingApplications?: number;
    completedProjects?: number;

    // Admin Metrics
    totalUsers?: number;
    systemHealth?: 'healthy' | 'warning' | 'critical';
    activeProjects?: number;
    pendingApprovals?: number;
}
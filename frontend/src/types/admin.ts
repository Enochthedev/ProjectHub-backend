// Admin-specific types
export interface AdminUser {
    id: string;
    email: string;
    role: 'student' | 'supervisor' | 'admin';
    isEmailVerified: boolean;
    isActive: boolean;
    profile: {
        firstName?: string;
        lastName?: string;
        name?: string;
        studentId?: string;
        specialization?: string;
        year?: number;
        interests?: string[];
        skills?: string[];
        specializations?: string[];
        isAvailable?: boolean;
        capacity?: number;
    };
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
    loginCount: number;
}

export interface AdminProject {
    id: string;
    title: string;
    abstract: string;
    specialization: string;
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
    year: number;
    tags: string[];
    technologyStack: string[];
    isGroupProject: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected' | 'archived';
    githubUrl?: string;
    demoUrl?: string;
    supervisor: {
        id: string;
        name: string;
        specializations: string[];
    };
    viewCount: number;
    bookmarkCount: number;
    createdAt: string;
    updatedAt: string;
    submittedBy?: {
        id: string;
        name: string;
        email: string;
    };
    approvedBy?: {
        id: string;
        name: string;
        approvedAt: string;
    };
    rejectedBy?: {
        id: string;
        name: string;
        rejectedAt: string;
        reason: string;
    };
}

export interface SystemHealth {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    activeConnections: number;
    databaseStatus: 'connected' | 'disconnected' | 'slow';
    redisStatus: 'connected' | 'disconnected' | 'slow';
    aiServiceStatus: 'operational' | 'degraded' | 'down';
    lastChecked: string;
    services: Array<{
        name: string;
        status: 'healthy' | 'warning' | 'critical';
        responseTime: number;
        lastChecked: string;
    }>;
}

export interface PlatformAnalytics {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;

    totalProjects: number;
    approvedProjects: number;
    pendingProjects: number;
    rejectedProjects: number;
    archivedProjects: number;

    aiInteractions: number;
    aiInteractionsToday: number;
    aiInteractionsThisWeek: number;
    aiInteractionsThisMonth: number;

    systemHealth: SystemHealth;

    userGrowth: Array<{
        date: string;
        users: number;
        projects: number;
        aiInteractions: number;
    }>;

    activityPatterns: Array<{
        hour: number;
        activity: number;
    }>;

    engagementData: Array<{
        metric: string;
        value: number;
        change: number;
        trend: 'up' | 'down' | 'stable';
    }>;

    topSpecializations: Array<{
        name: string;
        userCount: number;
        projectCount: number;
    }>;

    userDistribution: {
        students: number;
        supervisors: number;
        admins: number;
    };

    projectDistribution: {
        beginner: number;
        intermediate: number;
        advanced: number;
    };
}

export interface AISystemConfig {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    apiKey?: string;
    endpoint?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    responseTimeout?: number;
    rateLimitPerMinute?: number;
    knowledgeBaseEnabled: boolean;
    fallbackEnabled: boolean;
    confidenceThreshold: number;
    lastUpdated: string;
    lastTested?: string;
    testResults?: {
        success: boolean;
        responseTime: number;
        error?: string;
    };
}

export interface BulkOperation {
    id: string;
    type: 'user_import' | 'user_export' | 'project_export' | 'data_migration' | 'backup';
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    totalItems: number;
    processedItems: number;
    errorCount: number;
    startedAt: string;
    completedAt?: string;
    downloadUrl?: string;
    errors?: Array<{
        item: string;
        error: string;
    }>;
    createdBy: {
        id: string;
        name: string;
        email: string;
    };
}

export interface KnowledgeBaseEntry {
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: {
        id: string;
        name: string;
    };
    updatedBy: {
        id: string;
        name: string;
    };
}

export interface AIMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    averageConfidenceScore: number;

    topQuestions: Array<{
        question: string;
        count: number;
        averageConfidence: number;
    }>;

    confidenceScores: Array<{
        range: string;
        count: number;
        percentage: number;
    }>;

    dailyUsage: Array<{
        date: string;
        requests: number;
        successRate: number;
        averageResponseTime: number;
    }>;

    categoryBreakdown: Array<{
        category: string;
        count: number;
        successRate: number;
    }>;

    userEngagement: Array<{
        userId: string;
        userName: string;
        requestCount: number;
        averageRating: number;
    }>;
}

export interface MaintenanceMode {
    enabled: boolean;
    message?: string;
    enabledAt?: string;
    enabledBy?: {
        id: string;
        name: string;
        email: string;
    };
    scheduledEnd?: string;
}

export interface SystemBackup {
    id: string;
    createdAt: string;
    size: number;
    status: 'completed' | 'failed' | 'in_progress';
    downloadUrl?: string;
    createdBy: {
        id: string;
        name: string;
        email: string;
    };
    error?: string;
}

// Filter and search types
export interface UserFilters {
    role?: 'student' | 'supervisor' | 'admin';
    status?: 'active' | 'inactive' | 'unverified';
    search?: string;
    specialization?: string;
    dateRange?: {
        startDate: string;
        endDate: string;
    };
}

export interface ProjectFilters {
    status?: 'pending' | 'approved' | 'rejected' | 'archived';
    specialization?: string;
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
    search?: string;
    dateRange?: {
        startDate: string;
        endDate: string;
    };
}

export interface AnalyticsFilters {
    dateRange: {
        startDate: string;
        endDate: string;
    };
    granularity?: 'day' | 'week' | 'month';
    metrics?: string[];
}

// Form types
export interface CreateUserForm {
    email: string;
    role: 'student' | 'supervisor' | 'admin';
    profile: {
        firstName?: string;
        lastName?: string;
        name?: string;
        studentId?: string;
        specialization?: string;
        year?: number;
        specializations?: string[];
        isAvailable?: boolean;
        capacity?: number;
    };
    sendWelcomeEmail: boolean;
}

export interface UpdateUserForm {
    email?: string;
    role?: 'student' | 'supervisor' | 'admin';
    isActive?: boolean;
    profile?: {
        firstName?: string;
        lastName?: string;
        name?: string;
        studentId?: string;
        specialization?: string;
        year?: number;
        specializations?: string[];
        isAvailable?: boolean;
        capacity?: number;
    };
}

export interface ProjectApprovalForm {
    action: 'approve' | 'reject';
    feedback?: string;
    reason?: string;
}

export interface AIConfigForm {
    name: string;
    description: string;
    enabled: boolean;
    apiKey?: string;
    endpoint?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    responseTimeout?: number;
    rateLimitPerMinute?: number;
    knowledgeBaseEnabled: boolean;
    fallbackEnabled: boolean;
    confidenceThreshold: number;
}

export interface KnowledgeEntryForm {
    title: string;
    content: string;
    category: string;
    tags: string[];
    isActive: boolean;
}

export interface MaintenanceModeForm {
    enabled: boolean;
    message?: string;
    scheduledEnd?: string;
}

// API Response types
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: string[];
}

export interface BulkOperationResponse {
    success: number;
    failed: number;
    errors: Array<{
        item: string;
        error: string;
    }>;
}

// Dashboard widget types
export interface AdminDashboardWidget {
    id: string;
    type: 'metric' | 'chart' | 'table' | 'list';
    title: string;
    data: any;
    size: 'small' | 'medium' | 'large';
    position: { x: number; y: number };
    isVisible: boolean;
    refreshInterval?: number;
}

export interface AdminDashboardLayout {
    id: string;
    name: string;
    widgets: AdminDashboardWidget[];
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}
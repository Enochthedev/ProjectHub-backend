import { api } from './api';
import type {
    User,
    Project,
    SystemHealth,
    PlatformAnalytics,
    AISystemConfig,
    BulkOperation
} from '@/stores/admin';

// User Management API
export const userManagementApi = {
    // Get all users with optional filters
    getUsers: async (filters?: {
        role?: 'student' | 'supervisor' | 'admin';
        status?: 'active' | 'inactive' | 'unverified';
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{ users: User[]; total: number; page: number; limit: number }> => {
        const params = new URLSearchParams();
        if (filters?.role) params.append('role', filters.role);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());

        return api.get<{ users: User[]; total: number; page: number; limit: number }>(
            `/admin/users?${params.toString()}`
        );
    },

    // Get user by ID
    getUser: async (id: string): Promise<User> => {
        return api.get<User>(`/admin/users/${id}`);
    },

    // Create new user
    createUser: async (userData: {
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
        sendWelcomeEmail?: boolean;
    }): Promise<User> => {
        return api.post<User>('/admin/users', userData);
    },

    // Update user
    updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
        return api.patch<User>(`/admin/users/${id}`, updates);
    },

    // Delete user
    deleteUser: async (id: string): Promise<void> => {
        return api.delete<void>(`/admin/users/${id}`);
    },

    // Toggle user status (active/inactive)
    toggleUserStatus: async (id: string): Promise<User> => {
        return api.patch<User>(`/admin/users/${id}/toggle-status`);
    },

    // Bulk operations
    bulkUpdateUsers: async (userIds: string[], updates: Partial<User>): Promise<void> => {
        return api.patch<void>('/admin/users/bulk', { userIds, updates });
    },

    bulkDeleteUsers: async (userIds: string[]): Promise<void> => {
        return api.delete<void>('/admin/users/bulk', { data: { userIds } });
    },

    // Export users
    exportUsers: async (filters?: {
        role?: 'student' | 'supervisor' | 'admin';
        status?: 'active' | 'inactive' | 'unverified';
        format?: 'csv' | 'xlsx';
    }): Promise<Blob> => {
        const params = new URLSearchParams();
        if (filters?.role) params.append('role', filters.role);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.format) params.append('format', filters.format);

        const response = await fetch(`/api/admin/users/export?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to export users');
        }

        return response.blob();
    },

    // Import users
    importUsers: async (file: File): Promise<{
        success: number;
        errors: Array<{ row: number; error: string }>
    }> => {
        const formData = new FormData();
        formData.append('file', file);

        return api.post<{
            success: number;
            errors: Array<{ row: number; error: string }>
        }>('/admin/users/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};

// Project Management API
export const projectManagementApi = {
    // Get pending projects
    getPendingProjects: async (filters?: {
        specialization?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{ projects: Project[]; total: number; page: number; limit: number }> => {
        const params = new URLSearchParams();
        params.append('status', 'pending');
        if (filters?.specialization) params.append('specialization', filters.specialization);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());

        return api.get<{ projects: Project[]; total: number; page: number; limit: number }>(
            `/admin/projects?${params.toString()}`
        );
    },

    // Get all projects with filters
    getProjects: async (filters?: {
        status?: 'pending' | 'approved' | 'rejected' | 'archived';
        specialization?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{ projects: Project[]; total: number; page: number; limit: number }> => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.specialization) params.append('specialization', filters.specialization);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());

        return api.get<{ projects: Project[]; total: number; page: number; limit: number }>(
            `/admin/projects?${params.toString()}`
        );
    },

    // Approve project
    approveProject: async (id: string, feedback?: string): Promise<Project> => {
        return api.post<Project>(`/admin/projects/${id}/approve`, { feedback });
    },

    // Reject project
    rejectProject: async (id: string, reason: string): Promise<Project> => {
        return api.post<Project>(`/admin/projects/${id}/reject`, { reason });
    },

    // Bulk approve projects
    bulkApproveProjects: async (projectIds: string[], feedback?: string): Promise<void> => {
        return api.post<void>('/admin/projects/bulk-approve', { projectIds, feedback });
    },

    // Bulk reject projects
    bulkRejectProjects: async (projectIds: string[], reason: string): Promise<void> => {
        return api.post<void>('/admin/projects/bulk-reject', { projectIds, reason });
    },

    // Archive project
    archiveProject: async (id: string): Promise<Project> => {
        return api.patch<Project>(`/admin/projects/${id}/archive`);
    },

    // Export projects
    exportProjects: async (filters?: {
        status?: 'pending' | 'approved' | 'rejected' | 'archived';
        specialization?: string;
        format?: 'csv' | 'xlsx';
    }): Promise<Blob> => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.specialization) params.append('specialization', filters.specialization);
        if (filters?.format) params.append('format', filters.format);

        const response = await fetch(`/api/admin/projects/export?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to export projects');
        }

        return response.blob();
    },
};

// System Management API
export const systemManagementApi = {
    // Get system health
    getSystemHealth: async (): Promise<SystemHealth> => {
        return api.get<SystemHealth>('/admin/system/health');
    },

    // Get platform analytics
    getPlatformAnalytics: async (dateRange?: {
        startDate: string;
        endDate: string;
    }): Promise<PlatformAnalytics> => {
        const params = new URLSearchParams();
        if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
        if (dateRange?.endDate) params.append('endDate', dateRange.endDate);

        return api.get<PlatformAnalytics>(`/admin/analytics?${params.toString()}`);
    },

    // Toggle maintenance mode
    toggleMaintenanceMode: async (enabled: boolean, message?: string): Promise<{
        enabled: boolean;
        message?: string;
    }> => {
        return api.post<{ enabled: boolean; message?: string }>('/admin/system/maintenance', {
            enabled,
            message,
        });
    },

    // Get maintenance mode status
    getMaintenanceMode: async (): Promise<{
        enabled: boolean;
        message?: string;
        enabledAt?: string;
        enabledBy?: string;
    }> => {
        return api.get<{
            enabled: boolean;
            message?: string;
            enabledAt?: string;
            enabledBy?: string;
        }>('/admin/system/maintenance');
    },

    // Create system backup
    createBackup: async (): Promise<{ id: string; status: string }> => {
        return api.post<{ id: string; status: string }>('/admin/system/backup');
    },

    // Get backup history
    getBackupHistory: async (): Promise<Array<{
        id: string;
        createdAt: string;
        size: number;
        status: 'completed' | 'failed' | 'in_progress';
        downloadUrl?: string;
    }>> => {
        return api.get<Array<{
            id: string;
            createdAt: string;
            size: number;
            status: 'completed' | 'failed' | 'in_progress';
            downloadUrl?: string;
        }>>('/admin/system/backups');
    },
};

// AI System Management API
export const aiSystemManagementApi = {
    // Get AI system configurations
    getAIConfigs: async (): Promise<AISystemConfig[]> => {
        return api.get<AISystemConfig[]>('/admin/ai/configs');
    },

    // Update AI system configuration
    updateAIConfig: async (id: string, config: Partial<AISystemConfig>): Promise<AISystemConfig> => {
        return api.patch<AISystemConfig>(`/admin/ai/configs/${id}`, config);
    },

    // Test AI system configuration
    testAIConfig: async (id: string): Promise<{
        success: boolean;
        responseTime: number;
        error?: string;
    }> => {
        return api.post<{
            success: boolean;
            responseTime: number;
            error?: string;
        }>(`/admin/ai/configs/${id}/test`);
    },

    // Get AI system metrics
    getAIMetrics: async (dateRange?: {
        startDate: string;
        endDate: string;
    }): Promise<{
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        averageResponseTime: number;
        topQuestions: Array<{ question: string; count: number }>;
        confidenceScores: Array<{ range: string; count: number }>;
        dailyUsage: Array<{ date: string; requests: number }>;
    }> => {
        const params = new URLSearchParams();
        if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
        if (dateRange?.endDate) params.append('endDate', dateRange.endDate);

        return api.get<{
            totalRequests: number;
            successfulRequests: number;
            failedRequests: number;
            averageResponseTime: number;
            topQuestions: Array<{ question: string; count: number }>;
            confidenceScores: Array<{ range: string; count: number }>;
            dailyUsage: Array<{ date: string; requests: number }>;
        }>(`/admin/ai/metrics?${params.toString()}`);
    },

    // Manage knowledge base
    getKnowledgeBase: async (): Promise<Array<{
        id: string;
        title: string;
        content: string;
        category: string;
        tags: string[];
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
    }>> => {
        return api.get<Array<{
            id: string;
            title: string;
            content: string;
            category: string;
            tags: string[];
            isActive: boolean;
            createdAt: string;
            updatedAt: string;
        }>>('/admin/ai/knowledge-base');
    },

    // Add knowledge base entry
    addKnowledgeEntry: async (entry: {
        title: string;
        content: string;
        category: string;
        tags: string[];
    }): Promise<{
        id: string;
        title: string;
        content: string;
        category: string;
        tags: string[];
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
    }> => {
        return api.post<{
            id: string;
            title: string;
            content: string;
            category: string;
            tags: string[];
            isActive: boolean;
            createdAt: string;
            updatedAt: string;
        }>('/admin/ai/knowledge-base', entry);
    },

    // Update knowledge base entry
    updateKnowledgeEntry: async (id: string, updates: {
        title?: string;
        content?: string;
        category?: string;
        tags?: string[];
        isActive?: boolean;
    }): Promise<{
        id: string;
        title: string;
        content: string;
        category: string;
        tags: string[];
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
    }> => {
        return api.patch<{
            id: string;
            title: string;
            content: string;
            category: string;
            tags: string[];
            isActive: boolean;
            createdAt: string;
            updatedAt: string;
        }>(`/admin/ai/knowledge-base/${id}`, updates);
    },

    // Delete knowledge base entry
    deleteKnowledgeEntry: async (id: string): Promise<void> => {
        return api.delete<void>(`/admin/ai/knowledge-base/${id}`);
    },
};

// Bulk Operations API
export const bulkOperationsApi = {
    // Get all bulk operations
    getBulkOperations: async (): Promise<BulkOperation[]> => {
        return api.get<BulkOperation[]>('/admin/bulk-operations');
    },

    // Start bulk operation
    startBulkOperation: async (
        type: BulkOperation['type'],
        data?: any
    ): Promise<BulkOperation> => {
        return api.post<BulkOperation>('/admin/bulk-operations', { type, data });
    },

    // Get bulk operation status
    getBulkOperationStatus: async (id: string): Promise<BulkOperation> => {
        return api.get<BulkOperation>(`/admin/bulk-operations/${id}`);
    },

    // Cancel bulk operation
    cancelBulkOperation: async (id: string): Promise<void> => {
        return api.post<void>(`/admin/bulk-operations/${id}/cancel`);
    },

    // Download bulk operation result
    downloadBulkOperationResult: async (id: string): Promise<Blob> => {
        const response = await fetch(`/api/admin/bulk-operations/${id}/download`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to download bulk operation result');
        }

        return response.blob();
    },
};

// Combined admin API
export const adminApi = {
    users: userManagementApi,
    projects: projectManagementApi,
    system: systemManagementApi,
    ai: aiSystemManagementApi,
    bulkOperations: bulkOperationsApi,
};
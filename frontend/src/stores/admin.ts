import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Types for Admin Store
export interface User {
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
}

export interface Project {
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
}

export interface SystemHealth {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    activeConnections: number;
    lastChecked: string;
}

export interface PlatformAnalytics {
    totalUsers: number;
    activeUsers: number;
    totalProjects: number;
    approvedProjects: number;
    pendingProjects: number;
    rejectedProjects: number;
    aiInteractions: number;
    systemHealth: SystemHealth;
    userGrowth: Array<{
        date: string;
        users: number;
        projects: number;
    }>;
    activityPatterns: Array<{
        hour: number;
        activity: number;
    }>;
    engagementData: Array<{
        metric: string;
        value: number;
        change: number;
    }>;
}

export interface AISystemConfig {
    id: string;
    name: string;
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
}

export interface BulkOperation {
    id: string;
    type: 'user_import' | 'user_export' | 'project_export' | 'data_migration' | 'backup';
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    totalItems: number;
    processedItems: number;
    errorCount: number;
    startedAt: string;
    completedAt?: string;
    downloadUrl?: string;
    errors?: string[];
}

interface AdminState {
    // User Management
    users: User[];
    selectedUsers: string[];
    userFilters: {
        role?: 'student' | 'supervisor' | 'admin';
        status?: 'active' | 'inactive' | 'unverified';
        search?: string;
    };

    // Project Management
    pendingProjects: Project[];
    selectedProjects: string[];
    projectFilters: {
        status?: 'pending' | 'approved' | 'rejected';
        specialization?: string;
        search?: string;
    };

    // System Management
    systemHealth: SystemHealth | null;
    platformAnalytics: PlatformAnalytics | null;
    aiSystemConfigs: AISystemConfig[];
    bulkOperations: BulkOperation[];
    maintenanceMode: boolean;

    // UI State
    isLoading: boolean;
    error: string | null;

    // Actions
    // User Management Actions
    fetchUsers: () => Promise<void>;
    createUser: (userData: Partial<User>) => Promise<void>;
    updateUser: (id: string, updates: Partial<User>) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    toggleUserStatus: (id: string) => Promise<void>;
    setUserFilters: (filters: Partial<AdminState['userFilters']>) => void;
    selectUsers: (userIds: string[]) => void;
    bulkUpdateUsers: (userIds: string[], updates: Partial<User>) => Promise<void>;

    // Project Management Actions
    fetchPendingProjects: () => Promise<void>;
    approveProject: (id: string, feedback?: string) => Promise<void>;
    rejectProject: (id: string, reason: string) => Promise<void>;
    setProjectFilters: (filters: Partial<AdminState['projectFilters']>) => void;
    selectProjects: (projectIds: string[]) => void;
    bulkApproveProjects: (projectIds: string[]) => Promise<void>;
    bulkRejectProjects: (projectIds: string[], reason: string) => Promise<void>;

    // System Management Actions
    fetchSystemHealth: () => Promise<void>;
    fetchPlatformAnalytics: () => Promise<void>;
    fetchAISystemConfigs: () => Promise<void>;
    updateAISystemConfig: (id: string, config: Partial<AISystemConfig>) => Promise<void>;
    toggleMaintenanceMode: (enabled: boolean, message?: string) => Promise<void>;

    // Bulk Operations Actions
    fetchBulkOperations: () => Promise<void>;
    startBulkOperation: (type: BulkOperation['type'], data?: any) => Promise<void>;
    cancelBulkOperation: (id: string) => Promise<void>;
    downloadBulkOperationResult: (id: string) => Promise<void>;

    // Utility Actions
    clearError: () => void;
    clearSelection: () => void;
}

export const useAdminStore = create<AdminState>()(
    devtools(
        (set, get) => ({
            // Initial State
            users: [],
            selectedUsers: [],
            userFilters: {},
            pendingProjects: [],
            selectedProjects: [],
            projectFilters: {},
            systemHealth: null,
            platformAnalytics: null,
            aiSystemConfigs: [],
            bulkOperations: [],
            maintenanceMode: false,
            isLoading: false,
            error: null,

            // User Management Actions
            fetchUsers: async () => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch('/api/admin/users');
                    if (!response.ok) throw new Error('Failed to fetch users');
                    const users = await response.json();
                    set({ users, isLoading: false });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to fetch users',
                        isLoading: false
                    });
                }
            },

            createUser: async (userData) => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch('/api/admin/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userData),
                    });
                    if (!response.ok) throw new Error('Failed to create user');
                    const newUser = await response.json();
                    set(state => ({
                        users: [...state.users, newUser],
                        isLoading: false
                    }));
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to create user',
                        isLoading: false
                    });
                }
            },

            updateUser: async (id, updates) => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch(`/api/admin/users/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates),
                    });
                    if (!response.ok) throw new Error('Failed to update user');
                    const updatedUser = await response.json();
                    set(state => ({
                        users: state.users.map(user => user.id === id ? updatedUser : user),
                        isLoading: false
                    }));
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to update user',
                        isLoading: false
                    });
                }
            },

            deleteUser: async (id) => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch(`/api/admin/users/${id}`, {
                        method: 'DELETE',
                    });
                    if (!response.ok) throw new Error('Failed to delete user');
                    set(state => ({
                        users: state.users.filter(user => user.id !== id),
                        selectedUsers: state.selectedUsers.filter(userId => userId !== id),
                        isLoading: false
                    }));
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to delete user',
                        isLoading: false
                    });
                }
            },

            toggleUserStatus: async (id) => {
                const user = get().users.find(u => u.id === id);
                if (!user) return;

                await get().updateUser(id, { isActive: !user.isActive });
            },

            setUserFilters: (filters) => {
                set(state => ({
                    userFilters: { ...state.userFilters, ...filters }
                }));
            },

            selectUsers: (userIds) => {
                set({ selectedUsers: userIds });
            },

            bulkUpdateUsers: async (userIds, updates) => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch('/api/admin/users/bulk', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userIds, updates }),
                    });
                    if (!response.ok) throw new Error('Failed to bulk update users');

                    // Refresh users list
                    await get().fetchUsers();
                    set({ selectedUsers: [] });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to bulk update users',
                        isLoading: false
                    });
                }
            },

            // Project Management Actions
            fetchPendingProjects: async () => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch('/api/admin/projects/pending');
                    if (!response.ok) throw new Error('Failed to fetch pending projects');
                    const projects = await response.json();
                    set({ pendingProjects: projects, isLoading: false });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to fetch pending projects',
                        isLoading: false
                    });
                }
            },

            approveProject: async (id, feedback) => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch(`/api/admin/projects/${id}/approve`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ feedback }),
                    });
                    if (!response.ok) throw new Error('Failed to approve project');

                    set(state => ({
                        pendingProjects: state.pendingProjects.filter(p => p.id !== id),
                        isLoading: false
                    }));
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to approve project',
                        isLoading: false
                    });
                }
            },

            rejectProject: async (id, reason) => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch(`/api/admin/projects/${id}/reject`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reason }),
                    });
                    if (!response.ok) throw new Error('Failed to reject project');

                    set(state => ({
                        pendingProjects: state.pendingProjects.filter(p => p.id !== id),
                        isLoading: false
                    }));
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to reject project',
                        isLoading: false
                    });
                }
            },

            setProjectFilters: (filters) => {
                set(state => ({
                    projectFilters: { ...state.projectFilters, ...filters }
                }));
            },

            selectProjects: (projectIds) => {
                set({ selectedProjects: projectIds });
            },

            bulkApproveProjects: async (projectIds) => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch('/api/admin/projects/bulk-approve', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ projectIds }),
                    });
                    if (!response.ok) throw new Error('Failed to bulk approve projects');

                    set(state => ({
                        pendingProjects: state.pendingProjects.filter(p => !projectIds.includes(p.id)),
                        selectedProjects: [],
                        isLoading: false
                    }));
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to bulk approve projects',
                        isLoading: false
                    });
                }
            },

            bulkRejectProjects: async (projectIds, reason) => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch('/api/admin/projects/bulk-reject', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ projectIds, reason }),
                    });
                    if (!response.ok) throw new Error('Failed to bulk reject projects');

                    set(state => ({
                        pendingProjects: state.pendingProjects.filter(p => !projectIds.includes(p.id)),
                        selectedProjects: [],
                        isLoading: false
                    }));
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to bulk reject projects',
                        isLoading: false
                    });
                }
            },

            // System Management Actions
            fetchSystemHealth: async () => {
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch('/api/admin/system/health');
                    if (!response.ok) throw new Error('Failed to fetch system health');
                    const health = await response.json();
                    set({ systemHealth: health });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to fetch system health'
                    });
                }
            },

            fetchPlatformAnalytics: async () => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch('/api/admin/analytics');
                    if (!response.ok) throw new Error('Failed to fetch platform analytics');
                    const analytics = await response.json();
                    set({ platformAnalytics: analytics, isLoading: false });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to fetch platform analytics',
                        isLoading: false
                    });
                }
            },

            fetchAISystemConfigs: async () => {
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch('/api/admin/ai/configs');
                    if (!response.ok) throw new Error('Failed to fetch AI system configs');
                    const configs = await response.json();
                    set({ aiSystemConfigs: configs });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to fetch AI system configs'
                    });
                }
            },

            updateAISystemConfig: async (id, config) => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch(`/api/admin/ai/configs/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(config),
                    });
                    if (!response.ok) throw new Error('Failed to update AI system config');
                    const updatedConfig = await response.json();

                    set(state => ({
                        aiSystemConfigs: state.aiSystemConfigs.map(c => c.id === id ? updatedConfig : c),
                        isLoading: false
                    }));
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to update AI system config',
                        isLoading: false
                    });
                }
            },

            toggleMaintenanceMode: async (enabled, message) => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch('/api/admin/system/maintenance', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enabled, message }),
                    });
                    if (!response.ok) throw new Error('Failed to toggle maintenance mode');

                    set({ maintenanceMode: enabled, isLoading: false });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to toggle maintenance mode',
                        isLoading: false
                    });
                }
            },

            // Bulk Operations Actions
            fetchBulkOperations: async () => {
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch('/api/admin/bulk-operations');
                    if (!response.ok) throw new Error('Failed to fetch bulk operations');
                    const operations = await response.json();
                    set({ bulkOperations: operations });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to fetch bulk operations'
                    });
                }
            },

            startBulkOperation: async (type, data) => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch('/api/admin/bulk-operations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type, data }),
                    });
                    if (!response.ok) throw new Error('Failed to start bulk operation');
                    const operation = await response.json();

                    set(state => ({
                        bulkOperations: [...state.bulkOperations, operation],
                        isLoading: false
                    }));
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to start bulk operation',
                        isLoading: false
                    });
                }
            },

            cancelBulkOperation: async (id) => {
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch(`/api/admin/bulk-operations/${id}/cancel`, {
                        method: 'POST',
                    });
                    if (!response.ok) throw new Error('Failed to cancel bulk operation');

                    set(state => ({
                        bulkOperations: state.bulkOperations.map(op =>
                            op.id === id ? { ...op, status: 'failed' as const } : op
                        )
                    }));
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to cancel bulk operation'
                    });
                }
            },

            downloadBulkOperationResult: async (id) => {
                try {
                    // TODO: Replace with actual API call
                    const response = await fetch(`/api/admin/bulk-operations/${id}/download`);
                    if (!response.ok) throw new Error('Failed to download bulk operation result');

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `bulk-operation-${id}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to download bulk operation result'
                    });
                }
            },

            // Utility Actions
            clearError: () => {
                set({ error: null });
            },

            clearSelection: () => {
                set({ selectedUsers: [], selectedProjects: [] });
            },
        }),
        {
            name: 'admin-store',
        }
    )
);
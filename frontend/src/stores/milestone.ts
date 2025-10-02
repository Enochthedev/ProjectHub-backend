import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import {
    Milestone,
    MilestoneTemplate,
    MilestoneStats,
    MilestoneFilters,
    MilestoneSearchParams,
    MilestoneSearchResponse,
    CreateMilestoneData,
    UpdateMilestoneData,
    ProgressUpdate,
    CalendarIntegration,
    CalendarSyncSettings,
    MilestoneCalendarEvent,
} from '@/types/milestone';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';

interface MilestoneState {
    // Milestones
    milestones: Milestone[];
    selectedMilestone: Milestone | null;
    milestoneStats: MilestoneStats | null;

    // Templates
    templates: MilestoneTemplate[];
    selectedTemplate: MilestoneTemplate | null;

    // Calendar
    calendarEvents: MilestoneCalendarEvent[];
    calendarIntegrations: CalendarIntegration[];
    calendarSyncSettings: CalendarSyncSettings;

    // Filters and Search
    filters: MilestoneFilters;
    searchParams: MilestoneSearchParams;

    // UI State
    isLoading: boolean;
    isLoadingTemplates: boolean;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isSyncing: boolean;
    error: string | null;

    // View State
    viewMode: 'list' | 'calendar' | 'kanban';
    showCompleted: boolean;
    selectedDate: Date | null;

    // Actions - Milestones
    getMilestones: (params?: MilestoneSearchParams) => Promise<void>;
    createMilestone: (data: CreateMilestoneData) => Promise<Milestone>;
    updateMilestone: (id: string, data: UpdateMilestoneData) => Promise<void>;
    deleteMilestone: (id: string) => Promise<void>;
    updateProgress: (id: string, update: ProgressUpdate) => Promise<void>;
    selectMilestone: (milestone: Milestone | null) => void;

    // Actions - Templates
    getTemplates: () => Promise<void>;
    createFromTemplate: (templateId: string, projectId?: string) => Promise<void>;
    selectTemplate: (template: MilestoneTemplate | null) => void;

    // Actions - Calendar
    getCalendarEvents: (startDate: Date, endDate: Date) => Promise<void>;
    syncWithCalendar: (integrationId: string) => Promise<void>;
    getCalendarIntegrations: () => Promise<void>;
    addCalendarIntegration: (integration: Omit<CalendarIntegration, 'id'>) => Promise<void>;
    removeCalendarIntegration: (id: string) => Promise<void>;
    updateSyncSettings: (settings: Partial<CalendarSyncSettings>) => Promise<void>;

    // Actions - Filters and Search
    setFilters: (filters: Partial<MilestoneFilters>) => void;
    clearFilters: () => void;
    setSearchParams: (params: Partial<MilestoneSearchParams>) => void;

    // Actions - UI
    setViewMode: (mode: 'list' | 'calendar' | 'kanban') => void;
    setShowCompleted: (show: boolean) => void;
    setSelectedDate: (date: Date | null) => void;
    clearError: () => void;
    resetState: () => void;
}

const initialFilters: MilestoneFilters = {
    status: [],
    priority: [],
    categories: [],
    tags: [],
    dateRange: null,
    hasOverdueTasks: null,
};

const initialSyncSettings: CalendarSyncSettings = {
    autoSync: true,
    syncInterval: 60, // 1 hour
    includeCompleted: false,
    reminderMinutes: [15, 60, 1440], // 15 min, 1 hour, 1 day
};

export const useMilestoneStore = create<MilestoneState>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial State
                milestones: [],
                selectedMilestone: null,
                milestoneStats: null,
                templates: [],
                selectedTemplate: null,
                calendarEvents: [],
                calendarIntegrations: [],
                calendarSyncSettings: initialSyncSettings,
                filters: initialFilters,
                searchParams: {},
                isLoading: false,
                isLoadingTemplates: false,
                isCreating: false,
                isUpdating: false,
                isDeleting: false,
                isSyncing: false,
                error: null,
                viewMode: 'list',
                showCompleted: false,
                selectedDate: null,

                // Milestone Actions
                getMilestones: async (params?: MilestoneSearchParams) => {
                    try {
                        set({ isLoading: true, error: null });

                        const queryParams = new URLSearchParams();
                        if (params?.query) queryParams.append('query', params.query);
                        if (params?.status?.length) {
                            params.status.forEach(status => queryParams.append('status', status));
                        }
                        if (params?.priority?.length) {
                            params.priority.forEach(priority => queryParams.append('priority', priority));
                        }
                        if (params?.category) queryParams.append('category', params.category);
                        if (params?.tags?.length) {
                            params.tags.forEach(tag => queryParams.append('tags', tag));
                        }
                        if (params?.projectId) queryParams.append('projectId', params.projectId);
                        if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
                        if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
                        if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
                        if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
                        if (params?.page) queryParams.append('page', params.page.toString());
                        if (params?.limit) queryParams.append('limit', params.limit.toString());

                        const url = `${API_ENDPOINTS.MILESTONES.BASE}?${queryParams.toString()}`;

                        try {
                            const response = await api.get<MilestoneSearchResponse>(url);

                            set({
                                milestones: response.milestones,
                                milestoneStats: response.stats,
                                searchParams: params || {},
                                isLoading: false,
                            });
                        } catch (apiError) {
                            console.warn('API not available, using mock milestones:', apiError);

                            // Mock milestone data
                            const mockMilestones: Milestone[] = [
                                {
                                    id: 'milestone-1',
                                    title: 'Project Proposal Submission',
                                    description: 'Complete and submit the initial project proposal with research objectives and methodology.',
                                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                                    status: 'in_progress',
                                    priority: 'high',
                                    progress: 75,
                                    projectId: 'proj-1',
                                    studentId: 'student-1',
                                    supervisorId: 'sup-1',
                                    category: 'Documentation',
                                    tags: ['proposal', 'research', 'documentation'],
                                    estimatedHours: 20,
                                    actualHours: 15,
                                    dependencies: [],
                                    attachments: [],
                                    notes: [],
                                    reminders: [],
                                    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                                    updatedAt: new Date().toISOString(),
                                },
                                {
                                    id: 'milestone-2',
                                    title: 'Literature Review',
                                    description: 'Conduct comprehensive literature review on the chosen research topic.',
                                    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                                    status: 'not_started',
                                    priority: 'medium',
                                    progress: 0,
                                    projectId: 'proj-1',
                                    studentId: 'student-1',
                                    supervisorId: 'sup-1',
                                    category: 'Research',
                                    tags: ['literature', 'research', 'analysis'],
                                    estimatedHours: 40,
                                    dependencies: ['milestone-1'],
                                    attachments: [],
                                    notes: [],
                                    reminders: [],
                                    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                                    updatedAt: new Date().toISOString(),
                                },
                                {
                                    id: 'milestone-3',
                                    title: 'System Design',
                                    description: 'Create detailed system architecture and design documents.',
                                    dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
                                    status: 'not_started',
                                    priority: 'high',
                                    progress: 0,
                                    projectId: 'proj-1',
                                    studentId: 'student-1',
                                    supervisorId: 'sup-1',
                                    category: 'Design',
                                    tags: ['architecture', 'design', 'planning'],
                                    estimatedHours: 30,
                                    dependencies: ['milestone-2'],
                                    attachments: [],
                                    notes: [],
                                    reminders: [],
                                    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                                    updatedAt: new Date().toISOString(),
                                },
                            ];

                            const mockStats: MilestoneStats = {
                                total: 3,
                                completed: 0,
                                inProgress: 1,
                                overdue: 0,
                                blocked: 0,
                                completionRate: 25,
                                averageCompletionTime: 0,
                                upcomingDeadlines: mockMilestones.filter(m =>
                                    new Date(m.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                ),
                            };

                            set({
                                milestones: mockMilestones,
                                milestoneStats: mockStats,
                                searchParams: params || {},
                                isLoading: false,
                            });
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to load milestones';
                        set({ error: errorMessage, isLoading: false });
                        throw error;
                    }
                },

                createMilestone: async (data: CreateMilestoneData) => {
                    try {
                        set({ isCreating: true, error: null });

                        try {
                            const milestone = await api.post<Milestone>(API_ENDPOINTS.MILESTONES.BASE, data);

                            set(state => ({
                                milestones: [milestone, ...state.milestones],
                                isCreating: false,
                            }));

                            return milestone;
                        } catch (apiError) {
                            console.warn('API not available, creating mock milestone:', apiError);

                            const mockMilestone: Milestone = {
                                id: `milestone-${Date.now()}`,
                                title: data.title,
                                description: data.description,
                                dueDate: data.dueDate,
                                status: 'not_started',
                                priority: data.priority,
                                progress: 0,
                                projectId: data.projectId,
                                studentId: 'student-1',
                                category: data.category,
                                tags: data.tags,
                                estimatedHours: data.estimatedHours,
                                dependencies: data.dependencies,
                                attachments: [],
                                notes: [],
                                reminders: [],
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                            };

                            set(state => ({
                                milestones: [mockMilestone, ...state.milestones],
                                isCreating: false,
                            }));

                            return mockMilestone;
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to create milestone';
                        set({ error: errorMessage, isCreating: false });
                        throw error;
                    }
                },

                updateMilestone: async (id: string, data: UpdateMilestoneData) => {
                    try {
                        set({ isUpdating: true, error: null });

                        try {
                            const updatedMilestone = await api.patch<Milestone>(`${API_ENDPOINTS.MILESTONES.BASE}/${id}`, data);

                            set(state => ({
                                milestones: state.milestones.map(m => m.id === id ? updatedMilestone : m),
                                selectedMilestone: state.selectedMilestone?.id === id ? updatedMilestone : state.selectedMilestone,
                                isUpdating: false,
                            }));
                        } catch (apiError) {
                            console.warn('API not available, updating milestone locally:', apiError);

                            set(state => ({
                                milestones: state.milestones.map(m =>
                                    m.id === id
                                        ? { ...m, ...data, updatedAt: new Date().toISOString() }
                                        : m
                                ),
                                selectedMilestone: state.selectedMilestone?.id === id
                                    ? { ...state.selectedMilestone, ...data, updatedAt: new Date().toISOString() }
                                    : state.selectedMilestone,
                                isUpdating: false,
                            }));
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to update milestone';
                        set({ error: errorMessage, isUpdating: false });
                        throw error;
                    }
                },

                deleteMilestone: async (id: string) => {
                    try {
                        set({ isDeleting: true, error: null });

                        try {
                            await api.delete(`${API_ENDPOINTS.MILESTONES.BASE}/${id}`);
                        } catch (apiError) {
                            console.warn('API not available, deleting milestone locally:', apiError);
                        }

                        set(state => ({
                            milestones: state.milestones.filter(m => m.id !== id),
                            selectedMilestone: state.selectedMilestone?.id === id ? null : state.selectedMilestone,
                            isDeleting: false,
                        }));
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to delete milestone';
                        set({ error: errorMessage, isDeleting: false });
                        throw error;
                    }
                },

                updateProgress: async (id: string, update: ProgressUpdate) => {
                    try {
                        set({ isUpdating: true, error: null });

                        const updateData: UpdateMilestoneData = {
                            progress: update.progress,
                            status: update.status,
                            actualHours: update.timeSpent ? Math.round(update.timeSpent / 60) : undefined,
                        };

                        await get().updateMilestone(id, updateData);
                    } catch (error) {
                        throw error;
                    }
                },

                selectMilestone: (milestone: Milestone | null) => {
                    set({ selectedMilestone: milestone });
                },

                // Template Actions
                getTemplates: async () => {
                    try {
                        set({ isLoadingTemplates: true, error: null });

                        try {
                            const templates = await api.get<MilestoneTemplate[]>(API_ENDPOINTS.MILESTONES.TEMPLATES);

                            set({
                                templates,
                                isLoadingTemplates: false,
                            });
                        } catch (apiError) {
                            console.warn('API not available, using mock templates:', apiError);

                            const mockTemplates: MilestoneTemplate[] = [
                                {
                                    id: 'template-1',
                                    name: 'Software Development Project',
                                    description: 'Standard milestone template for software development projects',
                                    category: 'Software Development',
                                    tags: ['development', 'software', 'coding'],
                                    milestones: [
                                        {
                                            title: 'Project Planning',
                                            description: 'Define project scope, requirements, and timeline',
                                            estimatedHours: 20,
                                            priority: 'high',
                                            category: 'Planning',
                                            dependencies: [],
                                            daysFromStart: 0,
                                        },
                                        {
                                            title: 'System Design',
                                            description: 'Create system architecture and design documents',
                                            estimatedHours: 30,
                                            priority: 'high',
                                            category: 'Design',
                                            dependencies: [0],
                                            daysFromStart: 7,
                                        },
                                        {
                                            title: 'Implementation Phase 1',
                                            description: 'Implement core functionality',
                                            estimatedHours: 60,
                                            priority: 'high',
                                            category: 'Development',
                                            dependencies: [1],
                                            daysFromStart: 21,
                                        },
                                    ],
                                    estimatedDuration: 90,
                                    difficulty: 'intermediate',
                                    usageCount: 45,
                                    rating: 4.5,
                                    isPublic: true,
                                    createdBy: 'system',
                                    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                                    updatedAt: new Date().toISOString(),
                                },
                                {
                                    id: 'template-2',
                                    name: 'Research Project',
                                    description: 'Template for academic research projects',
                                    category: 'Research',
                                    tags: ['research', 'academic', 'thesis'],
                                    milestones: [
                                        {
                                            title: 'Literature Review',
                                            description: 'Comprehensive review of existing literature',
                                            estimatedHours: 40,
                                            priority: 'high',
                                            category: 'Research',
                                            dependencies: [],
                                            daysFromStart: 0,
                                        },
                                        {
                                            title: 'Methodology Design',
                                            description: 'Design research methodology and approach',
                                            estimatedHours: 25,
                                            priority: 'high',
                                            category: 'Planning',
                                            dependencies: [0],
                                            daysFromStart: 14,
                                        },
                                    ],
                                    estimatedDuration: 120,
                                    difficulty: 'advanced',
                                    usageCount: 23,
                                    rating: 4.2,
                                    isPublic: true,
                                    createdBy: 'system',
                                    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
                                    updatedAt: new Date().toISOString(),
                                },
                            ];

                            set({
                                templates: mockTemplates,
                                isLoadingTemplates: false,
                            });
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to load templates';
                        set({ error: errorMessage, isLoadingTemplates: false });
                        throw error;
                    }
                },

                createFromTemplate: async (templateId: string, projectId?: string) => {
                    try {
                        set({ isCreating: true, error: null });

                        const template = get().templates.find(t => t.id === templateId);
                        if (!template) {
                            throw new Error('Template not found');
                        }

                        try {
                            const milestones = await api.post<Milestone[]>(
                                `${API_ENDPOINTS.MILESTONES.TEMPLATES}/${templateId}/create`,
                                { projectId }
                            );

                            set(state => ({
                                milestones: [...milestones, ...state.milestones],
                                isCreating: false,
                            }));
                        } catch (apiError) {
                            console.warn('API not available, creating milestones from template locally:', apiError);

                            const startDate = new Date();
                            const mockMilestones: Milestone[] = template.milestones.map((item, index) => {
                                const dueDate = new Date(startDate);
                                dueDate.setDate(dueDate.getDate() + item.daysFromStart);

                                return {
                                    id: `milestone-${Date.now()}-${index}`,
                                    title: item.title,
                                    description: item.description,
                                    dueDate: dueDate.toISOString(),
                                    status: 'not_started',
                                    priority: item.priority,
                                    progress: 0,
                                    projectId,
                                    studentId: 'student-1',
                                    category: item.category,
                                    tags: template.tags,
                                    estimatedHours: item.estimatedHours,
                                    dependencies: item.dependencies.map(depIndex => `milestone-${Date.now()}-${depIndex}`),
                                    attachments: [],
                                    notes: [],
                                    reminders: [],
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString(),
                                };
                            });

                            set(state => ({
                                milestones: [...mockMilestones, ...state.milestones],
                                isCreating: false,
                            }));
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to create milestones from template';
                        set({ error: errorMessage, isCreating: false });
                        throw error;
                    }
                },

                selectTemplate: (template: MilestoneTemplate | null) => {
                    set({ selectedTemplate: template });
                },

                // Calendar Actions
                getCalendarEvents: async (startDate: Date, endDate: Date) => {
                    try {
                        const params = new URLSearchParams({
                            startDate: startDate.toISOString(),
                            endDate: endDate.toISOString(),
                        });

                        try {
                            const events = await api.get<MilestoneCalendarEvent[]>(
                                `${API_ENDPOINTS.MILESTONES.BASE}/calendar?${params.toString()}`
                            );

                            set({ calendarEvents: events });
                        } catch (apiError) {
                            console.warn('API not available, using mock calendar events:', apiError);

                            const { milestones } = get();
                            const events: MilestoneCalendarEvent[] = milestones
                                .filter(m => {
                                    const dueDate = new Date(m.dueDate);
                                    return dueDate >= startDate && dueDate <= endDate;
                                })
                                .map(m => ({
                                    id: m.id,
                                    title: m.title,
                                    date: m.dueDate,
                                    status: m.status,
                                    priority: m.priority,
                                    progress: m.progress,
                                }));

                            set({ calendarEvents: events });
                        }
                    } catch (error) {
                        console.error('Failed to load calendar events:', error);
                    }
                },

                syncWithCalendar: async (integrationId: string) => {
                    try {
                        set({ isSyncing: true, error: null });

                        try {
                            await api.post(`${API_ENDPOINTS.MILESTONES.BASE}/calendar/sync/${integrationId}`);
                        } catch (apiError) {
                            console.warn('API not available, mock calendar sync:', apiError);
                        }

                        set({ isSyncing: false });
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to sync with calendar';
                        set({ error: errorMessage, isSyncing: false });
                        throw error;
                    }
                },

                getCalendarIntegrations: async () => {
                    try {
                        const integrations = await api.get<CalendarIntegration[]>(
                            `${API_ENDPOINTS.MILESTONES.BASE}/calendar/integrations`
                        );

                        set({ calendarIntegrations: integrations });
                    } catch (error) {
                        console.warn('Failed to load calendar integrations:', error);
                        set({ calendarIntegrations: [] });
                    }
                },

                addCalendarIntegration: async (integration: Omit<CalendarIntegration, 'id'>) => {
                    try {
                        const newIntegration = await api.post<CalendarIntegration>(
                            `${API_ENDPOINTS.MILESTONES.BASE}/calendar/integrations`,
                            integration
                        );

                        set(state => ({
                            calendarIntegrations: [...state.calendarIntegrations, newIntegration],
                        }));
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to add calendar integration';
                        set({ error: errorMessage });
                        throw error;
                    }
                },

                removeCalendarIntegration: async (id: string) => {
                    try {
                        await api.delete(`${API_ENDPOINTS.MILESTONES.BASE}/calendar/integrations/${id}`);

                        set(state => ({
                            calendarIntegrations: state.calendarIntegrations.filter(i => i.id !== id),
                        }));
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to remove calendar integration';
                        set({ error: errorMessage });
                        throw error;
                    }
                },

                updateSyncSettings: async (settings: Partial<CalendarSyncSettings>) => {
                    try {
                        const updatedSettings = await api.patch<CalendarSyncSettings>(
                            `${API_ENDPOINTS.MILESTONES.BASE}/calendar/settings`,
                            settings
                        );

                        set({ calendarSyncSettings: updatedSettings });
                    } catch (error) {
                        console.warn('Failed to update sync settings:', error);
                        set(state => ({
                            calendarSyncSettings: { ...state.calendarSyncSettings, ...settings },
                        }));
                    }
                },

                // Filter and Search Actions
                setFilters: (filters: Partial<MilestoneFilters>) => {
                    set(state => ({
                        filters: { ...state.filters, ...filters },
                    }));
                },

                clearFilters: () => {
                    set({ filters: initialFilters });
                },

                setSearchParams: (params: Partial<MilestoneSearchParams>) => {
                    set(state => ({
                        searchParams: { ...state.searchParams, ...params },
                    }));
                },

                // UI Actions
                setViewMode: (mode: 'list' | 'calendar' | 'kanban') => {
                    set({ viewMode: mode });
                },

                setShowCompleted: (show: boolean) => {
                    set({ showCompleted: show });
                },

                setSelectedDate: (date: Date | null) => {
                    set({ selectedDate: date });
                },

                clearError: () => {
                    set({ error: null });
                },

                resetState: () => {
                    set({
                        milestones: [],
                        selectedMilestone: null,
                        milestoneStats: null,
                        templates: [],
                        selectedTemplate: null,
                        calendarEvents: [],
                        filters: initialFilters,
                        searchParams: {},
                        isLoading: false,
                        isLoadingTemplates: false,
                        isCreating: false,
                        isUpdating: false,
                        isDeleting: false,
                        isSyncing: false,
                        error: null,
                        viewMode: 'list',
                        showCompleted: false,
                        selectedDate: null,
                    });
                },
            }),
            {
                name: 'milestone-store',
                storage: createJSONStorage(() => localStorage),
                partialize: (state) => ({
                    viewMode: state.viewMode,
                    showCompleted: state.showCompleted,
                    filters: state.filters,
                    calendarSyncSettings: state.calendarSyncSettings,
                }),
            }
        ),
        {
            name: 'milestone-store',
        }
    )
);

// Selectors for computed values
export const useFilteredMilestones = (): Milestone[] => {
    const milestones = useMilestoneStore(state => state.milestones);
    const filters = useMilestoneStore(state => state.filters);
    const showCompleted = useMilestoneStore(state => state.showCompleted);

    return milestones.filter(milestone => {
        // Show completed filter
        if (!showCompleted && milestone.status === 'completed') {
            return false;
        }

        // Status filter
        if (filters.status.length > 0 && !filters.status.includes(milestone.status)) {
            return false;
        }

        // Priority filter
        if (filters.priority.length > 0 && !filters.priority.includes(milestone.priority)) {
            return false;
        }

        // Category filter
        if (filters.categories.length > 0 && !filters.categories.includes(milestone.category)) {
            return false;
        }

        // Tags filter
        if (filters.tags.length > 0) {
            const hasMatchingTag = filters.tags.some(tag => milestone.tags.includes(tag));
            if (!hasMatchingTag) {
                return false;
            }
        }

        // Date range filter
        if (filters.dateRange && (filters.dateRange.from || filters.dateRange.to)) {
            const dueDate = new Date(milestone.dueDate);

            if (filters.dateRange.from && dueDate < filters.dateRange.from) {
                return false;
            }

            if (filters.dateRange.to && dueDate > filters.dateRange.to) {
                return false;
            }
        }

        // Overdue filter
        if (filters.hasOverdueTasks !== null) {
            const isOverdue = milestone.status === 'overdue' ||
                (milestone.status !== 'completed' && new Date(milestone.dueDate) < new Date());

            if (filters.hasOverdueTasks !== isOverdue) {
                return false;
            }
        }

        return true;
    });
};

export const useMilestonesByStatus = () => {
    const milestones = useFilteredMilestones();

    return {
        notStarted: milestones.filter(m => m.status === 'not_started'),
        inProgress: milestones.filter(m => m.status === 'in_progress'),
        completed: milestones.filter(m => m.status === 'completed'),
        overdue: milestones.filter(m => m.status === 'overdue'),
        blocked: milestones.filter(m => m.status === 'blocked'),
    };
};

export const useUpcomingMilestones = (days: number = 7): Milestone[] => {
    const milestones = useMilestoneStore(state => state.milestones);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return milestones
        .filter(m =>
            m.status !== 'completed' &&
            new Date(m.dueDate) <= cutoffDate &&
            new Date(m.dueDate) >= new Date()
        )
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
};
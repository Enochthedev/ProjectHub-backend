import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    DashboardCustomization,
    DashboardLayout,
    DashboardWidget,
    RealTimeUpdate,
    DashboardMetrics
} from '@/components/features/dashboard/types';

interface DashboardState {
    // Customization
    customization: DashboardCustomization | null;
    isCustomizing: boolean;

    // Real-time updates
    realTimeEnabled: boolean;
    lastUpdate: Date | null;
    updateCount: number;

    // Dashboard data
    metrics: DashboardMetrics;
    isLoading: boolean;
    error: string | null;

    // Actions
    setCustomization: (customization: DashboardCustomization) => void;
    updateCustomization: (updates: Partial<DashboardCustomization>) => void;
    setIsCustomizing: (isCustomizing: boolean) => void;
    resetCustomization: (role: 'student' | 'supervisor' | 'admin') => void;

    // Widget management
    toggleWidget: (layoutId: string, widgetId: string) => void;
    updateWidget: (layoutId: string, widgetId: string, updates: Partial<DashboardWidget>) => void;

    // Real-time updates
    setRealTimeEnabled: (enabled: boolean) => void;
    handleRealTimeUpdate: (update: RealTimeUpdate) => void;

    // Data management
    setMetrics: (metrics: DashboardMetrics) => void;
    updateMetrics: (updates: Partial<DashboardMetrics>) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
}

const getDefaultCustomization = (role: 'student' | 'supervisor' | 'admin'): DashboardCustomization => {
    const defaultLayouts: Record<string, DashboardLayout> = {
        student: {
            id: 'default-student',
            name: 'Default Student Layout',
            role: 'student',
            widgets: [
                {
                    id: 'current-project',
                    title: 'Current Project',
                    type: 'progress',
                    size: 'large',
                    position: { x: 0, y: 0, w: 2, h: 2 },
                    isVisible: true,
                    isCustomizable: false,
                    permissions: ['student']
                },
                {
                    id: 'project-metrics',
                    title: 'Project Metrics',
                    type: 'metric',
                    size: 'medium',
                    position: { x: 2, y: 0, w: 2, h: 1 },
                    isVisible: true,
                    isCustomizable: true,
                    permissions: ['student']
                },
                {
                    id: 'upcoming-milestones',
                    title: 'Upcoming Milestones',
                    type: 'list',
                    size: 'medium',
                    position: { x: 0, y: 2, w: 2, h: 1 },
                    isVisible: true,
                    isCustomizable: true,
                    permissions: ['student']
                },
                {
                    id: 'recent-activity',
                    title: 'Recent Activity',
                    type: 'activity',
                    size: 'medium',
                    position: { x: 2, y: 2, w: 2, h: 1 },
                    isVisible: true,
                    isCustomizable: true,
                    permissions: ['student']
                },
                {
                    id: 'ai-conversations',
                    title: 'AI Assistant',
                    type: 'list',
                    size: 'medium',
                    position: { x: 0, y: 3, w: 2, h: 1 },
                    isVisible: true,
                    isCustomizable: true,
                    permissions: ['student']
                },
                {
                    id: 'trending-projects',
                    title: 'Trending Projects',
                    type: 'list',
                    size: 'medium',
                    position: { x: 2, y: 3, w: 2, h: 1 },
                    isVisible: true,
                    isCustomizable: true,
                    permissions: ['student']
                }
            ],
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        supervisor: {
            id: 'default-supervisor',
            name: 'Default Supervisor Layout',
            role: 'supervisor',
            widgets: [
                {
                    id: 'supervisor-metrics',
                    title: 'Overview Metrics',
                    type: 'metric',
                    size: 'full',
                    position: { x: 0, y: 0, w: 4, h: 1 },
                    isVisible: true,
                    isCustomizable: false,
                    permissions: ['supervisor']
                },
                {
                    id: 'recent-applications',
                    title: 'Recent Applications',
                    type: 'list',
                    size: 'medium',
                    position: { x: 0, y: 1, w: 2, h: 2 },
                    isVisible: true,
                    isCustomizable: true,
                    permissions: ['supervisor']
                },
                {
                    id: 'student-progress',
                    title: 'Student Progress',
                    type: 'progress',
                    size: 'medium',
                    position: { x: 2, y: 1, w: 2, h: 2 },
                    isVisible: true,
                    isCustomizable: true,
                    permissions: ['supervisor']
                },
                {
                    id: 'project-statistics',
                    title: 'Project Statistics',
                    type: 'chart',
                    size: 'medium',
                    position: { x: 0, y: 3, w: 2, h: 1 },
                    isVisible: true,
                    isCustomizable: true,
                    permissions: ['supervisor']
                },
                {
                    id: 'ai-monitoring',
                    title: 'AI Interactions',
                    type: 'activity',
                    size: 'medium',
                    position: { x: 2, y: 3, w: 2, h: 1 },
                    isVisible: true,
                    isCustomizable: true,
                    permissions: ['supervisor']
                }
            ],
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        admin: {
            id: 'default-admin',
            name: 'Default Admin Layout',
            role: 'admin',
            widgets: [
                {
                    id: 'platform-overview',
                    title: 'Platform Overview',
                    type: 'metric',
                    size: 'full',
                    position: { x: 0, y: 0, w: 4, h: 1 },
                    isVisible: true,
                    isCustomizable: false,
                    permissions: ['admin']
                },
                {
                    id: 'system-health',
                    title: 'System Health',
                    type: 'metric',
                    size: 'medium',
                    position: { x: 0, y: 1, w: 2, h: 1 },
                    isVisible: true,
                    isCustomizable: true,
                    permissions: ['admin']
                },
                {
                    id: 'user-growth',
                    title: 'User Growth',
                    type: 'chart',
                    size: 'medium',
                    position: { x: 2, y: 1, w: 2, h: 1 },
                    isVisible: true,
                    isCustomizable: true,
                    permissions: ['admin']
                },
                {
                    id: 'recent-activity',
                    title: 'Recent Activity',
                    type: 'activity',
                    size: 'medium',
                    position: { x: 0, y: 2, w: 2, h: 2 },
                    isVisible: true,
                    isCustomizable: true,
                    permissions: ['admin']
                },
                {
                    id: 'pending-approvals',
                    title: 'Pending Approvals',
                    type: 'list',
                    size: 'medium',
                    position: { x: 2, y: 2, w: 2, h: 2 },
                    isVisible: true,
                    isCustomizable: true,
                    permissions: ['admin']
                }
            ],
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    };

    return {
        userId: '',
        role,
        layouts: [defaultLayouts[role]],
        activeLayoutId: defaultLayouts[role].id,
        preferences: {
            theme: 'light',
            refreshInterval: 30,
            showNotifications: true,
            compactMode: false
        }
    };
};

export const useDashboardStore = create<DashboardState>()(
    persist(
        (set, get) => ({
            // Initial state
            customization: null,
            isCustomizing: false,
            realTimeEnabled: true,
            lastUpdate: null,
            updateCount: 0,
            metrics: {},
            isLoading: false,
            error: null,

            // Customization actions
            setCustomization: (customization) => {
                set({ customization });
            },

            updateCustomization: (updates) => {
                const current = get().customization;
                if (current) {
                    set({
                        customization: {
                            ...current,
                            ...updates
                        }
                    });
                }
            },

            setIsCustomizing: (isCustomizing) => {
                set({ isCustomizing });
            },

            resetCustomization: (role) => {
                const defaultCustomization = getDefaultCustomization(role);
                set({ customization: defaultCustomization });
            },

            // Widget management
            toggleWidget: (layoutId, widgetId) => {
                const current = get().customization;
                if (!current) return;

                const updatedLayouts = current.layouts.map(layout =>
                    layout.id === layoutId
                        ? {
                            ...layout,
                            widgets: layout.widgets.map(widget =>
                                widget.id === widgetId
                                    ? { ...widget, isVisible: !widget.isVisible }
                                    : widget
                            ),
                            updatedAt: new Date().toISOString()
                        }
                        : layout
                );

                set({
                    customization: {
                        ...current,
                        layouts: updatedLayouts
                    }
                });
            },

            updateWidget: (layoutId, widgetId, updates) => {
                const current = get().customization;
                if (!current) return;

                const updatedLayouts = current.layouts.map(layout =>
                    layout.id === layoutId
                        ? {
                            ...layout,
                            widgets: layout.widgets.map(widget =>
                                widget.id === widgetId
                                    ? { ...widget, ...updates }
                                    : widget
                            ),
                            updatedAt: new Date().toISOString()
                        }
                        : layout
                );

                set({
                    customization: {
                        ...current,
                        layouts: updatedLayouts
                    }
                });
            },

            // Real-time updates
            setRealTimeEnabled: (enabled) => {
                set({ realTimeEnabled: enabled });
            },

            handleRealTimeUpdate: (update) => {
                const current = get();

                set({
                    lastUpdate: new Date(),
                    updateCount: current.updateCount + 1
                });

                // Handle widget-specific updates
                if (update.type === 'widget_update' && update.widgetId) {
                    // Update metrics based on widget data
                    if (update.data) {
                        set({
                            metrics: {
                                ...current.metrics,
                                ...update.data
                            }
                        });
                    }
                }
            },

            // Data management
            setMetrics: (metrics) => {
                set({ metrics });
            },

            updateMetrics: (updates) => {
                const current = get().metrics;
                set({
                    metrics: {
                        ...current,
                        ...updates
                    }
                });
            },

            setLoading: (loading) => {
                set({ isLoading: loading });
            },

            setError: (error) => {
                set({ error });
            },

            clearError: () => {
                set({ error: null });
            }
        }),
        {
            name: 'dashboard-store',
            partialize: (state) => ({
                customization: state.customization,
                realTimeEnabled: state.realTimeEnabled,
                metrics: state.metrics
            })
        }
    )
);
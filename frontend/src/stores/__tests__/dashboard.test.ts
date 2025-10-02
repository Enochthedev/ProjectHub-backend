import { renderHook, act } from '@testing-library/react';
import { useDashboardStore } from '../dashboard';
import { DashboardCustomization } from '@/components/features/dashboard/types';

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('Dashboard Store', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useDashboardStore());

        expect(result.current.customization).toBeNull();
        expect(result.current.isCustomizing).toBe(false);
        expect(result.current.realTimeEnabled).toBe(true);
        expect(result.current.metrics).toEqual({});
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('should set customization', () => {
        const { result } = renderHook(() => useDashboardStore());

        const mockCustomization: DashboardCustomization = {
            userId: 'user1',
            role: 'student',
            layouts: [{
                id: 'layout1',
                name: 'Test Layout',
                role: 'student',
                widgets: [],
                isDefault: true,
                createdAt: '2023-01-01',
                updatedAt: '2023-01-01'
            }],
            activeLayoutId: 'layout1',
            preferences: {
                theme: 'light',
                refreshInterval: 30,
                showNotifications: true,
                compactMode: false
            }
        };

        act(() => {
            result.current.setCustomization(mockCustomization);
        });

        expect(result.current.customization).toEqual(mockCustomization);
    });

    it('should reset customization for student role', () => {
        const { result } = renderHook(() => useDashboardStore());

        act(() => {
            result.current.resetCustomization('student');
        });

        expect(result.current.customization).toBeDefined();
        expect(result.current.customization?.role).toBe('student');
        expect(result.current.customization?.layouts).toHaveLength(1);
        expect(result.current.customization?.layouts[0].role).toBe('student');
    });

    it('should reset customization for supervisor role', () => {
        const { result } = renderHook(() => useDashboardStore());

        act(() => {
            result.current.resetCustomization('supervisor');
        });

        expect(result.current.customization).toBeDefined();
        expect(result.current.customization?.role).toBe('supervisor');
        expect(result.current.customization?.layouts).toHaveLength(1);
        expect(result.current.customization?.layouts[0].role).toBe('supervisor');
    });

    it('should reset customization for admin role', () => {
        const { result } = renderHook(() => useDashboardStore());

        act(() => {
            result.current.resetCustomization('admin');
        });

        expect(result.current.customization).toBeDefined();
        expect(result.current.customization?.role).toBe('admin');
        expect(result.current.customization?.layouts).toHaveLength(1);
        expect(result.current.customization?.layouts[0].role).toBe('admin');
    });

    it('should toggle widget visibility', () => {
        const { result } = renderHook(() => useDashboardStore());

        // First set up a customization with widgets
        act(() => {
            result.current.resetCustomization('student');
        });

        const layoutId = result.current.customization!.layouts[0].id;
        const widgetId = result.current.customization!.layouts[0].widgets[0].id;
        const initialVisibility = result.current.customization!.layouts[0].widgets[0].isVisible;

        act(() => {
            result.current.toggleWidget(layoutId, widgetId);
        });

        const updatedWidget = result.current.customization!.layouts[0].widgets.find(w => w.id === widgetId);
        expect(updatedWidget?.isVisible).toBe(!initialVisibility);
    });

    it('should update metrics', () => {
        const { result } = renderHook(() => useDashboardStore());

        const mockMetrics = {
            projectProgress: 75,
            milestonesCompleted: 5,
            aiInteractions: 10,
            bookmarksCount: 3
        };

        act(() => {
            result.current.setMetrics(mockMetrics);
        });

        expect(result.current.metrics).toEqual(mockMetrics);
    });

    it('should handle real-time updates', () => {
        const { result } = renderHook(() => useDashboardStore());

        const mockUpdate = {
            type: 'widget_update' as const,
            widgetId: 'test-widget',
            data: { progress: 80 },
            timestamp: new Date().toISOString(),
            priority: 'medium' as const
        };

        act(() => {
            result.current.handleRealTimeUpdate(mockUpdate);
        });

        expect(result.current.lastUpdate).toBeDefined();
        expect(result.current.updateCount).toBe(1);
        expect(result.current.metrics).toEqual(mockUpdate.data);
    });

    it('should set loading state', () => {
        const { result } = renderHook(() => useDashboardStore());

        act(() => {
            result.current.setLoading(true);
        });

        expect(result.current.isLoading).toBe(true);

        act(() => {
            result.current.setLoading(false);
        });

        expect(result.current.isLoading).toBe(false);
    });

    it('should set and clear error', () => {
        const { result } = renderHook(() => useDashboardStore());

        const errorMessage = 'Test error';

        act(() => {
            result.current.setError(errorMessage);
        });

        expect(result.current.error).toBe(errorMessage);

        act(() => {
            result.current.clearError();
        });

        expect(result.current.error).toBeNull();
    });

    it('should enable/disable real-time updates', () => {
        const { result } = renderHook(() => useDashboardStore());

        act(() => {
            result.current.setRealTimeEnabled(false);
        });

        expect(result.current.realTimeEnabled).toBe(false);

        act(() => {
            result.current.setRealTimeEnabled(true);
        });

        expect(result.current.realTimeEnabled).toBe(true);
    });
});
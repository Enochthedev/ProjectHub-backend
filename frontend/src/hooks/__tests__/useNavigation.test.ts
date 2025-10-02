import { renderHook, act } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { useNavigation } from '../useNavigation';

// Mock dependencies
jest.mock('next/navigation', () => ({
    usePathname: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

describe('useNavigation', () => {
    beforeEach(() => {
        (usePathname as jest.Mock).mockReturnValue('/dashboard');
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);

        // Mock window.innerWidth
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024,
        });
    });

    it('initializes with default state', () => {
        const { result } = renderHook(() => useNavigation());

        expect(result.current.isSidebarOpen).toBe(false);
        expect(result.current.isSidebarCollapsed).toBe(false);
        expect(result.current.isSearchModalOpen).toBe(false);
        expect(result.current.currentPath).toBe('/dashboard');
    });

    it('loads sidebar collapsed state from localStorage', () => {
        localStorageMock.getItem.mockReturnValue('true');

        const { result } = renderHook(() => useNavigation());

        expect(result.current.isSidebarCollapsed).toBe(true);
    });

    it('toggles sidebar open/close', () => {
        const { result } = renderHook(() => useNavigation());

        act(() => {
            result.current.toggleSidebar();
        });

        expect(result.current.isSidebarOpen).toBe(true);

        act(() => {
            result.current.toggleSidebar();
        });

        expect(result.current.isSidebarOpen).toBe(false);
    });

    it('closes sidebar', () => {
        const { result } = renderHook(() => useNavigation());

        act(() => {
            result.current.toggleSidebar(); // Open first
        });

        expect(result.current.isSidebarOpen).toBe(true);

        act(() => {
            result.current.closeSidebar();
        });

        expect(result.current.isSidebarOpen).toBe(false);
    });

    it('toggles sidebar collapse', () => {
        const { result } = renderHook(() => useNavigation());

        act(() => {
            result.current.toggleSidebarCollapse();
        });

        expect(result.current.isSidebarCollapsed).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('sidebar-collapsed', 'true');
    });

    it('opens and closes search modal', () => {
        const { result } = renderHook(() => useNavigation());

        act(() => {
            result.current.openSearchModal();
        });

        expect(result.current.isSearchModalOpen).toBe(true);

        act(() => {
            result.current.closeSearchModal();
        });

        expect(result.current.isSearchModalOpen).toBe(false);
    });

    it('updates current path when pathname changes', () => {
        const { result, rerender } = renderHook(() => useNavigation());

        expect(result.current.currentPath).toBe('/dashboard');

        (usePathname as jest.Mock).mockReturnValue('/projects');
        rerender();

        expect(result.current.currentPath).toBe('/projects');
    });

    it('identifies active routes correctly', () => {
        (usePathname as jest.Mock).mockReturnValue('/projects/search');
        const { result } = renderHook(() => useNavigation());

        expect(result.current.isActiveRoute('/projects')).toBe(true);
        expect(result.current.isActiveRoute('/bookmarks')).toBe(false);
    });

    it('handles dashboard route specially', () => {
        (usePathname as jest.Mock).mockReturnValue('/dashboard');
        const { result } = renderHook(() => useNavigation());

        expect(result.current.isActiveRoute('/dashboard')).toBe(true);

        (usePathname as jest.Mock).mockReturnValue('/');
        const { result: result2 } = renderHook(() => useNavigation());

        expect(result2.current.isActiveRoute('/dashboard')).toBe(true);
    });

    it('calculates sidebar width correctly', () => {
        const { result } = renderHook(() => useNavigation());

        // Default state (closed, not collapsed)
        expect(result.current.getSidebarWidth()).toBe(256);

        act(() => {
            result.current.toggleSidebarCollapse();
        });

        // Collapsed state
        expect(result.current.getSidebarWidth()).toBe(64);
    });

    it('handles mobile sidebar width', () => {
        // Mock mobile viewport
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 500,
        });

        const { result } = renderHook(() => useNavigation());

        // Sidebar closed on mobile should return 0
        expect(result.current.getSidebarWidth()).toBe(0);
    });

    it('handles keyboard shortcuts', () => {
        const { result } = renderHook(() => useNavigation());

        // Test Cmd+K
        act(() => {
            const event = new KeyboardEvent('keydown', {
                key: 'k',
                metaKey: true
            });
            document.dispatchEvent(event);
        });

        expect(result.current.isSearchModalOpen).toBe(true);

        // Test Escape
        act(() => {
            const event = new KeyboardEvent('keydown', {
                key: 'Escape'
            });
            document.dispatchEvent(event);
        });

        expect(result.current.isSearchModalOpen).toBe(false);
    });

    it('handles Ctrl+K shortcut', () => {
        const { result } = renderHook(() => useNavigation());

        act(() => {
            const event = new KeyboardEvent('keydown', {
                key: 'k',
                ctrlKey: true
            });
            document.dispatchEvent(event);
        });

        expect(result.current.isSearchModalOpen).toBe(true);
    });
});
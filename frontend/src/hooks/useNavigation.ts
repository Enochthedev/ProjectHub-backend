'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface NavigationState {
    isSidebarOpen: boolean;
    isSidebarCollapsed: boolean;
    isSearchModalOpen: boolean;
    currentPath: string;
}

export const useNavigation = () => {
    const pathname = usePathname();

    const [state, setState] = useState<NavigationState>({
        isSidebarOpen: false,
        isSidebarCollapsed: false,
        isSearchModalOpen: false,
        currentPath: pathname,
    });

    // Update current path when pathname changes
    useEffect(() => {
        setState(prev => ({ ...prev, currentPath: pathname }));
    }, [pathname]);

    // Load sidebar collapsed state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        if (saved) {
            setState(prev => ({
                ...prev,
                isSidebarCollapsed: JSON.parse(saved)
            }));
        }
    }, []);

    // Save sidebar collapsed state to localStorage
    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', JSON.stringify(state.isSidebarCollapsed));
    }, [state.isSidebarCollapsed]);

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+K or Ctrl+K to open search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setState(prev => ({ ...prev, isSearchModalOpen: true }));
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                setState(prev => ({
                    ...prev,
                    isSearchModalOpen: false,
                    isSidebarOpen: false
                }));
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setState(prev => ({ ...prev, isSidebarOpen: false }));
        }
    }, [pathname]);

    // Actions
    const toggleSidebar = () => {
        setState(prev => ({ ...prev, isSidebarOpen: !prev.isSidebarOpen }));
    };

    const closeSidebar = () => {
        setState(prev => ({ ...prev, isSidebarOpen: false }));
    };

    const toggleSidebarCollapse = () => {
        setState(prev => ({ ...prev, isSidebarCollapsed: !prev.isSidebarCollapsed }));
    };

    const openSearchModal = () => {
        setState(prev => ({ ...prev, isSearchModalOpen: true }));
    };

    const closeSearchModal = () => {
        setState(prev => ({ ...prev, isSearchModalOpen: false }));
    };

    // Utility functions
    const isActiveRoute = (href: string) => {
        if (href === '/dashboard') {
            return pathname === '/dashboard' || pathname === '/';
        }
        return pathname.startsWith(href);
    };

    const getSidebarWidth = () => {
        if (!state.isSidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024) {
            return 0;
        }
        return state.isSidebarCollapsed ? 64 : 256;
    };

    return {
        // State
        isSidebarOpen: state.isSidebarOpen,
        isSidebarCollapsed: state.isSidebarCollapsed,
        isSearchModalOpen: state.isSearchModalOpen,
        currentPath: state.currentPath,

        // Actions
        toggleSidebar,
        closeSidebar,
        toggleSidebarCollapse,
        openSearchModal,
        closeSearchModal,

        // Utilities
        isActiveRoute,
        getSidebarWidth,
    };
};
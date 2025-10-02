import { useEffect, useRef, useState, useCallback } from 'react';

// Hook for managing focus trap in modals and overlays
export const useFocusTrap = (isActive: boolean = false) => {
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const container = containerRef.current;
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        const handleTabKey = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement?.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement?.focus();
                    e.preventDefault();
                }
            }
        };

        // Focus first element when trap becomes active
        firstElement?.focus();

        document.addEventListener('keydown', handleTabKey);
        return () => document.removeEventListener('keydown', handleTabKey);
    }, [isActive]);

    return containerRef;
};

// Hook for keyboard navigation
export const useKeyboardNavigation = (
    items: string[],
    onSelect: (index: number) => void,
    isActive: boolean = true
) => {
    const [activeIndex, setActiveIndex] = useState(-1);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isActive) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % items.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + items.length) % items.length);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (activeIndex >= 0) {
                    onSelect(activeIndex);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setActiveIndex(-1);
                break;
        }
    }, [activeIndex, items.length, onSelect, isActive]);

    useEffect(() => {
        if (isActive) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [handleKeyDown, isActive]);

    return {
        activeIndex,
        setActiveIndex,
        resetActiveIndex: () => setActiveIndex(-1),
    };
};

// Hook for managing ARIA announcements
export const useAnnouncer = () => {
    const [announcement, setAnnouncement] = useState('');

    const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        setAnnouncement(''); // Clear first to ensure re-announcement
        setTimeout(() => setAnnouncement(message), 100);
    }, []);

    return { announce, announcement };
};

// Hook for managing skip links
export const useSkipLinks = () => {
    const skipLinksRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    const showSkipLinks = () => setIsVisible(true);
    const hideSkipLinks = () => setIsVisible(false);

    return { skipLinksRef, isVisible, showSkipLinks, hideSkipLinks };
};

// Hook for managing screen reader announcements for dynamic content
export const useScreenReaderAnnouncements = () => {
    const [liveRegion, setLiveRegion] = useState('');

    const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        setLiveRegion('');
        // Small delay to ensure the screen reader picks up the change
        setTimeout(() => setLiveRegion(message), 100);

        // Clear after announcement
        setTimeout(() => setLiveRegion(''), 1000);
    }, []);

    return { announceToScreenReader, liveRegion };
};

// Hook for detecting high contrast mode
export const useHighContrast = (): boolean => {
    const [isHighContrast, setIsHighContrast] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const checkHighContrast = () => {
            // Check for Windows high contrast mode
            const mediaQuery = window.matchMedia('(prefers-contrast: high)');
            setIsHighContrast(mediaQuery.matches);
        };

        checkHighContrast();

        const mediaQuery = window.matchMedia('(prefers-contrast: high)');
        const handleChange = (event: MediaQueryListEvent) => {
            setIsHighContrast(event.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return isHighContrast;
};
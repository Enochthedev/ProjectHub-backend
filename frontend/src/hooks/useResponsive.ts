'use client';

import { useState, useEffect } from 'react';

export interface BreakpointConfig {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
}

const defaultBreakpoints: BreakpointConfig = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
};

export type Breakpoint = keyof BreakpointConfig;

export interface ResponsiveState {
    width: number;
    height: number;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLargeDesktop: boolean;
    currentBreakpoint: Breakpoint;
    isAbove: (breakpoint: Breakpoint) => boolean;
    isBelow: (breakpoint: Breakpoint) => boolean;
    isBetween: (min: Breakpoint, max: Breakpoint) => boolean;
}

export const useResponsive = (breakpoints: BreakpointConfig = defaultBreakpoints): ResponsiveState => {
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 1024,
        height: typeof window !== 'undefined' ? window.innerHeight : 768,
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Call handler right away so state gets updated with initial window size
        handleResize();

        // Remove event listener on cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getCurrentBreakpoint = (): Breakpoint => {
        const { width } = windowSize;

        if (width >= breakpoints['2xl']) return '2xl';
        if (width >= breakpoints.xl) return 'xl';
        if (width >= breakpoints.lg) return 'lg';
        if (width >= breakpoints.md) return 'md';
        if (width >= breakpoints.sm) return 'sm';
        return 'sm';
    };

    const isAbove = (breakpoint: Breakpoint): boolean => {
        return windowSize.width >= breakpoints[breakpoint];
    };

    const isBelow = (breakpoint: Breakpoint): boolean => {
        return windowSize.width < breakpoints[breakpoint];
    };

    const isBetween = (min: Breakpoint, max: Breakpoint): boolean => {
        return windowSize.width >= breakpoints[min] && windowSize.width < breakpoints[max];
    };

    return {
        width: windowSize.width,
        height: windowSize.height,
        isMobile: windowSize.width < breakpoints.md,
        isTablet: windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg,
        isDesktop: windowSize.width >= breakpoints.lg,
        isLargeDesktop: windowSize.width >= breakpoints.xl,
        currentBreakpoint: getCurrentBreakpoint(),
        isAbove,
        isBelow,
        isBetween,
    };
};

// Hook for detecting touch devices
export const useTouchDevice = (): boolean => {
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const checkTouchDevice = () => {
            setIsTouchDevice(
                'ontouchstart' in window ||
                navigator.maxTouchPoints > 0 ||
                // @ts-ignore
                navigator.msMaxTouchPoints > 0
            );
        };

        checkTouchDevice();
    }, []);

    return isTouchDevice;
};

// Hook for detecting reduced motion preference
export const useReducedMotion = (): boolean => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handleChange = (event: MediaQueryListEvent) => {
            setPrefersReducedMotion(event.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return prefersReducedMotion;
};
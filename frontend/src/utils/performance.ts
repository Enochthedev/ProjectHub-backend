/**
 * Performance monitoring and optimization utilities
 */
import React from 'react';

/**
 * Performance metrics collection
 */
export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private metrics: Map<string, number> = new Map();

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    /**
     * Mark the start of a performance measurement
     */
    markStart(name: string): void {
        if (typeof window !== 'undefined' && window.performance) {
            window.performance.mark(`${name}-start`);
        }
    }

    /**
     * Mark the end of a performance measurement and calculate duration
     */
    markEnd(name: string): number {
        if (typeof window !== 'undefined' && window.performance) {
            window.performance.mark(`${name}-end`);
            window.performance.measure(name, `${name}-start`, `${name}-end`);

            const measure = window.performance.getEntriesByName(name)[0];
            const duration = measure?.duration || 0;

            this.metrics.set(name, duration);
            return duration;
        }
        return 0;
    }

    /**
     * Get all collected metrics
     */
    getMetrics(): Record<string, number> {
        return Object.fromEntries(this.metrics);
    }

    /**
     * Clear all metrics
     */
    clearMetrics(): void {
        this.metrics.clear();
        if (typeof window !== 'undefined' && window.performance) {
            window.performance.clearMarks();
            window.performance.clearMeasures();
        }
    }

    /**
     * Log performance metrics to console (development only)
     */
    logMetrics(): void {
        if (process.env.NODE_ENV === 'development') {
            console.group('Performance Metrics');
            this.metrics.forEach((duration, name) => {
                console.log(`${name}: ${duration.toFixed(2)}ms`);
            });
            console.groupEnd();
        }
    }
}

/**
 * Higher-order component for measuring component render performance
 */
export function withPerformanceMonitoring<P extends object>(
    Component: React.ComponentType<P>,
    componentName: string
) {
    return function PerformanceMonitoredComponent(props: P) {
        const monitor = PerformanceMonitor.getInstance();

        React.useEffect(() => {
            monitor.markStart(`${componentName}-render`);
            return () => {
                monitor.markEnd(`${componentName}-render`);
            };
        }, []);

        return React.createElement(Component, props);
    };
}

/**
 * Hook for measuring custom performance metrics
 */
export function usePerformanceMetric(name: string) {
    const monitor = PerformanceMonitor.getInstance();

    const startMeasurement = React.useCallback(() => {
        monitor.markStart(name);
    }, [name, monitor]);

    const endMeasurement = React.useCallback(() => {
        return monitor.markEnd(name);
    }, [name, monitor]);

    return { startMeasurement, endMeasurement };
}

/**
 * Web Vitals monitoring
 */
export function reportWebVitals(metric: any) {
    if (process.env.NODE_ENV === 'production') {
        // In production, send to analytics service
        console.log(metric);

        // Example: Send to Google Analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', metric.name, {
                event_category: 'Web Vitals',
                value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
                event_label: metric.id,
                non_interaction: true,
            });
        }
    } else {
        // In development, log to console
        console.log('Web Vital:', metric);
    }
}

/**
 * Bundle size monitoring
 */
export function logBundleSize() {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        // Log initial bundle size information
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navigationEntry) {
            console.group('Bundle Performance');
            console.log('DOM Content Loaded:', navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart, 'ms');
            console.log('Load Complete:', navigationEntry.loadEventEnd - navigationEntry.loadEventStart, 'ms');
            console.log('Total Load Time:', navigationEntry.loadEventEnd - navigationEntry.fetchStart, 'ms');
            console.groupEnd();
        }
    }
}

/**
 * Memory usage monitoring
 */
export function monitorMemoryUsage() {
    if (typeof window !== 'undefined' && (performance as any).memory) {
        const memory = (performance as any).memory;

        return {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        };
    }

    return null;
}

/**
 * Image loading performance optimization
 */
export function preloadCriticalImages(imageUrls: string[]) {
    if (typeof window !== 'undefined') {
        imageUrls.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = url;
            document.head.appendChild(link);
        });
    }
}

/**
 * Resource hints for performance
 */
export function addResourceHints(domains: string[]) {
    if (typeof window !== 'undefined') {
        domains.forEach(domain => {
            // DNS prefetch
            const dnsPrefetch = document.createElement('link');
            dnsPrefetch.rel = 'dns-prefetch';
            dnsPrefetch.href = `//${domain}`;
            document.head.appendChild(dnsPrefetch);

            // Preconnect for critical domains
            const preconnect = document.createElement('link');
            preconnect.rel = 'preconnect';
            preconnect.href = `https://${domain}`;
            document.head.appendChild(preconnect);
        });
    }
}
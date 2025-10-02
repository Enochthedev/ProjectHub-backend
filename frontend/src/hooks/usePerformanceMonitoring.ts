/**
 * Hook for performance monitoring and optimization
 */
import { useEffect, useCallback, useRef } from 'react';
import { PerformanceMonitor, reportWebVitals, monitorMemoryUsage } from '@/utils/performance';

interface PerformanceConfig {
    enableWebVitals?: boolean;
    enableMemoryMonitoring?: boolean;
    memoryThreshold?: number; // Percentage
    reportInterval?: number; // milliseconds
}

export function usePerformanceMonitoring(config: PerformanceConfig = {}) {
    const {
        enableWebVitals = true,
        enableMemoryMonitoring = true,
        memoryThreshold = 80,
        reportInterval = 30000, // 30 seconds
    } = config;

    const monitor = PerformanceMonitor.getInstance();
    const intervalRef = useRef<NodeJS.Timeout>();

    // Web Vitals monitoring
    useEffect(() => {
        if (enableWebVitals && typeof window !== 'undefined') {
            // Dynamic import to avoid SSR issues
            import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
                getCLS(reportWebVitals);
                getFID(reportWebVitals);
                getFCP(reportWebVitals);
                getLCP(reportWebVitals);
                getTTFB(reportWebVitals);
            }).catch(() => {
                // Fallback if web-vitals is not available
                console.warn('Web Vitals library not available');
            });
        }
    }, [enableWebVitals]);

    // Memory monitoring
    useEffect(() => {
        if (enableMemoryMonitoring && typeof window !== 'undefined') {
            intervalRef.current = setInterval(() => {
                const memoryInfo = monitorMemoryUsage();

                if (memoryInfo && memoryInfo.usagePercentage > memoryThreshold) {
                    console.warn(`Memory usage high: ${memoryInfo.usagePercentage.toFixed(2)}%`);

                    // Trigger garbage collection if available (Chrome DevTools)
                    if ((window as any).gc) {
                        (window as any).gc();
                    }
                }
            }, reportInterval);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [enableMemoryMonitoring, memoryThreshold, reportInterval]);

    // Performance measurement utilities
    const measureOperation = useCallback((name: string, operation: () => void | Promise<void>) => {
        monitor.markStart(name);

        const result = operation();

        if (result instanceof Promise) {
            return result.finally(() => {
                monitor.markEnd(name);
            });
        } else {
            monitor.markEnd(name);
            return result;
        }
    }, [monitor]);

    const measureAsyncOperation = useCallback(async (name: string, operation: () => Promise<any>) => {
        monitor.markStart(name);
        try {
            const result = await operation();
            return result;
        } finally {
            monitor.markEnd(name);
        }
    }, [monitor]);

    const getMetrics = useCallback(() => {
        return monitor.getMetrics();
    }, [monitor]);

    const clearMetrics = useCallback(() => {
        monitor.clearMetrics();
    }, [monitor]);

    return {
        measureOperation,
        measureAsyncOperation,
        getMetrics,
        clearMetrics,
    };
}

/**
 * Hook for component-specific performance monitoring
 */
export function useComponentPerformance(componentName: string) {
    const monitor = PerformanceMonitor.getInstance();

    useEffect(() => {
        monitor.markStart(`${componentName}-mount`);

        return () => {
            monitor.markEnd(`${componentName}-mount`);
        };
    }, [componentName, monitor]);

    const measureRender = useCallback((renderName: string = 'render') => {
        const fullName = `${componentName}-${renderName}`;
        monitor.markStart(fullName);

        return () => {
            monitor.markEnd(fullName);
        };
    }, [componentName, monitor]);

    return { measureRender };
}

/**
 * Hook for API call performance monitoring
 */
export function useAPIPerformance() {
    const monitor = PerformanceMonitor.getInstance();

    const measureAPICall = useCallback(async (
        endpoint: string,
        apiCall: () => Promise<any>
    ) => {
        const metricName = `api-${endpoint.replace(/[^a-zA-Z0-9]/g, '-')}`;

        monitor.markStart(metricName);

        try {
            const result = await apiCall();
            return result;
        } catch (error) {
            // Log API errors for performance analysis
            console.error(`API call failed: ${endpoint}`, error);
            throw error;
        } finally {
            monitor.markEnd(metricName);
        }
    }, [monitor]);

    return { measureAPICall };
}

/**
 * Hook for scroll performance optimization
 */
export function useScrollPerformance(threshold: number = 100) {
    const lastScrollTime = useRef(0);
    const isScrolling = useRef(false);

    const optimizedScrollHandler = useCallback((handler: (event: Event) => void) => {
        return (event: Event) => {
            const now = Date.now();

            if (now - lastScrollTime.current < threshold) {
                return;
            }

            lastScrollTime.current = now;

            if (!isScrolling.current) {
                isScrolling.current = true;
                requestAnimationFrame(() => {
                    handler(event);
                    isScrolling.current = false;
                });
            }
        };
    }, [threshold]);

    return { optimizedScrollHandler };
}
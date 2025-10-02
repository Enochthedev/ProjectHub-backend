// Performance monitoring and optimization utilities

export interface PerformanceMetrics {
    fcp: number; // First Contentful Paint
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    ttfb: number; // Time to First Byte
}

export interface BundleAnalysis {
    totalSize: number;
    gzippedSize: number;
    chunks: Array<{
        name: string;
        size: number;
        gzippedSize: number;
    }>;
}

// Web Vitals monitoring
export const measureWebVitals = (): Promise<PerformanceMetrics> => {
    return new Promise((resolve) => {
        const metrics: Partial<PerformanceMetrics> = {};

        // First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
            if (fcp) {
                metrics.fcp = fcp.startTime;
                fcpObserver.disconnect();
            }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            metrics.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fid = entries[0];
            metrics.fid = fid.processingStart - fid.startTime;
            fidObserver.disconnect();
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!(entry as any).hadRecentInput) {
                    clsValue += (entry as any).value;
                }
            }
            metrics.cls = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // Time to First Byte
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationEntry) {
            metrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        }

        // Resolve after a delay to collect metrics
        setTimeout(() => {
            resolve(metrics as PerformanceMetrics);
        }, 3000);
    });
};

// Bundle size analysis
export const analyzeBundleSize = async (): Promise<BundleAnalysis> => {
    try {
        const response = await fetch('/_next/static/chunks/webpack-runtime.js');
        const content = await response.text();

        // Extract chunk information from webpack runtime
        const chunkRegex = /\{([^}]+)\}/g;
        const matches = content.match(chunkRegex) || [];

        const chunks = matches.map((match, index) => ({
            name: `chunk-${index}`,
            size: match.length,
            gzippedSize: Math.round(match.length * 0.3), // Estimated gzip ratio
        }));

        const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
        const gzippedSize = chunks.reduce((sum, chunk) => sum + chunk.gzippedSize, 0);

        return {
            totalSize,
            gzippedSize,
            chunks,
        };
    } catch (error) {
        console.error('Bundle analysis failed:', error);
        return {
            totalSize: 0,
            gzippedSize: 0,
            chunks: [],
        };
    }
};

// Performance budget checker
export const checkPerformanceBudget = (metrics: PerformanceMetrics): {
    passed: boolean;
    violations: string[];
} => {
    const violations: string[] = [];

    // Performance budgets based on Core Web Vitals
    if (metrics.fcp > 1800) {
        violations.push(`FCP too slow: ${metrics.fcp}ms (should be < 1800ms)`);
    }

    if (metrics.lcp > 2500) {
        violations.push(`LCP too slow: ${metrics.lcp}ms (should be < 2500ms)`);
    }

    if (metrics.fid > 100) {
        violations.push(`FID too slow: ${metrics.fid}ms (should be < 100ms)`);
    }

    if (metrics.cls > 0.1) {
        violations.push(`CLS too high: ${metrics.cls} (should be < 0.1)`);
    }

    if (metrics.ttfb > 800) {
        violations.push(`TTFB too slow: ${metrics.ttfb}ms (should be < 800ms)`);
    }

    return {
        passed: violations.length === 0,
        violations,
    };
};

// Resource loading optimization
export const preloadCriticalResources = () => {
    const criticalResources = [
        '/fonts/inter-var.woff2',
        '/_next/static/css/app.css',
    ];

    criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource;

        if (resource.endsWith('.woff2')) {
            link.as = 'font';
            link.type = 'font/woff2';
            link.crossOrigin = 'anonymous';
        } else if (resource.endsWith('.css')) {
            link.as = 'style';
        }

        document.head.appendChild(link);
    });
};

// Lazy loading utility
export const createIntersectionObserver = (
    callback: (entries: IntersectionObserverEntry[]) => void,
    options: IntersectionObserverInit = {}
): IntersectionObserver => {
    const defaultOptions: IntersectionObserverInit = {
        root: null,
        rootMargin: '50px',
        threshold: 0.1,
        ...options,
    };

    return new IntersectionObserver(callback, defaultOptions);
};

// Memory usage monitoring
export const monitorMemoryUsage = (): {
    used: number;
    total: number;
    percentage: number;
} => {
    if ('memory' in performance) {
        const memory = (performance as any).memory;
        return {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
        };
    }

    return {
        used: 0,
        total: 0,
        percentage: 0,
    };
};

// Performance reporting
export const reportPerformanceMetrics = async (metrics: PerformanceMetrics) => {
    try {
        await fetch('/api/analytics/performance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                metrics,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                url: window.location.href,
            }),
        });
    } catch (error) {
        console.error('Failed to report performance metrics:', error);
    }
};

// Image optimization helper
export const optimizeImageLoading = () => {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = createIntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target as HTMLImageElement;
                const src = img.dataset.src;

                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
};

// Critical CSS inlining
export const inlineCriticalCSS = (css: string) => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
};

// Service Worker registration for caching
export const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);
            return registration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            return null;
        }
    }
    return null;
};
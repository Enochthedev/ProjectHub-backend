/**
 * Error tracking and performance monitoring utilities
 */

interface ErrorReport {
    message: string;
    stack?: string;
    url: string;
    lineNumber?: number;
    columnNumber?: number;
    userAgent: string;
    timestamp: string;
    userId?: string;
    sessionId: string;
    buildVersion?: string;
}

interface PerformanceMetric {
    name: string;
    value: number;
    timestamp: string;
    url: string;
    userId?: string;
    sessionId: string;
}

class MonitoringService {
    private sessionId: string;
    private userId?: string;
    private buildVersion?: string;
    private errorQueue: ErrorReport[] = [];
    private metricsQueue: PerformanceMetric[] = [];
    private isOnline = navigator.onLine;

    constructor() {
        this.sessionId = this.generateSessionId();
        this.buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION;
        this.setupErrorHandlers();
        this.setupPerformanceMonitoring();
        this.setupNetworkMonitoring();
    }

    private generateSessionId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    setUserId(userId: string) {
        this.userId = userId;
    }

    private setupErrorHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.reportError({
                message: event.message,
                stack: event.error?.stack,
                url: event.filename || window.location.href,
                lineNumber: event.lineno,
                columnNumber: event.colno,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                userId: this.userId,
                sessionId: this.sessionId,
                buildVersion: this.buildVersion,
            });
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.reportError({
                message: `Unhandled Promise Rejection: ${event.reason}`,
                stack: event.reason?.stack,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                userId: this.userId,
                sessionId: this.sessionId,
                buildVersion: this.buildVersion,
            });
        });

        // React error boundary integration
        window.addEventListener('react-error', ((event: CustomEvent) => {
            this.reportError({
                message: event.detail.message,
                stack: event.detail.stack,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                userId: this.userId,
                sessionId: this.sessionId,
                buildVersion: this.buildVersion,
            });
        }) as EventListener);
    }

    private setupPerformanceMonitoring() {
        // Core Web Vitals monitoring
        if ('PerformanceObserver' in window) {
            // First Contentful Paint
            new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.name === 'first-contentful-paint') {
                        this.reportMetric({
                            name: 'first-contentful-paint',
                            value: entry.startTime,
                            timestamp: new Date().toISOString(),
                            url: window.location.href,
                            userId: this.userId,
                            sessionId: this.sessionId,
                        });
                    }
                }
            }).observe({ entryTypes: ['paint'] });

            // Largest Contentful Paint
            new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.reportMetric({
                    name: 'largest-contentful-paint',
                    value: lastEntry.startTime,
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    userId: this.userId,
                    sessionId: this.sessionId,
                });
            }).observe({ entryTypes: ['largest-contentful-paint'] });

            // Cumulative Layout Shift
            let clsValue = 0;
            new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!(entry as any).hadRecentInput) {
                        clsValue += (entry as any).value;
                    }
                }
                this.reportMetric({
                    name: 'cumulative-layout-shift',
                    value: clsValue,
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    userId: this.userId,
                    sessionId: this.sessionId,
                });
            }).observe({ entryTypes: ['layout-shift'] });

            // First Input Delay
            new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.reportMetric({
                        name: 'first-input-delay',
                        value: (entry as any).processingStart - entry.startTime,
                        timestamp: new Date().toISOString(),
                        url: window.location.href,
                        userId: this.userId,
                        sessionId: this.sessionId,
                    });
                }
            }).observe({ entryTypes: ['first-input'] });
        }

        // Navigation timing
        window.addEventListener('load', () => {
            setTimeout(() => {
                const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

                this.reportMetric({
                    name: 'page-load-time',
                    value: navigation.loadEventEnd - navigation.fetchStart,
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    userId: this.userId,
                    sessionId: this.sessionId,
                });

                this.reportMetric({
                    name: 'dom-content-loaded',
                    value: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    userId: this.userId,
                    sessionId: this.sessionId,
                });
            }, 0);
        });
    }

    private setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.flushQueues();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    reportError(error: ErrorReport) {
        console.error('Error reported:', error);

        if (this.isOnline) {
            this.sendErrorReport(error);
        } else {
            this.errorQueue.push(error);
        }
    }

    reportMetric(metric: PerformanceMetric) {
        if (this.isOnline) {
            this.sendMetricReport(metric);
        } else {
            this.metricsQueue.push(metric);
        }
    }

    private async sendErrorReport(error: ErrorReport) {
        try {
            await fetch('/api/monitoring/errors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(error),
            });
        } catch (err) {
            console.error('Failed to send error report:', err);
            this.errorQueue.push(error);
        }
    }

    private async sendMetricReport(metric: PerformanceMetric) {
        try {
            await fetch('/api/monitoring/metrics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(metric),
            });
        } catch (err) {
            console.error('Failed to send metric report:', err);
            this.metricsQueue.push(metric);
        }
    }

    private async flushQueues() {
        // Send queued errors
        const errors = [...this.errorQueue];
        this.errorQueue = [];

        for (const error of errors) {
            await this.sendErrorReport(error);
        }

        // Send queued metrics
        const metrics = [...this.metricsQueue];
        this.metricsQueue = [];

        for (const metric of metrics) {
            await this.sendMetricReport(metric);
        }
    }

    // Manual error reporting for caught exceptions
    captureException(error: Error, context?: Record<string, any>) {
        this.reportError({
            message: error.message,
            stack: error.stack,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            userId: this.userId,
            sessionId: this.sessionId,
            buildVersion: this.buildVersion,
            ...context,
        });
    }

    // Manual performance tracking
    startTransaction(name: string) {
        const startTime = performance.now();

        return {
            finish: () => {
                const duration = performance.now() - startTime;
                this.reportMetric({
                    name: `transaction-${name}`,
                    value: duration,
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    userId: this.userId,
                    sessionId: this.sessionId,
                });
            }
        };
    }

    // User interaction tracking
    trackUserAction(action: string, properties?: Record<string, any>) {
        this.reportMetric({
            name: `user-action-${action}`,
            value: 1,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userId: this.userId,
            sessionId: this.sessionId,
            ...properties,
        });
    }
}

// Global monitoring instance
export const monitoring = new MonitoringService();

// React Error Boundary helper
export class ErrorBoundary extends React.Component<
    { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
    { hasError: boolean; error?: Error }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Report to monitoring service
        window.dispatchEvent(new CustomEvent('react-error', {
            detail: {
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
            }
        }));
    }

    render() {
        if (this.state.hasError) {
            const FallbackComponent = this.props.fallback || DefaultErrorFallback;
            return <FallbackComponent error={ this.state.error! } />;
        }

        return this.props.children;
    }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
    <div className= "min-h-screen flex items-center justify-center bg-gray-50" >
    <div className="max-w-md w-full bg-white border-2 border-black p-6" >
        <h1 className="text-xl font-bold mb-4" > Something went wrong < /h1>
            < p className = "text-gray-600 mb-4" >
                We're sorry, but something unexpected happened. Please try refreshing the page.
                    < /p>
                    < button
onClick = {() => window.location.reload()}
className = "w-full bg-black text-white py-2 px-4 border-2 border-black hover:bg-white hover:text-black transition-colors"
    >
    Refresh Page
        < /button>
{
    process.env.NODE_ENV === 'development' && (
        <details className="mt-4" >
            <summary className="cursor-pointer text-sm text-gray-500" > Error Details < /summary>
                < pre className = "mt-2 text-xs text-red-600 overflow-auto" >
                    { error.message }
    { error.stack }
    </pre>
        < /details>
      )
}
</div>
    < /div>
);

export default monitoring;
/**
 * Analytics and Usage Tracking
 * 
 * This module provides comprehensive analytics tracking for user interactions,
 * performance metrics, and business intelligence.
 */

import { config, features } from '../../config/environment';

// Analytics providers
type AnalyticsProvider = 'google' | 'mixpanel' | 'custom' | 'none';

interface AnalyticsEvent {
    name: string;
    properties?: Record<string, any>;
    userId?: string;
    timestamp?: number;
}

interface PageViewEvent {
    page: string;
    title?: string;
    userId?: string;
    referrer?: string;
    timestamp?: number;
}

interface UserProperties {
    userId: string;
    role: 'student' | 'supervisor' | 'admin';
    email?: string;
    name?: string;
    specialization?: string;
    registrationDate?: string;
    lastActiveDate?: string;
}

interface PerformanceMetrics {
    pageLoadTime: number;
    domContentLoaded: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;
    timeToInteractive: number;
}

/**
 * Analytics Manager Class
 */
class AnalyticsManager {
    private providers: Set<AnalyticsProvider> = new Set();
    private userId: string | null = null;
    private userProperties: Partial<UserProperties> = {};
    private sessionId: string;
    private isInitialized = false;

    constructor() {
        this.sessionId = this.generateSessionId();

        if (typeof window !== 'undefined') {
            this.initializeProviders();
        }
    }

    /**
     * Initialize analytics providers
     */
    private async initializeProviders(): Promise<void> {
        if (!features.analytics) {
            this.providers.add('none');
            return;
        }

        try {
            // Initialize Google Analytics
            if (config.GOOGLE_ANALYTICS_ID) {
                await this.initializeGoogleAnalytics();
                this.providers.add('google');
            }

            // Initialize Mixpanel
            if (config.MIXPANEL_TOKEN) {
                await this.initializeMixpanel();
                this.providers.add('mixpanel');
            }

            // Initialize custom analytics
            await this.initializeCustomAnalytics();
            this.providers.add('custom');

            this.isInitialized = true;

            // Track initialization
            this.track('analytics_initialized', {
                providers: Array.from(this.providers),
                sessionId: this.sessionId,
            });
        } catch (error) {
            console.error('Failed to initialize analytics:', error);
            this.providers.add('none');
        }
    }

    /**
     * Initialize Google Analytics
     */
    private async initializeGoogleAnalytics(): Promise<void> {
        if (!config.GOOGLE_ANALYTICS_ID) return;

        // Load Google Analytics script
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${config.GOOGLE_ANALYTICS_ID}`;
        document.head.appendChild(script);

        // Initialize gtag
        window.dataLayer = window.dataLayer || [];
        function gtag(...args: any[]) {
            window.dataLayer.push(args);
        }

        gtag('js', new Date());
        gtag('config', config.GOOGLE_ANALYTICS_ID, {
            page_title: document.title,
            page_location: window.location.href,
            custom_map: {
                custom_parameter_1: 'user_role',
                custom_parameter_2: 'session_id',
            },
        });

        // Store gtag function globally
        (window as any).gtag = gtag;
    }

    /**
     * Initialize Mixpanel
     */
    private async initializeMixpanel(): Promise<void> {
        if (!config.MIXPANEL_TOKEN) return;

        // Load Mixpanel script
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';

        return new Promise((resolve, reject) => {
            script.onload = () => {
                try {
                    (window as any).mixpanel.init(config.MIXPANEL_TOKEN, {
                        debug: config.DEBUG_MODE,
                        track_pageview: false, // We'll handle this manually
                        persistence: 'localStorage',
                    });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize custom analytics
     */
    private async initializeCustomAnalytics(): Promise<void> {
        // Custom analytics implementation
        // This could send data to your own analytics endpoint
        console.log('Custom analytics initialized');
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Set user identity
     */
    identify(userId: string, properties: Partial<UserProperties> = {}): void {
        this.userId = userId;
        this.userProperties = { ...this.userProperties, ...properties, userId };

        if (!this.isInitialized) return;

        // Google Analytics
        if (this.providers.has('google') && (window as any).gtag) {
            (window as any).gtag('config', config.GOOGLE_ANALYTICS_ID, {
                user_id: userId,
                custom_map: {
                    user_role: properties.role,
                    user_specialization: properties.specialization,
                },
            });
        }

        // Mixpanel
        if (this.providers.has('mixpanel') && (window as any).mixpanel) {
            (window as any).mixpanel.identify(userId);
            (window as any).mixpanel.people.set(properties);
        }

        // Custom analytics
        if (this.providers.has('custom')) {
            this.sendToCustomAnalytics('identify', { userId, properties });
        }
    }

    /**
     * Track page view
     */
    pageView(event: PageViewEvent): void {
        const pageViewData = {
            ...event,
            sessionId: this.sessionId,
            userId: this.userId || event.userId,
            timestamp: event.timestamp || Date.now(),
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
            },
        };

        if (!this.isInitialized) {
            // Queue for later if not initialized
            setTimeout(() => this.pageView(event), 1000);
            return;
        }

        // Google Analytics
        if (this.providers.has('google') && (window as any).gtag) {
            (window as any).gtag('config', config.GOOGLE_ANALYTICS_ID, {
                page_title: event.title || document.title,
                page_location: window.location.href,
            });
        }

        // Mixpanel
        if (this.providers.has('mixpanel') && (window as any).mixpanel) {
            (window as any).mixpanel.track('Page View', pageViewData);
        }

        // Custom analytics
        if (this.providers.has('custom')) {
            this.sendToCustomAnalytics('pageView', pageViewData);
        }

        // Send to metrics endpoint
        this.sendToMetricsEndpoint('pageView', pageViewData);
    }

    /**
     * Track custom event
     */
    track(eventName: string, properties: Record<string, any> = {}): void {
        const eventData = {
            name: eventName,
            properties: {
                ...properties,
                sessionId: this.sessionId,
                userId: this.userId,
                timestamp: Date.now(),
                page: window.location.pathname,
                userRole: this.userProperties.role,
            },
        };

        if (!this.isInitialized) {
            // Queue for later if not initialized
            setTimeout(() => this.track(eventName, properties), 1000);
            return;
        }

        // Google Analytics
        if (this.providers.has('google') && (window as any).gtag) {
            (window as any).gtag('event', eventName, {
                event_category: properties.category || 'User Interaction',
                event_label: properties.label,
                value: properties.value,
                custom_parameter_1: this.userProperties.role,
                custom_parameter_2: this.sessionId,
            });
        }

        // Mixpanel
        if (this.providers.has('mixpanel') && (window as any).mixpanel) {
            (window as any).mixpanel.track(eventName, eventData.properties);
        }

        // Custom analytics
        if (this.providers.has('custom')) {
            this.sendToCustomAnalytics('track', eventData);
        }

        // Send to metrics endpoint
        this.sendToMetricsEndpoint('track', eventData);
    }

    /**
     * Track performance metrics
     */
    trackPerformance(metrics: Partial<PerformanceMetrics>): void {
        const performanceData = {
            ...metrics,
            sessionId: this.sessionId,
            userId: this.userId,
            timestamp: Date.now(),
            page: window.location.pathname,
            connection: (navigator as any).connection?.effectiveType || 'unknown',
        };

        // Google Analytics
        if (this.providers.has('google') && (window as any).gtag) {
            Object.entries(metrics).forEach(([key, value]) => {
                (window as any).gtag('event', 'timing_complete', {
                    name: key,
                    value: Math.round(value),
                });
            });
        }

        // Mixpanel
        if (this.providers.has('mixpanel') && (window as any).mixpanel) {
            (window as any).mixpanel.track('Performance Metrics', performanceData);
        }

        // Custom analytics
        if (this.providers.has('custom')) {
            this.sendToCustomAnalytics('performance', performanceData);
        }
    }

    /**
     * Track error
     */
    trackError(error: Error, context: Record<string, any> = {}): void {
        const errorData = {
            message: error.message,
            stack: error.stack,
            name: error.name,
            context,
            sessionId: this.sessionId,
            userId: this.userId,
            timestamp: Date.now(),
            page: window.location.pathname,
            userAgent: navigator.userAgent,
        };

        // Google Analytics
        if (this.providers.has('google') && (window as any).gtag) {
            (window as any).gtag('event', 'exception', {
                description: error.message,
                fatal: false,
            });
        }

        // Mixpanel
        if (this.providers.has('mixpanel') && (window as any).mixpanel) {
            (window as any).mixpanel.track('Error', errorData);
        }

        // Custom analytics
        if (this.providers.has('custom')) {
            this.sendToCustomAnalytics('error', errorData);
        }

        // Send to metrics endpoint
        this.sendToMetricsEndpoint('error', errorData);
    }

    /**
     * Send data to custom analytics endpoint
     */
    private async sendToCustomAnalytics(type: string, data: any): Promise<void> {
        try {
            await fetch('/api/analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type, data }),
            });
        } catch (error) {
            console.error('Failed to send custom analytics:', error);
        }
    }

    /**
     * Send data to metrics endpoint
     */
    private async sendToMetricsEndpoint(type: string, data: any): Promise<void> {
        try {
            await fetch('/api/metrics/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type, data }),
            });
        } catch (error) {
            console.error('Failed to send metrics:', error);
        }
    }

    /**
     * Get session information
     */
    getSession(): { sessionId: string; userId: string | null; userProperties: Partial<UserProperties> } {
        return {
            sessionId: this.sessionId,
            userId: this.userId,
            userProperties: this.userProperties,
        };
    }

    /**
     * Reset analytics (e.g., on logout)
     */
    reset(): void {
        this.userId = null;
        this.userProperties = {};
        this.sessionId = this.generateSessionId();

        // Mixpanel
        if (this.providers.has('mixpanel') && (window as any).mixpanel) {
            (window as any).mixpanel.reset();
        }
    }
}

// Create singleton instance
export const analytics = new AnalyticsManager();

/**
 * Web Vitals tracking
 */
export function trackWebVitals(): void {
    if (!features.webVitals || typeof window === 'undefined') return;

    // Track Core Web Vitals
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS((metric) => {
            analytics.trackPerformance({
                cumulativeLayoutShift: metric.value,
            });
        });

        getFID((metric) => {
            analytics.trackPerformance({
                firstInputDelay: metric.value,
            });
        });

        getFCP((metric) => {
            analytics.trackPerformance({
                firstContentfulPaint: metric.value,
            });
        });

        getLCP((metric) => {
            analytics.trackPerformance({
                largestContentfulPaint: metric.value,
            });
        });

        getTTFB((metric) => {
            analytics.trackPerformance({
                timeToInteractive: metric.value,
            });
        });
    });

    // Track page load performance
    window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navigation) {
            analytics.trackPerformance({
                pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            });
        }
    });
}

/**
 * Track user interactions
 */
export function trackUserInteraction(element: HTMLElement, action: string): void {
    const elementInfo = {
        tagName: element.tagName.toLowerCase(),
        className: element.className,
        id: element.id,
        textContent: element.textContent?.slice(0, 100),
    };

    analytics.track('user_interaction', {
        action,
        element: elementInfo,
        category: 'UI Interaction',
    });
}

/**
 * Track feature usage
 */
export const trackFeature = {
    projectSearch: (query: string, filters: any) => {
        analytics.track('project_search', {
            query: query.slice(0, 100), // Limit query length for privacy
            filterCount: Object.keys(filters).length,
            category: 'Feature Usage',
        });
    },

    projectView: (projectId: string, source: string) => {
        analytics.track('project_view', {
            projectId,
            source,
            category: 'Feature Usage',
        });
    },

    projectBookmark: (projectId: string, action: 'add' | 'remove') => {
        analytics.track('project_bookmark', {
            projectId,
            action,
            category: 'Feature Usage',
        });
    },

    aiAssistant: (action: 'message_sent' | 'conversation_started' | 'response_rated', metadata?: any) => {
        analytics.track('ai_assistant', {
            action,
            ...metadata,
            category: 'AI Usage',
        });
    },

    milestoneUpdate: (milestoneId: string, status: string) => {
        analytics.track('milestone_update', {
            milestoneId,
            status,
            category: 'Project Management',
        });
    },

    userRegistration: (role: string, method: string) => {
        analytics.track('user_registration', {
            role,
            method,
            category: 'User Lifecycle',
        });
    },

    userLogin: (method: string) => {
        analytics.track('user_login', {
            method,
            category: 'User Lifecycle',
        });
    },
};

/**
 * React hook for analytics
 */
export function useAnalytics() {
    return {
        identify: analytics.identify.bind(analytics),
        track: analytics.track.bind(analytics),
        pageView: analytics.pageView.bind(analytics),
        trackError: analytics.trackError.bind(analytics),
        trackPerformance: analytics.trackPerformance.bind(analytics),
        getSession: analytics.getSession.bind(analytics),
        reset: analytics.reset.bind(analytics),
        trackFeature,
    };
}

// Global error tracking
if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
        analytics.trackError(new Error(event.message), {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        analytics.trackError(new Error(event.reason), {
            type: 'unhandledrejection',
        });
    });
}

export default analytics;
import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/environment';

/**
 * Analytics API endpoint for collecting custom analytics data
 * 
 * This endpoint receives analytics events from the frontend and processes them
 * for storage, analysis, and forwarding to external analytics services.
 */

interface AnalyticsEvent {
    type: 'pageView' | 'track' | 'identify' | 'performance' | 'error';
    data: any;
    timestamp?: number;
    sessionId?: string;
    userId?: string;
}

interface StoredEvent extends AnalyticsEvent {
    id: string;
    timestamp: number;
    userAgent?: string;
    ip?: string;
    referer?: string;
}

// In-memory storage for analytics events (in production, use a database)
const analyticsStore: StoredEvent[] = [];
const MAX_EVENTS = 10000; // Limit stored events

/**
 * Generate unique event ID
 */
function generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const remoteAddr = request.headers.get('x-vercel-forwarded-for');

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    return realIP || remoteAddr || 'unknown';
}

/**
 * Validate analytics event
 */
function validateEvent(event: any): event is AnalyticsEvent {
    if (!event || typeof event !== 'object') {
        return false;
    }

    const validTypes = ['pageView', 'track', 'identify', 'performance', 'error'];
    if (!validTypes.includes(event.type)) {
        return false;
    }

    if (!event.data || typeof event.data !== 'object') {
        return false;
    }

    return true;
}

/**
 * Process and store analytics event
 */
function storeEvent(event: AnalyticsEvent, request: NextRequest): StoredEvent {
    const storedEvent: StoredEvent = {
        ...event,
        id: generateEventId(),
        timestamp: event.timestamp || Date.now(),
        userAgent: request.headers.get('user-agent') || undefined,
        ip: getClientIP(request),
        referer: request.headers.get('referer') || undefined,
    };

    // Add to store
    analyticsStore.push(storedEvent);

    // Maintain size limit
    if (analyticsStore.length > MAX_EVENTS) {
        analyticsStore.splice(0, analyticsStore.length - MAX_EVENTS);
    }

    return storedEvent;
}

/**
 * Process different event types
 */
function processEvent(event: StoredEvent): void {
    switch (event.type) {
        case 'pageView':
            processPageView(event);
            break;
        case 'track':
            processTrackEvent(event);
            break;
        case 'identify':
            processIdentifyEvent(event);
            break;
        case 'performance':
            processPerformanceEvent(event);
            break;
        case 'error':
            processErrorEvent(event);
            break;
    }
}

/**
 * Process page view event
 */
function processPageView(event: StoredEvent): void {
    const { data } = event;

    // Log page view
    console.log(`Page view: ${data.page} by user ${data.userId || 'anonymous'}`);

    // In production, you might:
    // - Store in database
    // - Send to external analytics
    // - Update user activity tracking
    // - Calculate page popularity metrics
}

/**
 * Process track event
 */
function processTrackEvent(event: StoredEvent): void {
    const { data } = event;

    // Log custom event
    console.log(`Event: ${data.name} by user ${data.userId || 'anonymous'}`, data.properties);

    // In production, you might:
    // - Store in database with proper indexing
    // - Trigger real-time analytics updates
    // - Send to external services (Mixpanel, Amplitude, etc.)
    // - Update user behavior profiles
}

/**
 * Process identify event
 */
function processIdentifyEvent(event: StoredEvent): void {
    const { data } = event;

    // Log user identification
    console.log(`User identified: ${data.userId}`, data.properties);

    // In production, you might:
    // - Update user profile in database
    // - Sync with CRM systems
    // - Update user segments
    // - Trigger personalization updates
}

/**
 * Process performance event
 */
function processPerformanceEvent(event: StoredEvent): void {
    const { data } = event;

    // Log performance metrics
    console.log(`Performance metrics for ${data.page}:`, data);

    // In production, you might:
    // - Store in time-series database
    // - Trigger performance alerts
    // - Update performance dashboards
    // - Calculate performance trends
}

/**
 * Process error event
 */
function processErrorEvent(event: StoredEvent): void {
    const { data } = event;

    // Log error
    console.error(`Client error: ${data.message}`, data);

    // In production, you might:
    // - Send to error tracking service (Sentry, Bugsnag)
    // - Create error reports
    // - Trigger alerts for critical errors
    // - Update error rate metrics
}

/**
 * Forward event to external services
 */
async function forwardToExternalServices(event: StoredEvent): Promise<void> {
    // Example: Forward to external analytics service
    if (config.NODE_ENV === 'production') {
        try {
            // Forward to your analytics service
            // await fetch('https://your-analytics-service.com/events', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(event),
            // });
        } catch (error) {
            console.error('Failed to forward analytics event:', error);
        }
    }
}

/**
 * POST /api/analytics
 * 
 * Receive and process analytics events
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();

        // Validate request body
        if (!validateEvent(body)) {
            return NextResponse.json(
                { error: 'Invalid analytics event format' },
                { status: 400 }
            );
        }

        // Store the event
        const storedEvent = storeEvent(body, request);

        // Process the event
        processEvent(storedEvent);

        // Forward to external services (async, don't wait)
        forwardToExternalServices(storedEvent).catch(console.error);

        return NextResponse.json({
            success: true,
            eventId: storedEvent.id
        });
    } catch (error) {
        console.error('Analytics API error:', error);
        return NextResponse.json(
            { error: 'Failed to process analytics event' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/analytics
 * 
 * Retrieve analytics data (for admin dashboard)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const userId = searchParams.get('userId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const limit = parseInt(searchParams.get('limit') || '100');

        // Filter events based on query parameters
        let filteredEvents = analyticsStore;

        if (type) {
            filteredEvents = filteredEvents.filter(event => event.type === type);
        }

        if (userId) {
            filteredEvents = filteredEvents.filter(event => event.userId === userId);
        }

        if (startDate) {
            const start = new Date(startDate).getTime();
            filteredEvents = filteredEvents.filter(event => event.timestamp >= start);
        }

        if (endDate) {
            const end = new Date(endDate).getTime();
            filteredEvents = filteredEvents.filter(event => event.timestamp <= end);
        }

        // Sort by timestamp (newest first) and limit results
        const sortedEvents = filteredEvents
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);

        // Generate summary statistics
        const summary = {
            totalEvents: filteredEvents.length,
            eventTypes: {} as Record<string, number>,
            uniqueUsers: new Set(filteredEvents.map(e => e.userId).filter(Boolean)).size,
            timeRange: {
                start: filteredEvents.length > 0 ? Math.min(...filteredEvents.map(e => e.timestamp)) : null,
                end: filteredEvents.length > 0 ? Math.max(...filteredEvents.map(e => e.timestamp)) : null,
            },
        };

        // Count events by type
        filteredEvents.forEach(event => {
            summary.eventTypes[event.type] = (summary.eventTypes[event.type] || 0) + 1;
        });

        return NextResponse.json({
            events: sortedEvents,
            summary,
            pagination: {
                limit,
                total: filteredEvents.length,
                hasMore: filteredEvents.length > limit,
            },
        });
    } catch (error) {
        console.error('Analytics GET error:', error);
        return NextResponse.json(
            { error: 'Failed to retrieve analytics data' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/analytics/dashboard
 * 
 * Get analytics dashboard data
 */
export async function dashboard(request: NextRequest): Promise<NextResponse> {
    try {
        const now = Date.now();
        const last24h = now - 24 * 60 * 60 * 1000;
        const last7d = now - 7 * 24 * 60 * 60 * 1000;
        const last30d = now - 30 * 24 * 60 * 60 * 1000;

        // Filter events for different time periods
        const events24h = analyticsStore.filter(e => e.timestamp > last24h);
        const events7d = analyticsStore.filter(e => e.timestamp > last7d);
        const events30d = analyticsStore.filter(e => e.timestamp > last30d);

        // Calculate metrics
        const dashboard = {
            overview: {
                totalEvents: analyticsStore.length,
                events24h: events24h.length,
                events7d: events7d.length,
                events30d: events30d.length,
            },

            users: {
                total: new Set(analyticsStore.map(e => e.userId).filter(Boolean)).size,
                active24h: new Set(events24h.map(e => e.userId).filter(Boolean)).size,
                active7d: new Set(events7d.map(e => e.userId).filter(Boolean)).size,
                active30d: new Set(events30d.map(e => e.userId).filter(Boolean)).size,
            },

            pageViews: {
                total: analyticsStore.filter(e => e.type === 'pageView').length,
                last24h: events24h.filter(e => e.type === 'pageView').length,
                last7d: events7d.filter(e => e.type === 'pageView').length,
            },

            topPages: getTopPages(events7d),
            topEvents: getTopEvents(events7d),

            performance: getPerformanceMetrics(events7d),
            errors: getErrorMetrics(events7d),

            trends: {
                hourly: getHourlyTrends(events24h),
                daily: getDailyTrends(events7d),
            },
        };

        return NextResponse.json(dashboard);
    } catch (error) {
        console.error('Analytics dashboard error:', error);
        return NextResponse.json(
            { error: 'Failed to generate dashboard data' },
            { status: 500 }
        );
    }
}

/**
 * Helper functions for dashboard data
 */
function getTopPages(events: StoredEvent[]): Array<{ page: string; views: number }> {
    const pageViews = events
        .filter(e => e.type === 'pageView')
        .reduce((acc, event) => {
            const page = event.data.page || 'unknown';
            acc[page] = (acc[page] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

    return Object.entries(pageViews)
        .map(([page, views]) => ({ page, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
}

function getTopEvents(events: StoredEvent[]): Array<{ event: string; count: number }> {
    const eventCounts = events
        .filter(e => e.type === 'track')
        .reduce((acc, event) => {
            const eventName = event.data.name || 'unknown';
            acc[eventName] = (acc[eventName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

    return Object.entries(eventCounts)
        .map(([event, count]) => ({ event, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
}

function getPerformanceMetrics(events: StoredEvent[]): any {
    const performanceEvents = events.filter(e => e.type === 'performance');

    if (performanceEvents.length === 0) {
        return { averageLoadTime: 0, averageFCP: 0, averageLCP: 0 };
    }

    const metrics = performanceEvents.reduce(
        (acc, event) => {
            const data = event.data;
            if (data.pageLoadTime) acc.loadTimes.push(data.pageLoadTime);
            if (data.firstContentfulPaint) acc.fcpTimes.push(data.firstContentfulPaint);
            if (data.largestContentfulPaint) acc.lcpTimes.push(data.largestContentfulPaint);
            return acc;
        },
        { loadTimes: [] as number[], fcpTimes: [] as number[], lcpTimes: [] as number[] }
    );

    return {
        averageLoadTime: metrics.loadTimes.length > 0
            ? Math.round(metrics.loadTimes.reduce((a, b) => a + b, 0) / metrics.loadTimes.length)
            : 0,
        averageFCP: metrics.fcpTimes.length > 0
            ? Math.round(metrics.fcpTimes.reduce((a, b) => a + b, 0) / metrics.fcpTimes.length)
            : 0,
        averageLCP: metrics.lcpTimes.length > 0
            ? Math.round(metrics.lcpTimes.reduce((a, b) => a + b, 0) / metrics.lcpTimes.length)
            : 0,
    };
}

function getErrorMetrics(events: StoredEvent[]): any {
    const errorEvents = events.filter(e => e.type === 'error');

    const errorTypes = errorEvents.reduce((acc, event) => {
        const errorType = event.data.name || 'Unknown Error';
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return {
        totalErrors: errorEvents.length,
        errorRate: events.length > 0 ? (errorEvents.length / events.length) * 100 : 0,
        topErrors: Object.entries(errorTypes)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
    };
}

function getHourlyTrends(events: StoredEvent[]): Array<{ hour: number; count: number }> {
    const hourly = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));

    events.forEach(event => {
        const hour = new Date(event.timestamp).getHours();
        hourly[hour].count++;
    });

    return hourly;
}

function getDailyTrends(events: StoredEvent[]): Array<{ date: string; count: number }> {
    const daily: Record<string, number> = {};

    events.forEach(event => {
        const date = new Date(event.timestamp).toISOString().split('T')[0];
        daily[date] = (daily[date] || 0) + 1;
    });

    return Object.entries(daily)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
}
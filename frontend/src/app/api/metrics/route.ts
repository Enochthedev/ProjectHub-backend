import { NextRequest, NextResponse } from 'next/server';

// Simple metrics collection for Prometheus
let metrics = {
    http_requests_total: 0,
    http_request_duration_seconds: [],
    memory_usage_bytes: 0,
    active_connections: 0,
    error_count: 0,
};

export async function GET(request: NextRequest) {
    try {
        // Update metrics
        metrics.http_requests_total += 1;
        metrics.memory_usage_bytes = process.memoryUsage().heapUsed;

        // Calculate average response time (simplified)
        const avgResponseTime = metrics.http_request_duration_seconds.length > 0
            ? metrics.http_request_duration_seconds.reduce((a, b) => a + b, 0) / metrics.http_request_duration_seconds.length
            : 0;

        // Prometheus format
        const prometheusMetrics = `
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total ${metrics.http_requests_total}

# HELP http_request_duration_seconds Average HTTP request duration
# TYPE http_request_duration_seconds gauge
http_request_duration_seconds ${avgResponseTime}

# HELP memory_usage_bytes Current memory usage in bytes
# TYPE memory_usage_bytes gauge
memory_usage_bytes ${metrics.memory_usage_bytes}

# HELP nodejs_heap_size_total_bytes Total heap size
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes ${process.memoryUsage().heapTotal}

# HELP nodejs_heap_size_used_bytes Used heap size
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes ${process.memoryUsage().heapUsed}

# HELP nodejs_external_memory_bytes External memory usage
# TYPE nodejs_external_memory_bytes gauge
nodejs_external_memory_bytes ${process.memoryUsage().external}

# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${process.uptime()}

# HELP error_count_total Total number of errors
# TYPE error_count_total counter
error_count_total ${metrics.error_count}
`.trim();

        return new NextResponse(prometheusMetrics, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
            },
        });
    } catch (error) {
        console.error('Metrics collection failed:', error);
        metrics.error_count += 1;

        return NextResponse.json(
            { error: 'Metrics collection failed' },
            { status: 500 }
        );
    }
}

// Middleware to track request metrics
export function trackRequest(duration: number) {
    metrics.http_request_duration_seconds.push(duration);

    // Keep only last 100 measurements
    if (metrics.http_request_duration_seconds.length > 100) {
        metrics.http_request_duration_seconds = metrics.http_request_duration_seconds.slice(-100);
    }
}

export function incrementErrorCount() {
    metrics.error_count += 1;
}
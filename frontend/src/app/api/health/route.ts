import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Basic health checks
        const checks = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            buildTime: process.env.BUILD_TIME || 'unknown',
            commitHash: process.env.COMMIT_HASH || 'unknown',
        };

        // Check critical dependencies
        const dependencies = {
            node: process.version,
            platform: process.platform,
            arch: process.arch,
        };

        // Performance metrics
        const performance = {
            memoryUsage: {
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                external: Math.round(process.memoryUsage().external / 1024 / 1024),
            },
            uptime: Math.round(process.uptime()),
            loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
        };

        // Check if backend API is reachable (optional)
        let backendStatus = 'unknown';
        try {
            if (process.env.NEXT_PUBLIC_API_URL) {
                const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`, {
                    method: 'GET',
                    timeout: 2000,
                });
                backendStatus = backendResponse.ok ? 'healthy' : 'unhealthy';
            }
        } catch (error) {
            backendStatus = 'unreachable';
        }

        const healthData = {
            ...checks,
            dependencies,
            performance,
            services: {
                backend: backendStatus,
            },
        };

        return NextResponse.json(healthData, { status: 200 });
    } catch (error) {
        console.error('Health check failed:', error);

        return NextResponse.json(
            {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 503 }
        );
    }
}

export async function HEAD(request: NextRequest) {
    // Simple health check for load balancers
    return new NextResponse(null, { status: 200 });
}
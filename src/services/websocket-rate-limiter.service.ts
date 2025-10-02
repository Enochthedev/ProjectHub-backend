import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

interface RateLimitConfig {
    windowMs: number; // Time window in milliseconds
    maxRequests: number; // Maximum requests per window
    blockDurationMs: number; // How long to block after limit exceeded
}

interface ClientRateLimit {
    requests: number[];
    blockedUntil?: number;
}

@Injectable()
export class WebSocketRateLimiterService {
    private readonly logger = new Logger(WebSocketRateLimiterService.name);
    private readonly clientLimits = new Map<string, ClientRateLimit>();

    private readonly defaultConfig: RateLimitConfig = {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100, // 100 requests per minute
        blockDurationMs: 5 * 60 * 1000, // 5 minutes block
    };

    private readonly eventConfigs: Record<string, RateLimitConfig> = {
        'ai-typing-start': {
            windowMs: 10 * 1000, // 10 seconds
            maxRequests: 10, // 10 typing events per 10 seconds
            blockDurationMs: 30 * 1000, // 30 seconds block
        },
        'ai-typing-stop': {
            windowMs: 10 * 1000,
            maxRequests: 10,
            blockDurationMs: 30 * 1000,
        },
        'join-project': {
            windowMs: 60 * 1000, // 1 minute
            maxRequests: 20, // 20 project joins per minute
            blockDurationMs: 2 * 60 * 1000, // 2 minutes block
        },
        'join-conversation': {
            windowMs: 60 * 1000,
            maxRequests: 30, // 30 conversation joins per minute
            blockDurationMs: 2 * 60 * 1000,
        },
    };

    checkRateLimit(client: Socket, eventName: string): boolean {
        const clientId = this.getClientId(client);
        const config = this.eventConfigs[eventName] || this.defaultConfig;
        const now = Date.now();

        // Get or create client rate limit data
        let clientLimit = this.clientLimits.get(clientId);
        if (!clientLimit) {
            clientLimit = { requests: [] };
            this.clientLimits.set(clientId, clientLimit);
        }

        // Check if client is currently blocked
        if (clientLimit.blockedUntil && now < clientLimit.blockedUntil) {
            this.logger.warn(`Client ${clientId} is rate limited for event ${eventName}`);
            return false;
        }

        // Remove old requests outside the window
        const windowStart = now - config.windowMs;
        clientLimit.requests = clientLimit.requests.filter(timestamp => timestamp > windowStart);

        // Check if limit exceeded
        if (clientLimit.requests.length >= config.maxRequests) {
            clientLimit.blockedUntil = now + config.blockDurationMs;
            this.logger.warn(
                `Client ${clientId} exceeded rate limit for event ${eventName}. ` +
                `Blocked until ${new Date(clientLimit.blockedUntil).toISOString()}`
            );

            // Emit rate limit warning to client
            client.emit('rate-limit-warning', {
                event: eventName,
                blockedUntil: clientLimit.blockedUntil,
                message: `Rate limit exceeded for ${eventName}. Please slow down.`,
            });

            return false;
        }

        // Add current request
        clientLimit.requests.push(now);
        return true;
    }

    getClientStats(client: Socket): {
        requestCount: number;
        isBlocked: boolean;
        blockedUntil?: number;
    } {
        const clientId = this.getClientId(client);
        const clientLimit = this.clientLimits.get(clientId);
        const now = Date.now();

        if (!clientLimit) {
            return { requestCount: 0, isBlocked: false };
        }

        const isBlocked = clientLimit.blockedUntil ? now < clientLimit.blockedUntil : false;
        const windowStart = now - this.defaultConfig.windowMs;
        const recentRequests = clientLimit.requests.filter(timestamp => timestamp > windowStart);

        return {
            requestCount: recentRequests.length,
            isBlocked,
            blockedUntil: clientLimit.blockedUntil,
        };
    }

    clearClientLimit(client: Socket): void {
        const clientId = this.getClientId(client);
        this.clientLimits.delete(clientId);
    }

    cleanupExpiredLimits(): void {
        const now = Date.now();
        const expiredClients: string[] = [];

        for (const [clientId, clientLimit] of this.clientLimits.entries()) {
            // Remove old requests
            const windowStart = now - this.defaultConfig.windowMs;
            clientLimit.requests = clientLimit.requests.filter(timestamp => timestamp > windowStart);

            // Check if client limit can be cleaned up
            const isBlocked = clientLimit.blockedUntil ? now < clientLimit.blockedUntil : false;
            if (!isBlocked && clientLimit.requests.length === 0) {
                expiredClients.push(clientId);
            }
        }

        // Remove expired client limits
        expiredClients.forEach(clientId => {
            this.clientLimits.delete(clientId);
        });

        if (expiredClients.length > 0) {
            this.logger.log(`Cleaned up ${expiredClients.length} expired rate limit entries`);
        }
    }

    getGlobalStats(): {
        totalClients: number;
        blockedClients: number;
        totalRequests: number;
    } {
        const now = Date.now();
        let blockedClients = 0;
        let totalRequests = 0;

        for (const clientLimit of this.clientLimits.values()) {
            const isBlocked = clientLimit.blockedUntil ? now < clientLimit.blockedUntil : false;
            if (isBlocked) {
                blockedClients++;
            }

            const windowStart = now - this.defaultConfig.windowMs;
            const recentRequests = clientLimit.requests.filter(timestamp => timestamp > windowStart);
            totalRequests += recentRequests.length;
        }

        return {
            totalClients: this.clientLimits.size,
            blockedClients,
            totalRequests,
        };
    }

    private getClientId(client: Socket): string {
        // Use IP address and user agent as client identifier
        const ip = client.handshake.address;
        const userAgent = client.handshake.headers['user-agent'] || 'unknown';
        return `${ip}:${userAgent}`;
    }

    // Method to be called periodically to clean up old data
    startCleanupInterval(): void {
        setInterval(() => {
            this.cleanupExpiredLimits();
        }, 5 * 60 * 1000); // Clean up every 5 minutes
    }
}
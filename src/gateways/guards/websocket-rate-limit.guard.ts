import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

interface RateLimitInfo {
    count: number;
    resetTime: number;
}

@Injectable()
export class WebSocketRateLimitGuard implements CanActivate {
    private readonly logger = new Logger(WebSocketRateLimitGuard.name);
    private readonly rateLimits = new Map<string, RateLimitInfo>();

    // Rate limit: 60 messages per minute per user
    private readonly maxRequests = 60;
    private readonly windowMs = 60 * 1000; // 1 minute

    canActivate(context: ExecutionContext): boolean {
        const client: Socket = context.switchToWs().getClient();
        const userId = client.data?.userId;

        if (!userId) {
            throw new WsException('User not authenticated');
        }

        const now = Date.now();
        const key = `ws:${userId}`;

        // Get or create rate limit info
        let rateLimitInfo = this.rateLimits.get(key);

        if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
            // Reset or create new rate limit window
            rateLimitInfo = {
                count: 1,
                resetTime: now + this.windowMs,
            };
            this.rateLimits.set(key, rateLimitInfo);
            return true;
        }

        // Check if limit exceeded
        if (rateLimitInfo.count >= this.maxRequests) {
            const resetIn = Math.ceil((rateLimitInfo.resetTime - now) / 1000);
            this.logger.warn(`Rate limit exceeded for user ${userId}. Reset in ${resetIn}s`);

            client.emit('rate-limit-exceeded', {
                message: 'Rate limit exceeded',
                resetIn,
                maxRequests: this.maxRequests,
            });

            return false;
        }

        // Increment counter
        rateLimitInfo.count++;
        this.rateLimits.set(key, rateLimitInfo);

        return true;
    }

    // Cleanup old entries periodically
    cleanup() {
        const now = Date.now();
        for (const [key, info] of this.rateLimits.entries()) {
            if (now > info.resetTime) {
                this.rateLimits.delete(key);
            }
        }
    }
}
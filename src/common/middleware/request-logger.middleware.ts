import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from '../../health/monitoring.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  constructor(private readonly monitoringService?: MonitoringService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || 'Unknown';
    const startTime = Date.now();

    // Generate unique request ID for tracing
    const requestId = this.generateRequestId();
    req.headers['x-request-id'] = requestId;

    // Log incoming request
    this.logger.log(
      `Incoming ${method} ${originalUrl} - IP: ${ip} - User-Agent: ${userAgent} - Request ID: ${requestId}`,
    );

    // Override res.end to log response
    const originalEnd = res.end.bind(res);
    res.end = function (chunk?: any, encoding?: any, cb?: any) {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      // Log response with performance metrics
      const logger = new Logger(RequestLoggerMiddleware.name);
      logger.log(
        `Response ${method} ${originalUrl} - Status: ${statusCode} - Duration: ${duration}ms - Request ID: ${requestId}`,
      );

      // Log slow requests (>1000ms) as warnings
      if (duration > 1000) {
        logger.warn(
          `Slow request detected: ${method} ${originalUrl} - Duration: ${duration}ms - Request ID: ${requestId}`,
        );
      }

      // Log error responses
      if (statusCode >= 400) {
        logger.error(
          `Error response: ${method} ${originalUrl} - Status: ${statusCode} - Duration: ${duration}ms - Request ID: ${requestId}`,
        );
        // Record error in monitoring service
        if (this.monitoringService) {
          this.monitoringService.recordError();
        }
      }

      // Record response time in monitoring service
      if (this.monitoringService) {
        this.monitoringService.recordResponseTime(duration);
      }

      return originalEnd(chunk, encoding, cb);
    } as any;

    next();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

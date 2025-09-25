import { Injectable, Logger } from '@nestjs/common';

export interface AuthMetrics {
  totalLogins: number;
  failedLogins: number;
  successfulLogins: number;
  registrations: number;
  tokenRefreshes: number;
  passwordResets: number;
  emailVerifications: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  slowRequests: number;
  errorRate: number;
  requestsPerMinute: number;
  activeUsers: number;
}

export interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  uptime: number;
  timestamp: Date;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private authMetrics: AuthMetrics = {
    totalLogins: 0,
    failedLogins: 0,
    successfulLogins: 0,
    registrations: 0,
    tokenRefreshes: 0,
    passwordResets: 0,
    emailVerifications: 0,
  };

  private performanceMetrics: PerformanceMetrics = {
    averageResponseTime: 0,
    slowRequests: 0,
    errorRate: 0,
    requestsPerMinute: 0,
    activeUsers: 0,
  };

  private responseTimes: number[] = [];
  private requestCount = 0;
  private errorCount = 0;
  private activeUserSessions = new Set<string>();
  private readonly maxResponseTimeHistory = 1000; // Keep last 1000 response times

  // Authentication metrics
  incrementLoginAttempts(): void {
    this.authMetrics.totalLogins++;
  }

  incrementSuccessfulLogins(): void {
    this.authMetrics.successfulLogins++;
  }

  incrementFailedLogins(): void {
    this.authMetrics.failedLogins++;
  }

  incrementRegistrations(): void {
    this.authMetrics.registrations++;
  }

  incrementTokenRefreshes(): void {
    this.authMetrics.tokenRefreshes++;
  }

  incrementPasswordResets(): void {
    this.authMetrics.passwordResets++;
  }

  incrementEmailVerifications(): void {
    this.authMetrics.emailVerifications++;
  }

  // Performance metrics
  recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);

    // Keep only the last N response times to prevent memory issues
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }

    // Update average response time
    this.performanceMetrics.averageResponseTime =
      this.responseTimes.reduce((sum, time) => sum + time, 0) /
      this.responseTimes.length;

    // Count slow requests (>1000ms)
    if (responseTime > 1000) {
      this.performanceMetrics.slowRequests++;
    }

    this.requestCount++;
  }

  recordError(): void {
    this.errorCount++;
    this.updateErrorRate();
  }

  addActiveUser(userId: string): void {
    this.activeUserSessions.add(userId);
    this.performanceMetrics.activeUsers = this.activeUserSessions.size;
  }

  removeActiveUser(userId: string): void {
    this.activeUserSessions.delete(userId);
    this.performanceMetrics.activeUsers = this.activeUserSessions.size;
  }

  private updateErrorRate(): void {
    if (this.requestCount > 0) {
      this.performanceMetrics.errorRate =
        (this.errorCount / this.requestCount) * 100;
    }
  }

  // Getters for metrics
  getAuthMetrics(): AuthMetrics {
    return { ...this.authMetrics };
  }

  getPerformanceMetrics(): PerformanceMetrics {
    // Update requests per minute (simplified calculation)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // This is a simplified calculation - in production, you'd want to use a sliding window
    this.performanceMetrics.requestsPerMinute = this.requestCount;

    return { ...this.performanceMetrics };
  }

  getSystemMetrics(): SystemMetrics {
    return {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }

  getAllMetrics() {
    return {
      authentication: this.getAuthMetrics(),
      performance: this.getPerformanceMetrics(),
      system: this.getSystemMetrics(),
      timestamp: new Date(),
    };
  }

  // Reset metrics (useful for testing or periodic resets)
  resetMetrics(): void {
    this.authMetrics = {
      totalLogins: 0,
      failedLogins: 0,
      successfulLogins: 0,
      registrations: 0,
      tokenRefreshes: 0,
      passwordResets: 0,
      emailVerifications: 0,
    };

    this.performanceMetrics = {
      averageResponseTime: 0,
      slowRequests: 0,
      errorRate: 0,
      requestsPerMinute: 0,
      activeUsers: this.activeUserSessions.size,
    };

    this.responseTimes = [];
    this.requestCount = 0;
    this.errorCount = 0;

    this.logger.log('Metrics have been reset');
  }

  // Log metrics summary (useful for debugging)
  logMetricsSummary(): void {
    const metrics = this.getAllMetrics();
    this.logger.log('=== Metrics Summary ===');
    this.logger.log(
      `Authentication - Total Logins: ${metrics.authentication.totalLogins}, Success Rate: ${
        metrics.authentication.totalLogins > 0
          ? (
              (metrics.authentication.successfulLogins /
                metrics.authentication.totalLogins) *
              100
            ).toFixed(2)
          : 0
      }%`,
    );
    this.logger.log(
      `Performance - Avg Response Time: ${metrics.performance.averageResponseTime.toFixed(2)}ms, Error Rate: ${metrics.performance.errorRate.toFixed(2)}%`,
    );
    this.logger.log(
      `System - Memory: ${(metrics.system.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB, Uptime: ${(metrics.system.uptime / 3600).toFixed(2)}h`,
    );
  }
}

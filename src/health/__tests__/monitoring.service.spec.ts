import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService } from '../monitoring.service';

describe('MonitoringService', () => {
  let service: MonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringService],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
  });

  afterEach(() => {
    service.resetMetrics();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Authentication Metrics', () => {
    it('should increment login attempts', () => {
      service.incrementLoginAttempts();
      service.incrementLoginAttempts();

      const metrics = service.getAuthMetrics();
      expect(metrics.totalLogins).toBe(2);
    });

    it('should increment successful logins', () => {
      service.incrementSuccessfulLogins();

      const metrics = service.getAuthMetrics();
      expect(metrics.successfulLogins).toBe(1);
    });

    it('should increment failed logins', () => {
      service.incrementFailedLogins();

      const metrics = service.getAuthMetrics();
      expect(metrics.failedLogins).toBe(1);
    });

    it('should increment registrations', () => {
      service.incrementRegistrations();

      const metrics = service.getAuthMetrics();
      expect(metrics.registrations).toBe(1);
    });

    it('should increment token refreshes', () => {
      service.incrementTokenRefreshes();

      const metrics = service.getAuthMetrics();
      expect(metrics.tokenRefreshes).toBe(1);
    });

    it('should increment password resets', () => {
      service.incrementPasswordResets();

      const metrics = service.getAuthMetrics();
      expect(metrics.passwordResets).toBe(1);
    });

    it('should increment email verifications', () => {
      service.incrementEmailVerifications();

      const metrics = service.getAuthMetrics();
      expect(metrics.emailVerifications).toBe(1);
    });
  });

  describe('Performance Metrics', () => {
    it('should record response times and calculate average', () => {
      service.recordResponseTime(100);
      service.recordResponseTime(200);
      service.recordResponseTime(300);

      const metrics = service.getPerformanceMetrics();
      expect(metrics.averageResponseTime).toBe(200);
    });

    it('should count slow requests', () => {
      service.recordResponseTime(500); // Fast request
      service.recordResponseTime(1500); // Slow request
      service.recordResponseTime(2000); // Slow request

      const metrics = service.getPerformanceMetrics();
      expect(metrics.slowRequests).toBe(2);
    });

    it('should record errors and calculate error rate', () => {
      service.recordResponseTime(100);
      service.recordResponseTime(200);
      service.recordError();

      const metrics = service.getPerformanceMetrics();
      expect(metrics.errorRate).toBe(50); // 1 error out of 2 requests = 50%
    });

    it('should track active users', () => {
      service.addActiveUser('user1');
      service.addActiveUser('user2');
      service.addActiveUser('user1'); // Duplicate should not increase count

      let metrics = service.getPerformanceMetrics();
      expect(metrics.activeUsers).toBe(2);

      service.removeActiveUser('user1');
      metrics = service.getPerformanceMetrics();
      expect(metrics.activeUsers).toBe(1);
    });

    it('should limit response time history to prevent memory issues', () => {
      // Record more than the maximum history size
      for (let i = 0; i < 1200; i++) {
        service.recordResponseTime(100);
      }

      // The service should only keep the last 1000 response times
      const responseTimes = service['responseTimes'];
      expect(responseTimes.length).toBe(1000);
    });
  });

  describe('System Metrics', () => {
    it('should return system metrics', () => {
      const metrics = service.getSystemMetrics();

      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.cpuUsage).toBeDefined();
      expect(metrics.uptime).toBeDefined();
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('All Metrics', () => {
    it('should return all metrics combined', () => {
      service.incrementLoginAttempts();
      service.recordResponseTime(150);

      const allMetrics = service.getAllMetrics();

      expect(allMetrics.authentication).toBeDefined();
      expect(allMetrics.performance).toBeDefined();
      expect(allMetrics.system).toBeDefined();
      expect(allMetrics.timestamp).toBeInstanceOf(Date);
      expect(allMetrics.authentication.totalLogins).toBe(1);
      expect(allMetrics.performance.averageResponseTime).toBe(150);
    });
  });

  describe('Reset Metrics', () => {
    it('should reset all metrics to initial state', () => {
      service.incrementLoginAttempts();
      service.incrementSuccessfulLogins();
      service.recordResponseTime(100);
      service.recordError();
      service.addActiveUser('user1');

      service.resetMetrics();

      const authMetrics = service.getAuthMetrics();
      const perfMetrics = service.getPerformanceMetrics();

      expect(authMetrics.totalLogins).toBe(0);
      expect(authMetrics.successfulLogins).toBe(0);
      expect(perfMetrics.averageResponseTime).toBe(0);
      expect(perfMetrics.errorRate).toBe(0);
      // Active users should remain as they represent current state
      expect(perfMetrics.activeUsers).toBe(1);
    });
  });

  describe('Metrics Summary Logging', () => {
    it('should log metrics summary without errors', () => {
      const logSpy = jest.spyOn(service['logger'], 'log');

      service.incrementLoginAttempts();
      service.incrementSuccessfulLogins();
      service.recordResponseTime(100);

      service.logMetricsSummary();

      expect(logSpy).toHaveBeenCalledWith('=== Metrics Summary ===');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Authentication - Total Logins: 1'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance - Avg Response Time: 100.00ms'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('System - Memory:'),
      );
    });

    it('should handle zero login attempts in success rate calculation', () => {
      const logSpy = jest.spyOn(service['logger'], 'log');

      service.logMetricsSummary();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Success Rate: 0%'),
      );
    });
  });
});

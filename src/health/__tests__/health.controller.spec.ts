import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckStatus } from '@nestjs/terminus';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';
import { MonitoringService } from '../monitoring.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;
  let monitoringService: MonitoringService;

  beforeEach(async () => {
    const mockHealthService = {
      checkHealth: jest.fn(),
      checkReadiness: jest.fn(),
      checkLiveness: jest.fn(),
    };

    const mockMonitoringService = {
      getAllMetrics: jest.fn(),
      getAuthMetrics: jest.fn(),
      getPerformanceMetrics: jest.fn(),
      getSystemMetrics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
        {
          provide: MonitoringService,
          useValue: mockMonitoringService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
    monitoringService = module.get<MonitoringService>(MonitoringService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health check result', async () => {
      const mockResult = {
        status: 'ok' as HealthCheckStatus,
        info: {},
        error: {},
        details: {},
      };
      jest.spyOn(healthService, 'checkHealth').mockResolvedValue(mockResult);

      const result = await controller.check();

      expect(healthService.checkHealth).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('ready', () => {
    it('should return readiness check result', async () => {
      const mockResult = {
        status: 'ok' as HealthCheckStatus,
        info: {},
        error: {},
        details: {},
      };
      jest.spyOn(healthService, 'checkReadiness').mockResolvedValue(mockResult);

      const result = await controller.ready();

      expect(healthService.checkReadiness).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('live', () => {
    it('should return liveness check result', async () => {
      const mockResult = {
        status: 'ok' as HealthCheckStatus,
        info: {},
        error: {},
        details: {},
      };
      jest.spyOn(healthService, 'checkLiveness').mockResolvedValue(mockResult);

      const result = await controller.live();

      expect(healthService.checkLiveness).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('metrics', () => {
    it('should return all metrics', async () => {
      const mockMetrics = {
        authentication: {
          totalLogins: 10,
          failedLogins: 2,
          successfulLogins: 8,
          registrations: 5,
          tokenRefreshes: 15,
          passwordResets: 1,
          emailVerifications: 5,
        },
        performance: {
          averageResponseTime: 150,
          slowRequests: 2,
          errorRate: 5.5,
          requestsPerMinute: 120,
          activeUsers: 25,
        },
        system: {
          memoryUsage: {
            heapUsed: 50 * 1024 * 1024,
            heapTotal: 100 * 1024 * 1024,
            external: 10 * 1024 * 1024,
            arrayBuffers: 5 * 1024 * 1024,
            rss: 120 * 1024 * 1024,
          },
          cpuUsage: 0.5,
          uptime: 3600,
          timestamp: new Date(),
        },
        timestamp: new Date(),
      };
      jest
        .spyOn(monitoringService, 'getAllMetrics')
        .mockReturnValue(mockMetrics);

      const result = await controller.metrics();

      expect(monitoringService.getAllMetrics).toHaveBeenCalled();
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('authMetrics', () => {
    it('should return authentication metrics with timestamp', async () => {
      const mockAuthMetrics = {
        totalLogins: 10,
        successfulLogins: 8,
        failedLogins: 2,
        registrations: 5,
        tokenRefreshes: 15,
        passwordResets: 1,
        emailVerifications: 5,
      };
      jest
        .spyOn(monitoringService, 'getAuthMetrics')
        .mockReturnValue(mockAuthMetrics);

      const result = await controller.authMetrics();

      expect(monitoringService.getAuthMetrics).toHaveBeenCalled();
      expect(result.authentication).toEqual(mockAuthMetrics);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('performanceMetrics', () => {
    it('should return performance metrics with timestamp', async () => {
      const mockPerfMetrics = {
        averageResponseTime: 150,
        slowRequests: 2,
        errorRate: 5.5,
        requestsPerMinute: 120,
        activeUsers: 25,
      };
      jest
        .spyOn(monitoringService, 'getPerformanceMetrics')
        .mockReturnValue(mockPerfMetrics);

      const result = await controller.performanceMetrics();

      expect(monitoringService.getPerformanceMetrics).toHaveBeenCalled();
      expect(result.performance).toEqual(mockPerfMetrics);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('systemMetrics', () => {
    it('should return system metrics with timestamp', async () => {
      const mockSystemMetrics = {
        memoryUsage: {
          heapUsed: 50 * 1024 * 1024,
          heapTotal: 100 * 1024 * 1024,
          external: 10 * 1024 * 1024,
          arrayBuffers: 5 * 1024 * 1024,
          rss: 120 * 1024 * 1024,
        },
        cpuUsage: 0.5,
        uptime: 3600,
        timestamp: new Date(),
      };
      jest
        .spyOn(monitoringService, 'getSystemMetrics')
        .mockReturnValue(mockSystemMetrics);

      const result = await controller.systemMetrics();

      expect(monitoringService.getSystemMetrics).toHaveBeenCalled();
      expect(result.system).toEqual(mockSystemMetrics);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });
});

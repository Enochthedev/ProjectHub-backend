import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheckStatus,
} from '@nestjs/terminus';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthService } from '../health.service';

describe('HealthService', () => {
  let service: HealthService;
  let healthCheckService: HealthCheckService;
  let typeOrmHealthIndicator: TypeOrmHealthIndicator;
  let configService: ConfigService;
  let dataSource: DataSource;

  beforeEach(async () => {
    const mockDataSource = {
      query: jest.fn(),
      showMigrations: jest.fn(),
    };

    const mockHealthCheckService = {
      check: jest.fn(),
    };

    const mockTypeOrmHealthIndicator = {
      pingCheck: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: mockTypeOrmHealthIndicator,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    typeOrmHealthIndicator = module.get<TypeOrmHealthIndicator>(
      TypeOrmHealthIndicator,
    );
    configService = module.get<ConfigService>(ConfigService);
    dataSource = module.get<DataSource>(getDataSourceToken());
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkHealth', () => {
    it('should perform health checks', async () => {
      const mockResult = {
        status: 'ok' as HealthCheckStatus,
        info: {},
        error: {},
        details: {},
      };
      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await service.checkHealth();

      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      ]);
      expect(result).toEqual(mockResult);
    });
  });

  describe('checkReadiness', () => {
    it('should perform readiness checks', async () => {
      const mockResult = {
        status: 'ok' as HealthCheckStatus,
        info: {},
        error: {},
        details: {},
      };
      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await service.checkReadiness();

      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      ]);
      expect(result).toEqual(mockResult);
    });
  });

  describe('checkLiveness', () => {
    it('should perform liveness checks', async () => {
      const mockResult = {
        status: 'ok' as HealthCheckStatus,
        info: {},
        error: {},
        details: {},
      };
      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await service.checkLiveness();

      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
      ]);
      expect(result).toEqual(mockResult);
    });
  });

  describe('checkDatabaseConnection', () => {
    it('should return healthy status when database query succeeds', async () => {
      jest.spyOn(dataSource, 'query').mockResolvedValue([]);

      const result = await service['checkDatabaseConnection']();

      expect(result.database_connection.status).toBe('up');
      expect(result.database_connection.message).toBe(
        'Database connection is healthy',
      );
    });

    it('should return unhealthy status when database query fails', async () => {
      const error = new Error('Connection failed');
      jest.spyOn(dataSource, 'query').mockRejectedValue(error);

      const result = await service['checkDatabaseConnection']();

      expect(result.database_connection.status).toBe('down');
      expect(result.database_connection.message).toContain(
        'Database connection failed',
      );
    });
  });

  describe('checkEnvironmentVariables', () => {
    it('should return healthy status when all required variables are set', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        const vars = {
          DATABASE_HOST: 'localhost',
          DATABASE_PORT: '5432',
          DATABASE_USERNAME: 'user',
          DATABASE_NAME: 'test',
          JWT_SECRET: 'secret',
          JWT_REFRESH_SECRET: 'refresh-secret',
        };
        return vars[key];
      });

      const result = await service['checkEnvironmentVariables']();

      expect(result.environment_variables.status).toBe('up');
      expect(result.environment_variables.missingVariables).toEqual([]);
    });

    it('should return unhealthy status when required variables are missing', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        const vars = {
          DATABASE_HOST: 'localhost',
          // Missing other required variables
        };
        return vars[key];
      });

      const result = await service['checkEnvironmentVariables']();

      expect(result.environment_variables.status).toBe('down');
      expect(
        result.environment_variables.missingVariables.length,
      ).toBeGreaterThan(0);
    });
  });

  describe('checkMemoryUsage', () => {
    it('should return healthy status when memory usage is acceptable', async () => {
      const originalMemoryUsage = process.memoryUsage;
      (process as any).memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 100 * 1024 * 1024, // 100MB
        heapTotal: 200 * 1024 * 1024, // 200MB
        external: 50 * 1024 * 1024, // 50MB
        arrayBuffers: 10 * 1024 * 1024, // 10MB
        rss: 300 * 1024 * 1024, // 300MB
      });

      const result = await service['checkMemoryUsage']();

      expect(result.memory_usage.status).toBe('up');
      expect(result.memory_usage.heapUsed).toBe('100MB');

      process.memoryUsage = originalMemoryUsage;
    });

    it('should return unhealthy status when memory usage is high', async () => {
      const originalMemoryUsage = process.memoryUsage;
      (process as any).memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 600 * 1024 * 1024, // 600MB (above 512MB threshold)
        heapTotal: 700 * 1024 * 1024, // 700MB
        external: 50 * 1024 * 1024, // 50MB
        arrayBuffers: 10 * 1024 * 1024, // 10MB
        rss: 800 * 1024 * 1024, // 800MB
      });

      const result = await service['checkMemoryUsage']();

      expect(result.memory_usage.status).toBe('down');
      expect(result.memory_usage.heapUsed).toBe('600MB');

      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('checkUptime', () => {
    it('should return uptime information', async () => {
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockReturnValue(7200); // 2 hours

      const result = await service['checkUptime']();

      expect(result.uptime.status).toBe('up');
      expect(result.uptime.seconds).toBe(7200);
      expect(result.uptime.formatted).toBe('2h 0m');

      process.uptime = originalUptime;
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Request } from 'express';
import { AuditService, AuditLogData } from '../audit.service';
import { AuditLog } from '../../../entities/audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;
  let repository: jest.Mocked<Repository<AuditLog>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<AuditLog>>;

  const mockAuditLog: AuditLog = {
    id: 'test-id',
    userId: 'user-123',
    action: 'AUTH_LOGIN_SUCCESS',
    resource: 'authentication',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    createdAt: new Date(),
  };

  const mockRequest: Partial<Request> = {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'test-agent',
    },
    connection: {
      remoteAddress: '127.0.0.1',
    } as any,
  };

  beforeEach(async () => {
    // Mock query builder
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockAuditLog], 1]),
      getRawOne: jest.fn().mockResolvedValue({ count: '5' }),
      getRawMany: jest.fn().mockResolvedValue([
        { ip: '127.0.0.1', count: '10' },
        { ip: '192.168.1.1', count: '5' },
      ]),
      execute: jest.fn().mockResolvedValue({ affected: 10 }),
    } as any;

    // Mock repository
    repository = {
      create: jest.fn().mockReturnValue(mockAuditLog),
      save: jest.fn().mockResolvedValue(mockAuditLog),
      count: jest.fn().mockResolvedValue(5),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logEvent', () => {
    it('should create and save an audit log', async () => {
      // Arrange
      const logData: AuditLogData = {
        userId: 'user-123',
        action: 'TEST_ACTION',
        resource: 'test-resource',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      // Act
      const result = await service.logEvent(logData);

      // Assert
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'TEST_ACTION',
        resource: 'test-resource',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });
      expect(repository.save).toHaveBeenCalledWith(mockAuditLog);
      expect(result).toEqual(mockAuditLog);
    });

    it('should handle errors when saving audit log', async () => {
      // Arrange
      const logData: AuditLogData = {
        action: 'TEST_ACTION',
      };
      const error = new Error('Database error');
      repository.save.mockRejectedValue(error);

      // Act & Assert
      await expect(service.logEvent(logData)).rejects.toThrow('Database error');
    });
  });

  describe('logAuthEvent', () => {
    it('should log successful authentication event', async () => {
      // Act
      const result = await service.logAuthEvent(
        'login',
        'user-123',
        mockRequest as Request,
        true,
      );

      // Assert
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'AUTH_LOGIN_SUCCESS',
        resource: 'authentication',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });
      expect(result).toEqual(mockAuditLog);
    });

    it('should log failed authentication event', async () => {
      // Act
      await service.logAuthEvent('login', null, mockRequest as Request, false);

      // Assert
      expect(repository.create).toHaveBeenCalledWith({
        userId: null,
        action: 'AUTH_LOGIN_FAILED',
        resource: 'authentication',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });
    });

    it('should extract IP from x-forwarded-for header', async () => {
      // Arrange
      const requestWithProxy = {
        ...mockRequest,
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'user-agent': 'test-agent',
        },
      };

      // Act
      await service.logAuthEvent(
        'login',
        'user-123',
        requestWithProxy as Request,
      );

      // Assert
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.1',
        }),
      );
    });
  });

  describe('logUserEvent', () => {
    it('should log user management event', async () => {
      // Act
      await service.logUserEvent(
        'profile_update',
        'user-123',
        'target-user-456',
        mockRequest as Request,
      );

      // Assert
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'USER_PROFILE_UPDATE',
        resource: 'user:target-user-456',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });
    });

    it('should log user event without request context', async () => {
      // Act
      await service.logUserEvent('profile_update', 'user-123');

      // Assert
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'USER_PROFILE_UPDATE',
        resource: 'user',
        ipAddress: null,
        userAgent: null,
      });
    });
  });

  describe('logAdminEvent', () => {
    it('should log admin management event', async () => {
      // Act
      await service.logAdminEvent(
        'user_deactivate',
        'admin-123',
        'user:target-456',
        mockRequest as Request,
      );

      // Assert
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'admin-123',
        action: 'ADMIN_USER_DEACTIVATE',
        resource: 'user:target-456',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security event with default severity', async () => {
      // Act
      await service.logSecurityEvent(
        'suspicious_login',
        'user-123',
        mockRequest as Request,
      );

      // Assert
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'SECURITY_SUSPICIOUS_LOGIN',
        resource: 'security',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });
    });

    it('should log critical security event', async () => {
      // Act
      await service.logSecurityEvent(
        'account_takeover',
        'user-123',
        mockRequest as Request,
        'CRITICAL',
      );

      // Assert
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'SECURITY_ACCOUNT_TAKEOVER',
        resource: 'security',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with pagination', async () => {
      // Act
      const result = await service.getAuditLogs({
        page: 1,
        limit: 10,
      });

      // Assert
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('audit_log');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'audit_log.user',
        'user',
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'audit_log.createdAt',
        'DESC',
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        logs: [mockAuditLog],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should apply filters when provided', async () => {
      // Act
      await service.getAuditLogs({
        userId: 'user-123',
        action: 'LOGIN',
        resource: 'auth',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
      });

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.userId = :userId',
        { userId: 'user-123' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.action ILIKE :action',
        { action: '%LOGIN%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.resource ILIKE :resource',
        { resource: '%auth%' },
      );
    });
  });

  describe('getUserAuditLogs', () => {
    it('should get audit logs for specific user', async () => {
      // Act
      const result = await service.getUserAuditLogs('user-123', 2, 25);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.userId = :userId',
        { userId: 'user-123' },
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(25);
      expect(queryBuilder.take).toHaveBeenCalledWith(25);
    });
  });

  describe('getRecentSecurityEvents', () => {
    it('should get recent security events', async () => {
      // Act
      await service.getRecentSecurityEvents(24, 50);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.action ILIKE :action',
        { action: '%SECURITY_%' },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(50);
    });
  });

  describe('getAuthStats', () => {
    it('should return authentication statistics', async () => {
      // Act
      const result = await service.getAuthStats(7);

      // Assert
      expect(repository.count).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        totalLogins: 5,
        failedLogins: 5,
        uniqueUsers: 5,
        topIpAddresses: [
          { ip: '127.0.0.1', count: 10 },
          { ip: '192.168.1.1', count: 5 },
        ],
      });
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete old audit logs', async () => {
      // Act
      const result = await service.cleanupOldLogs(365);

      // Assert
      expect(queryBuilder.delete).toHaveBeenCalled();
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'createdAt < :cutoffDate',
        expect.objectContaining({ cutoffDate: expect.any(Date) }),
      );
      expect(result).toBe(10);
    });
  });

  describe('extractIpAddress', () => {
    it('should extract IP from x-forwarded-for header', () => {
      // Arrange
      const request = {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      } as unknown as Request;

      // Act
      const ip = (service as any).extractIpAddress(request);

      // Assert
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      // Arrange
      const request = {
        headers: { 'x-real-ip': '192.168.1.1' },
      } as unknown as Request;

      // Act
      const ip = (service as any).extractIpAddress(request);

      // Assert
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from connection.remoteAddress', () => {
      // Arrange
      const request = {
        headers: {},
        connection: { remoteAddress: '192.168.1.1' },
      } as unknown as Request;

      // Act
      const ip = (service as any).extractIpAddress(request);

      // Assert
      expect(ip).toBe('192.168.1.1');
    });

    it('should return null if no IP found', () => {
      // Arrange
      const request = {
        headers: {},
      } as unknown as Request;

      // Act
      const ip = (service as any).extractIpAddress(request);

      // Assert
      expect(ip).toBeNull();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit.service';
import { AuditLog } from '../../../entities/audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepository: Repository<AuditLog>;

  const mockAuditLog: AuditLog = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-123',
    action: 'LOGIN_SUCCESS',
    resource: 'auth',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    createdAt: new Date(),
  };

  const mockAuditLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditLogRepository = module.get<Repository<AuditLog>>(
      getRepositoryToken(AuditLog),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logEvent', () => {
    it('should successfully log an audit event', async () => {
      // Arrange
      const auditData = {
        userId: 'user-123',
        action: 'LOGIN_SUCCESS',
        resource: 'auth',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      };

      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      await service.logEvent(auditData);

      // Assert
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: auditData.userId,
        action: auditData.action,
        resource: auditData.resource,
        ipAddress: auditData.ipAddress,
        userAgent: auditData.userAgent,
      });
      expect(mockAuditLogRepository.save).toHaveBeenCalledWith(mockAuditLog);
    });

    it('should handle null values gracefully', async () => {
      // Arrange
      const auditData = {
        action: 'ANONYMOUS_ACTION',
      };

      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      await service.logEvent(auditData);

      // Assert
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: null,
        action: auditData.action,
        resource: null,
        ipAddress: null,
        userAgent: null,
      });
    });

    it('should not throw error if save fails', async () => {
      // Arrange
      const auditData = {
        action: 'TEST_ACTION',
      };

      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockRejectedValue(
        new Error('Database error'),
      );

      // Act & Assert
      await expect(service.logEvent(auditData)).resolves.not.toThrow();
    });
  });

  describe('logLoginSuccess', () => {
    it('should log successful login', async () => {
      // Arrange
      const userId = 'user-123';
      const ipAddress = '192.168.1.100';
      const userAgent = 'Mozilla/5.0';

      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      await service.logLoginSuccess(userId, ipAddress, userAgent);

      // Assert
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId,
        action: 'LOGIN_SUCCESS',
        resource: 'auth',
        ipAddress,
        userAgent,
      });
    });
  });

  describe('logLoginFailure', () => {
    it('should log failed login attempt', async () => {
      // Arrange
      const email = 'test@ui.edu.ng';
      const reason = 'Invalid password';
      const ipAddress = '192.168.1.100';
      const userAgent = 'Mozilla/5.0';

      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      await service.logLoginFailure(email, reason, ipAddress, userAgent);

      // Assert
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: null,
        action: 'LOGIN_FAILURE',
        resource: 'auth',
        ipAddress,
        userAgent,
      });
    });
  });

  describe('logRegistration', () => {
    it('should log user registration', async () => {
      // Arrange
      const userId = 'user-123';
      const role = 'student';
      const ipAddress = '192.168.1.100';
      const userAgent = 'Mozilla/5.0';

      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      await service.logRegistration(userId, role, ipAddress, userAgent);

      // Assert
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId,
        action: 'USER_REGISTRATION',
        resource: 'auth',
        ipAddress,
        userAgent,
      });
    });
  });

  describe('logEmailVerification', () => {
    it('should log email verification', async () => {
      // Arrange
      const userId = 'user-123';
      const ipAddress = '192.168.1.100';
      const userAgent = 'Mozilla/5.0';

      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      await service.logEmailVerification(userId, ipAddress, userAgent);

      // Assert
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId,
        action: 'EMAIL_VERIFICATION',
        resource: 'auth',
        ipAddress,
        userAgent,
      });
    });
  });

  describe('getUserAuditLogs', () => {
    it('should return user audit logs with pagination', async () => {
      // Arrange
      const userId = 'user-123';
      const limit = 10;
      const offset = 0;
      const mockLogs = [mockAuditLog];
      const mockTotal = 1;

      mockAuditLogRepository.findAndCount.mockResolvedValue([
        mockLogs,
        mockTotal,
      ]);

      // Act
      const result = await service.getUserAuditLogs(userId, limit, offset);

      // Assert
      expect(result).toEqual({ logs: mockLogs, total: mockTotal });
      expect(mockAuditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      });
    });
  });

  describe('getRecentAuditLogs', () => {
    it('should return recent audit logs with pagination', async () => {
      // Arrange
      const limit = 50;
      const offset = 0;
      const mockLogs = [mockAuditLog];
      const mockTotal = 1;

      mockAuditLogRepository.findAndCount.mockResolvedValue([
        mockLogs,
        mockTotal,
      ]);

      // Act
      const result = await service.getRecentAuditLogs(limit, offset);

      // Assert
      expect(result).toEqual({ logs: mockLogs, total: mockTotal });
      expect(mockAuditLogRepository.findAndCount).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
        relations: ['user'],
      });
    });
  });

  describe('getFailedLoginAttempts', () => {
    it('should return failed login attempts within time window', async () => {
      // Arrange
      const timeWindow = new Date();
      const ipAddress = '192.168.1.100';
      const mockLogs = [mockAuditLog];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockLogs),
      };

      mockAuditLogRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Act
      const result = await service.getFailedLoginAttempts(
        timeWindow,
        ipAddress,
      );

      // Assert
      expect(result).toEqual(mockLogs);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'audit.action = :action',
        { action: 'LOGIN_FAILURE' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.createdAt >= :timeWindow',
        { timeWindow },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.ipAddress = :ipAddress',
        { ipAddress },
      );
    });

    it('should work without IP address filter', async () => {
      // Arrange
      const timeWindow = new Date();
      const mockLogs = [mockAuditLog];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockLogs),
      };

      mockAuditLogRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Act
      const result = await service.getFailedLoginAttempts(timeWindow);

      // Assert
      expect(result).toEqual(mockLogs);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(1); // Only time window filter
    });
  });
});

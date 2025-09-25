import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditService } from '../admin-audit.service';
import { AdminAuditLog } from '../../../entities/admin-audit-log.entity';

describe('AdminAuditService', () => {
  let service: AdminAuditService;
  let adminAuditLogRepository: Repository<AdminAuditLog>;

  const mockAdminAuditLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuditService,
        {
          provide: getRepositoryToken(AdminAuditLog),
          useValue: mockAdminAuditLogRepository,
        },
      ],
    }).compile();

    service = module.get<AdminAuditService>(AdminAuditService);
    adminAuditLogRepository = module.get<Repository<AdminAuditLog>>(
      getRepositoryToken(AdminAuditLog),
    );

    jest.clearAllMocks();
  });

  describe('logAdminAction', () => {
    it('should log admin action successfully', async () => {
      const mockAuditLog: AdminAuditLog = {
        id: 'audit-1',
        adminId: 'admin-1',
        action: 'create',
        resourceType: 'user',
        resourceId: 'user-1',
        description: 'Admin create user user-1',
        beforeState: null,
        afterState: { name: 'Test User' },
        metadata: null,
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        sessionId: 'session-1',
        riskLevel: 'medium',
        success: true,
        errorMessage: null,
        duration: null,
        createdAt: new Date(),
        isHighRisk: jest.fn().mockReturnValue(false),
        getSummary: jest.fn().mockReturnValue('create on user:user-1'),
        wasSuccessful: jest.fn().mockReturnValue(true),
      };

      mockAdminAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAdminAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.logAdminAction({
        adminId: 'admin-1',
        action: 'create',
        resourceType: 'user',
        resourceId: 'user-1',
        description: 'Admin create user user-1',
        afterState: { name: 'Test User' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        sessionId: 'session-1',
        riskLevel: 'medium',
      });

      expect(result).toEqual(mockAuditLog);
      expect(mockAdminAuditLogRepository.create).toHaveBeenCalledWith({
        adminId: 'admin-1',
        action: 'create',
        resourceType: 'user',
        resourceId: 'user-1',
        description: 'Admin create user user-1',
        beforeState: null,
        afterState: { name: 'Test User' },
        metadata: null,
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        sessionId: 'session-1',
        riskLevel: 'medium',
        success: true,
        errorMessage: null,
        duration: null,
      });
      expect(mockAdminAuditLogRepository.save).toHaveBeenCalledWith(
        mockAuditLog,
      );
    });

    it('should use default values when optional parameters are not provided', async () => {
      const mockAuditLog: AdminAuditLog = {
        id: 'audit-1',
        adminId: 'admin-1',
        action: 'update',
        resourceType: 'project',
        resourceId: null,
        description: null,
        beforeState: null,
        afterState: null,
        metadata: null,
        ipAddress: null,
        userAgent: null,
        sessionId: null,
        riskLevel: 'medium',
        success: true,
        errorMessage: null,
        duration: null,
        createdAt: new Date(),
        isHighRisk: jest.fn().mockReturnValue(false),
        getSummary: jest.fn().mockReturnValue('update on project'),
        wasSuccessful: jest.fn().mockReturnValue(true),
      };

      mockAdminAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAdminAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.logAdminAction({
        adminId: 'admin-1',
        action: 'update',
        resourceType: 'project',
      });

      expect(result).toEqual(mockAuditLog);
      expect(mockAdminAuditLogRepository.create).toHaveBeenCalledWith({
        adminId: 'admin-1',
        action: 'update',
        resourceType: 'project',
        resourceId: null,
        description: null,
        beforeState: null,
        afterState: null,
        metadata: null,
        ipAddress: null,
        userAgent: null,
        sessionId: null,
        riskLevel: 'medium',
        success: true,
        errorMessage: null,
        duration: null,
      });
    });
  });

  describe('logUserManagement', () => {
    it('should log user creation with medium risk', async () => {
      const mockAuditLog: AdminAuditLog = {
        id: 'audit-1',
        adminId: 'admin-1',
        action: 'create',
        resourceType: 'user',
        resourceId: 'user-1',
        description: 'Admin create user user-1',
        beforeState: null,
        afterState: null,
        metadata: null,
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        sessionId: null,
        riskLevel: 'medium',
        success: true,
        errorMessage: null,
        duration: null,
        createdAt: new Date(),
        isHighRisk: jest.fn().mockReturnValue(false),
        getSummary: jest.fn().mockReturnValue('create on user:user-1'),
        wasSuccessful: jest.fn().mockReturnValue(true),
      };

      mockAdminAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAdminAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.logUserManagement({
        adminId: 'admin-1',
        action: 'create',
        userId: 'user-1',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });

      expect(result).toEqual(mockAuditLog);
      expect(mockAdminAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: 'admin-1',
          action: 'create',
          resourceType: 'user',
          resourceId: 'user-1',
          riskLevel: 'medium',
        }),
      );
    });

    it('should log user deletion with critical risk', async () => {
      const mockAuditLog: AdminAuditLog = {
        id: 'audit-1',
        adminId: 'admin-1',
        action: 'delete',
        resourceType: 'user',
        resourceId: 'user-1',
        description: 'Admin delete user user-1',
        beforeState: null,
        afterState: null,
        metadata: null,
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        sessionId: null,
        riskLevel: 'critical',
        success: true,
        errorMessage: null,
        duration: null,
        createdAt: new Date(),
        isHighRisk: jest.fn().mockReturnValue(true),
        getSummary: jest.fn().mockReturnValue('delete on user:user-1'),
        wasSuccessful: jest.fn().mockReturnValue(true),
      };

      mockAdminAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAdminAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.logUserManagement({
        adminId: 'admin-1',
        action: 'delete',
        userId: 'user-1',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });

      expect(result).toEqual(mockAuditLog);
      expect(mockAdminAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          riskLevel: 'critical',
        }),
      );
    });
  });

  describe('logProjectManagement', () => {
    it('should log project approval with low risk', async () => {
      const mockAuditLog: AdminAuditLog = {
        id: 'audit-1',
        adminId: 'admin-1',
        action: 'approve',
        resourceType: 'project',
        resourceId: 'project-1',
        description: 'Admin approve project project-1',
        beforeState: null,
        afterState: null,
        metadata: null,
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        sessionId: null,
        riskLevel: 'low',
        success: true,
        errorMessage: null,
        duration: null,
        createdAt: new Date(),
        isHighRisk: jest.fn().mockReturnValue(false),
        getSummary: jest.fn().mockReturnValue('approve on project:project-1'),
        wasSuccessful: jest.fn().mockReturnValue(true),
      };

      mockAdminAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAdminAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.logProjectManagement({
        adminId: 'admin-1',
        action: 'approve',
        projectId: 'project-1',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });

      expect(result).toEqual(mockAuditLog);
      expect(mockAdminAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          riskLevel: 'low',
        }),
      );
    });
  });

  describe('logSystemConfiguration', () => {
    it('should log system config changes with high risk', async () => {
      const mockAuditLog: AdminAuditLog = {
        id: 'audit-1',
        adminId: 'admin-1',
        action: 'update',
        resourceType: 'system_config',
        resourceId: 'max_projects_per_student',
        description:
          'Admin update system configuration max_projects_per_student',
        beforeState: null,
        afterState: null,
        metadata: null,
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        sessionId: null,
        riskLevel: 'high',
        success: true,
        errorMessage: null,
        duration: null,
        createdAt: new Date(),
        isHighRisk: jest.fn().mockReturnValue(true),
        getSummary: jest
          .fn()
          .mockReturnValue('update on system_config:max_projects_per_student'),
        wasSuccessful: jest.fn().mockReturnValue(true),
      };

      mockAdminAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAdminAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.logSystemConfiguration({
        adminId: 'admin-1',
        action: 'update',
        configKey: 'max_projects_per_student',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });

      expect(result).toEqual(mockAuditLog);
      expect(mockAdminAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          riskLevel: 'high',
        }),
      );
    });
  });

  describe('logSecurityAction', () => {
    it('should log security actions with critical risk', async () => {
      const mockAuditLog: AdminAuditLog = {
        id: 'audit-1',
        adminId: 'admin-1',
        action: 'force_logout',
        resourceType: 'security',
        resourceId: 'user-1',
        description: 'Admin forced logout of suspicious user',
        beforeState: null,
        afterState: null,
        metadata: { reason: 'suspicious_activity' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        sessionId: null,
        riskLevel: 'critical',
        success: true,
        errorMessage: null,
        duration: null,
        createdAt: new Date(),
        isHighRisk: jest.fn().mockReturnValue(true),
        getSummary: jest
          .fn()
          .mockReturnValue('force_logout on security:user-1'),
        wasSuccessful: jest.fn().mockReturnValue(true),
      };

      mockAdminAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAdminAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.logSecurityAction({
        adminId: 'admin-1',
        action: 'force_logout',
        resourceType: 'security',
        resourceId: 'user-1',
        description: 'Admin forced logout of suspicious user',
        metadata: { reason: 'suspicious_activity' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });

      expect(result).toEqual(mockAuditLog);
      expect(mockAdminAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          riskLevel: 'critical',
        }),
      );
    });
  });

  describe('logBulkOperation', () => {
    it('should log bulk operations with appropriate risk level', async () => {
      const mockAuditLog: AdminAuditLog = {
        id: 'audit-1',
        adminId: 'admin-1',
        action: 'bulk_update',
        resourceType: 'user',
        resourceId: 'bulk_15',
        description: 'Admin performed bulk bulk_update on 15 users',
        beforeState: null,
        afterState: null,
        metadata: { affected_count: 15 },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        sessionId: null,
        riskLevel: 'high',
        success: true,
        errorMessage: null,
        duration: null,
        createdAt: new Date(),
        isHighRisk: jest.fn().mockReturnValue(true),
        getSummary: jest.fn().mockReturnValue('bulk_update on user:bulk_15'),
        wasSuccessful: jest.fn().mockReturnValue(true),
      };

      mockAdminAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAdminAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.logBulkOperation({
        adminId: 'admin-1',
        action: 'bulk_update',
        resourceType: 'user',
        affectedCount: 15,
        metadata: { affected_count: 15 },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });

      expect(result).toEqual(mockAuditLog);
      expect(mockAdminAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          riskLevel: 'high', // > 10 items = high risk
        }),
      );
    });

    it('should log small bulk operations with medium risk', async () => {
      const mockAuditLog: AdminAuditLog = {
        id: 'audit-1',
        adminId: 'admin-1',
        action: 'bulk_update',
        resourceType: 'user',
        resourceId: 'bulk_5',
        description: 'Admin performed bulk bulk_update on 5 users',
        beforeState: null,
        afterState: null,
        metadata: null,
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        sessionId: null,
        riskLevel: 'medium',
        success: true,
        errorMessage: null,
        duration: null,
        createdAt: new Date(),
        isHighRisk: jest.fn().mockReturnValue(false),
        getSummary: jest.fn().mockReturnValue('bulk_update on user:bulk_5'),
        wasSuccessful: jest.fn().mockReturnValue(true),
      };

      mockAdminAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAdminAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.logBulkOperation({
        adminId: 'admin-1',
        action: 'bulk_update',
        resourceType: 'user',
        affectedCount: 5,
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });

      expect(result).toEqual(mockAuditLog);
      expect(mockAdminAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          riskLevel: 'medium', // <= 10 items = medium risk
        }),
      );
    });
  });

  describe('getAdminAuditLogs', () => {
    it('should return audit logs for a specific admin', async () => {
      const mockLogs: AdminAuditLog[] = [
        {
          id: 'audit-1',
          adminId: 'admin-1',
          action: 'create',
          resourceType: 'user',
          resourceId: 'user-1',
          description: 'Admin create user user-1',
          beforeState: null,
          afterState: null,
          metadata: null,
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
          sessionId: null,
          riskLevel: 'medium',
          success: true,
          errorMessage: null,
          duration: null,
          createdAt: new Date(),
          isHighRisk: jest.fn().mockReturnValue(false),
          getSummary: jest.fn().mockReturnValue('create on user:user-1'),
          wasSuccessful: jest.fn().mockReturnValue(true),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockLogs),
      };

      mockAdminAuditLogRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getAdminAuditLogs('admin-1', {
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'log.adminId = :adminId',
        {
          adminId: 'admin-1',
        },
      );
    });
  });
});

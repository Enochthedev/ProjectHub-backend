import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AdminSecurityService } from '../admin-security.service';
import { AdminAuditService } from '../admin-audit.service';
import { AdminAuditLog } from '../../../entities/admin-audit-log.entity';
import { User } from '../../../entities/user.entity';
import { AdminSecurityViolationException } from '../../../common/exceptions/admin.exception';

describe('AdminSecurityService', () => {
  let service: AdminSecurityService;
  let adminAuditLogRepository: Repository<AdminAuditLog>;
  let userRepository: Repository<User>;
  let adminAuditService: AdminAuditService;
  let configService: ConfigService;

  const mockAdminAuditLogRepository = {
    count: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockAdminAuditService = {
    logSecurityAction: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSecurityService,
        {
          provide: getRepositoryToken(AdminAuditLog),
          useValue: mockAdminAuditLogRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: AdminAuditService,
          useValue: mockAdminAuditService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AdminSecurityService>(AdminSecurityService);
    adminAuditLogRepository = module.get<Repository<AdminAuditLog>>(
      getRepositoryToken(AdminAuditLog),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    adminAuditService = module.get<AdminAuditService>(AdminAuditService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('monitorLoginAttempt', () => {
    it('should log successful login attempt', async () => {
      mockAdminAuditService.logSecurityAction.mockResolvedValue({});
      mockAdminAuditLogRepository.find.mockResolvedValue([]);

      await service.monitorLoginAttempt(
        'admin-1',
        '192.168.1.1',
        'test-agent',
        true,
      );

      expect(mockAdminAuditService.logSecurityAction).toHaveBeenCalledWith({
        adminId: 'admin-1',
        action: 'login_success',
        resourceType: 'admin_session',
        description: 'Admin login successful from 192.168.1.1',
        metadata: {
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
          success: true,
        },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });
    });

    it('should log failed login attempt and check patterns', async () => {
      mockAdminAuditService.logSecurityAction.mockResolvedValue({});
      mockAdminAuditLogRepository.count.mockResolvedValue(3); // Below threshold

      await service.monitorLoginAttempt(
        'admin-1',
        '192.168.1.1',
        'test-agent',
        false,
      );

      expect(mockAdminAuditService.logSecurityAction).toHaveBeenCalledWith({
        adminId: 'admin-1',
        action: 'login_failure',
        resourceType: 'admin_session',
        description: 'Admin login failed from 192.168.1.1',
        metadata: {
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
          success: false,
        },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });
    });

    it('should throw security violation exception for excessive failed logins', async () => {
      mockAdminAuditService.logSecurityAction.mockResolvedValue({});
      mockAdminAuditLogRepository.count.mockResolvedValue(6); // Above threshold

      await expect(
        service.monitorLoginAttempt(
          'admin-1',
          '192.168.1.1',
          'test-agent',
          false,
        ),
      ).rejects.toThrow(AdminSecurityViolationException);
    });
  });

  describe('monitorAdminAction', () => {
    it('should monitor high-risk actions', async () => {
      mockAdminAuditLogRepository.count.mockResolvedValue(5); // Below threshold

      await service.monitorAdminAction(
        'admin-1',
        'delete_user',
        'user',
        'user-1',
        'critical',
      );

      // Should not throw any exceptions for actions below threshold
      expect(mockAdminAuditLogRepository.count).toHaveBeenCalled();
    });

    it('should detect bulk operations', async () => {
      const respondToThreatSpy = jest
        .spyOn(service as any, 'respondToThreat')
        .mockResolvedValue(undefined);

      await service.monitorAdminAction(
        'admin-1',
        'bulk_update',
        'user',
        undefined,
        'high',
        { affectedCount: 100 },
      );

      expect(respondToThreatSpy).toHaveBeenCalledWith(
        'admin-1',
        'bulk_operations_detected',
        'medium',
        {
          action: 'bulk_update',
          affectedCount: 100,
          threshold: 50,
        },
      );
    });

    it('should detect privilege escalation attempts', async () => {
      const respondToThreatSpy = jest
        .spyOn(service as any, 'respondToThreat')
        .mockResolvedValue(undefined);

      await service.monitorAdminAction(
        'admin-1',
        'create',
        'user',
        'user-1',
        'high',
        { role: 'admin' },
      );

      expect(respondToThreatSpy).toHaveBeenCalledWith(
        'admin-1',
        'privilege_escalation_attempt',
        'critical',
        {
          action: 'create',
          targetUserId: 'user-1',
          metadata: { role: 'admin' },
        },
      );
    });
  });

  describe('detectAndRespondToThreats', () => {
    it('should detect multiple threats and calculate risk score', async () => {
      const mockLogs: Partial<AdminAuditLog>[] = [
        {
          id: '1',
          adminId: 'admin-1',
          action: 'login_failure',
          success: false,
          createdAt: new Date(),
          ipAddress: '192.168.1.1',
        },
        {
          id: '2',
          adminId: 'admin-1',
          action: 'delete_user',
          riskLevel: 'critical',
          createdAt: new Date(),
          ipAddress: '192.168.1.2',
        },
        {
          id: '3',
          adminId: 'admin-1',
          action: 'bulk_update',
          riskLevel: 'high',
          createdAt: new Date(new Date().setHours(2, 0, 0, 0)), // 2 AM today
          ipAddress: '192.168.1.3',
          metadata: { affectedCount: 100 },
        },
        {
          id: '4',
          adminId: 'admin-1',
          action: 'view_data',
          riskLevel: 'low',
          createdAt: new Date(new Date().setHours(3, 0, 0, 0)), // 3 AM today
          ipAddress: '192.168.1.3',
        },
        {
          id: '5',
          adminId: 'admin-1',
          action: 'export_data',
          riskLevel: 'medium',
          createdAt: new Date(new Date().setHours(4, 0, 0, 0)), // 4 AM today
          ipAddress: '192.168.1.3',
        },
        {
          id: '6',
          adminId: 'admin-1',
          action: 'delete_user',
          riskLevel: 'critical',
          createdAt: new Date(new Date().setHours(1, 0, 0, 0)), // 1 AM today
          ipAddress: '192.168.1.3',
        },
        {
          id: '7',
          adminId: 'admin-1',
          action: 'update_config',
          riskLevel: 'high',
          createdAt: new Date(new Date().setHours(23, 0, 0, 0)), // 11 PM today
          ipAddress: '192.168.1.3',
        },
        {
          id: '8',
          adminId: 'admin-1',
          action: 'create_user',
          riskLevel: 'medium',
          createdAt: new Date(new Date().setHours(5, 0, 0, 0)), // 5 AM today
          ipAddress: '192.168.1.3',
        },
      ];

      mockAdminAuditLogRepository.find.mockResolvedValue(mockLogs);
      mockAdminAuditService.logSecurityAction.mockResolvedValue({});

      const result = await service.detectAndRespondToThreats('admin-1');

      expect(result.threatsDetected).toContain('multiple_ip_addresses');
      expect(result.threatsDetected).toContain('off_hours_activity');
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.actionsRequired.length).toBeGreaterThan(0);
    });

    it('should return no threats for normal activity', async () => {
      const mockLogs: Partial<AdminAuditLog>[] = [
        {
          id: '1',
          adminId: 'admin-1',
          action: 'view_dashboard',
          riskLevel: 'low',
          createdAt: new Date(),
          ipAddress: '192.168.1.1',
        },
      ];

      mockAdminAuditLogRepository.find.mockResolvedValue(mockLogs);

      const result = await service.detectAndRespondToThreats('admin-1');

      expect(result.threatsDetected).toHaveLength(0);
      expect(result.riskScore).toBe(0);
      expect(result.actionsRequired).toHaveLength(0);
    });
  });

  describe('respondToThreat', () => {
    it('should respond to excessive failed logins with account lock', async () => {
      const temporarilyLockAdminSpy = jest
        .spyOn(service as any, 'temporarilyLockAdmin')
        .mockResolvedValue(undefined);
      mockAdminAuditService.logSecurityAction.mockResolvedValue({});

      await service.respondToThreat(
        'admin-1',
        'excessive_failed_logins',
        'critical',
        { failedAttempts: 10 },
      );

      expect(temporarilyLockAdminSpy).toHaveBeenCalledWith(
        'admin-1',
        'excessive_failed_logins',
      );
    });

    it('should respond to privilege escalation with lock and alert', async () => {
      const temporarilyLockAdminSpy = jest
        .spyOn(service as any, 'temporarilyLockAdmin')
        .mockResolvedValue(undefined);
      const alertSecurityTeamSpy = jest
        .spyOn(service as any, 'alertSecurityTeam')
        .mockResolvedValue(undefined);
      mockAdminAuditService.logSecurityAction.mockResolvedValue({});

      await service.respondToThreat(
        'admin-1',
        'privilege_escalation_attempt',
        'critical',
        { targetUserId: 'user-1' },
      );

      expect(temporarilyLockAdminSpy).toHaveBeenCalledWith(
        'admin-1',
        'privilege_escalation_attempt',
      );
      expect(alertSecurityTeamSpy).toHaveBeenCalledWith(
        'admin-1',
        'privilege_escalation_attempt',
        'critical',
        { targetUserId: 'user-1' },
      );
    });
  });

  describe('getSecurityMetrics', () => {
    it('should return comprehensive security metrics', async () => {
      mockAdminAuditLogRepository.count
        .mockResolvedValueOnce(100) // totalActions
        .mockResolvedValueOnce(20) // highRiskActions
        .mockResolvedValueOnce(5) // failedLogins
        .mockResolvedValueOnce(2); // threatDetections

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '10' }),
      };
      mockAdminAuditLogRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getSecurityMetrics();

      expect(result).toEqual({
        totalAdminActions: 100,
        highRiskActions: 20,
        failedLogins: 5,
        uniqueAdmins: 10,
        threatsDetected: 2,
        averageRiskScore: 6.5, // (20 * 30 + 5 * 10) / 100
      });
    });
  });

  describe('private methods', () => {
    it('should temporarily lock admin account', async () => {
      mockAdminAuditService.logSecurityAction.mockResolvedValue({});

      await (service as any).temporarilyLockAdmin('admin-1', 'test_reason');

      expect(mockAdminAuditService.logSecurityAction).toHaveBeenCalledWith({
        adminId: 'admin-1',
        action: 'admin_account_locked',
        resourceType: 'admin_account',
        resourceId: 'admin-1',
        description: 'Admin account temporarily locked due to: test_reason',
        metadata: { reason: 'test_reason', lockTimestamp: expect.any(Date) },
      });
    });

    it('should require additional authentication', async () => {
      mockAdminAuditService.logSecurityAction.mockResolvedValue({});

      await (service as any).requireAdditionalAuthentication(
        'admin-1',
        'test_reason',
      );

      expect(mockAdminAuditService.logSecurityAction).toHaveBeenCalledWith({
        adminId: 'admin-1',
        action: 'additional_auth_required',
        resourceType: 'admin_session',
        resourceId: 'admin-1',
        description: 'Additional authentication required due to: test_reason',
        metadata: { reason: 'test_reason', timestamp: expect.any(Date) },
      });
    });

    it('should flag admin for review', async () => {
      mockAdminAuditService.logSecurityAction.mockResolvedValue({});

      await (service as any).flagForReview('admin-1', 'bulk_operations', {
        count: 100,
      });

      expect(mockAdminAuditService.logSecurityAction).toHaveBeenCalledWith({
        adminId: 'admin-1',
        action: 'flagged_for_review',
        resourceType: 'security_review',
        resourceId: 'admin-1',
        description: 'Admin activity flagged for review: bulk_operations',
        metadata: {
          reviewType: 'bulk_operations',
          count: 100,
          flaggedAt: expect.any(Date),
        },
      });
    });

    it('should alert security team', async () => {
      mockAdminAuditService.logSecurityAction.mockResolvedValue({});

      await (service as any).alertSecurityTeam(
        'admin-1',
        'privilege_escalation',
        'critical',
        { details: 'test' },
      );

      expect(mockAdminAuditService.logSecurityAction).toHaveBeenCalledWith({
        adminId: 'admin-1',
        action: 'security_team_alerted',
        resourceType: 'security_alert',
        resourceId: 'admin-1',
        description:
          'Security team alerted about privilege_escalation (critical)',
        metadata: {
          threatType: 'privilege_escalation',
          severity: 'critical',
          details: 'test',
          alertedAt: expect.any(Date),
        },
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  MilestoneSecurityGuard,
  MilestoneSecurityOptions,
} from '../milestone-security.guard';
import { MilestoneAccessControlService } from '../../../services/milestone-access-control.service';
import { MilestoneInputSanitizationService } from '../../../services/milestone-input-sanitization.service';
import { MilestoneRateLimitingService } from '../../../services/milestone-rate-limiting.service';
import { UserRole } from '../../enums/user-role.enum';
import {
  MilestonePermissionException,
  MilestoneContentSanitizationException,
  MilestoneRateLimitException,
} from '../../exceptions/milestone.exception';

describe('MilestoneSecurityGuard', () => {
  let guard: MilestoneSecurityGuard;
  let reflector: jest.Mocked<Reflector>;
  let accessControlService: jest.Mocked<MilestoneAccessControlService>;
  let sanitizationService: jest.Mocked<MilestoneInputSanitizationService>;
  let rateLimitingService: jest.Mocked<MilestoneRateLimitingService>;

  const mockUser = {
    id: 'user-123',
    role: UserRole.STUDENT,
    supervisorId: 'supervisor-123',
    projectIds: ['project-123'],
  };

  const mockRequest = {
    user: mockUser,
    params: { id: 'milestone-123' },
    body: { title: 'Test Milestone', description: 'Test description' },
    path: '/milestones/milestone-123',
    method: 'GET',
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneSecurityGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: MilestoneAccessControlService,
          useValue: {
            enforceAccess: jest.fn(),
            validateOwnership: jest.fn(),
            validateSupervisorAccess: jest.fn(),
          },
        },
        {
          provide: MilestoneInputSanitizationService,
          useValue: {
            sanitizeTitle: jest.fn(),
            sanitizeDescription: jest.fn(),
            sanitizeBlockingReason: jest.fn(),
            sanitizeNoteContent: jest.fn(),
            validateMilestoneData: jest.fn(),
          },
        },
        {
          provide: MilestoneRateLimitingService,
          useValue: {
            enforceMilestoneRateLimit: jest.fn(),
            enforceProjectRateLimit: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<MilestoneSecurityGuard>(MilestoneSecurityGuard);
    reflector = module.get(Reflector);
    accessControlService = module.get(MilestoneAccessControlService);
    sanitizationService = module.get(MilestoneInputSanitizationService);
    rateLimitingService = module.get(MilestoneRateLimitingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access with minimal security options', async () => {
      reflector.getAllAndOverride.mockReturnValue({});

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', async () => {
      const contextWithoutUser = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => ({ ...mockRequest, user: null }),
        }),
      } as ExecutionContext;

      reflector.getAllAndOverride.mockReturnValue({});

      await expect(guard.canActivate(contextWithoutUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should apply rate limiting when specified', async () => {
      const options: MilestoneSecurityOptions = {
        rateLimitOperation: 'milestone_creation',
      };

      reflector.getAllAndOverride.mockReturnValue(options);
      rateLimitingService.enforceMilestoneRateLimit.mockResolvedValue();

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(
        rateLimitingService.enforceMilestoneRateLimit,
      ).toHaveBeenCalledWith(mockUser.id, 'milestone_creation');
    });

    it('should apply project-specific rate limiting when projectId is present', async () => {
      const contextWithProjectId = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => ({
            ...mockRequest,
            params: { ...mockRequest.params, projectId: 'project-123' },
          }),
        }),
      } as ExecutionContext;

      const options: MilestoneSecurityOptions = {
        rateLimitOperation: 'milestone_creation',
      };

      reflector.getAllAndOverride.mockReturnValue(options);
      rateLimitingService.enforceProjectRateLimit.mockResolvedValue();

      const result = await guard.canActivate(contextWithProjectId);

      expect(result).toBe(true);
      expect(rateLimitingService.enforceProjectRateLimit).toHaveBeenCalledWith(
        mockUser.id,
        'project-123',
        'milestone_creation',
      );
    });

    it('should handle rate limit exceptions', async () => {
      const options: MilestoneSecurityOptions = {
        rateLimitOperation: 'milestone_creation',
      };

      reflector.getAllAndOverride.mockReturnValue(options);
      rateLimitingService.enforceMilestoneRateLimit.mockRejectedValue(
        new MilestoneRateLimitException(
          'milestone_creation',
          'Rate limit exceeded',
          60,
        ),
      );

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        MilestoneRateLimitException,
      );
    });

    it('should sanitize input when specified', async () => {
      const options: MilestoneSecurityOptions = {
        sanitizeInput: true,
      };

      reflector.getAllAndOverride.mockReturnValue(options);
      sanitizationService.sanitizeTitle.mockReturnValue('Sanitized Title');
      sanitizationService.sanitizeDescription.mockReturnValue(
        'Sanitized Description',
      );
      sanitizationService.validateMilestoneData.mockReturnValue({
        title: 'Sanitized Title',
        description: 'Sanitized Description',
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(sanitizationService.sanitizeTitle).toHaveBeenCalledWith(
        'Test Milestone',
      );
      expect(sanitizationService.sanitizeDescription).toHaveBeenCalledWith(
        'Test description',
      );
      expect(sanitizationService.validateMilestoneData).toHaveBeenCalled();
    });

    it('should handle sanitization exceptions', async () => {
      const options: MilestoneSecurityOptions = {
        sanitizeInput: true,
      };

      reflector.getAllAndOverride.mockReturnValue(options);
      sanitizationService.sanitizeTitle.mockImplementation(() => {
        throw new MilestoneContentSanitizationException(
          'title',
          'Contains malicious content',
        );
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        MilestoneContentSanitizationException,
      );
    });

    it('should validate milestone access when specified', async () => {
      const options: MilestoneSecurityOptions = {
        validateMilestoneId: true,
        requiredPermission: 'write',
      };

      reflector.getAllAndOverride.mockReturnValue(options);
      accessControlService.enforceAccess.mockResolvedValue();

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(accessControlService.enforceAccess).toHaveBeenCalledWith(
        'milestone-123',
        {
          userId: mockUser.id,
          userRole: mockUser.role,
          supervisorId: mockUser.supervisorId,
          projectIds: mockUser.projectIds,
        },
        'write',
      );
    });

    it('should validate ownership when required', async () => {
      const options: MilestoneSecurityOptions = {
        requireOwnership: true,
        validateMilestoneId: true,
      };

      reflector.getAllAndOverride.mockReturnValue(options);
      accessControlService.enforceAccess.mockResolvedValue();
      accessControlService.validateOwnership.mockResolvedValue();

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(accessControlService.validateOwnership).toHaveBeenCalledWith(
        'milestone-123',
        mockUser.id,
      );
    });

    it('should validate supervisor access when allowed', async () => {
      const supervisorUser = { ...mockUser, role: UserRole.SUPERVISOR };
      const contextWithSupervisor = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => ({ ...mockRequest, user: supervisorUser }),
        }),
      } as ExecutionContext;

      const options: MilestoneSecurityOptions = {
        allowSupervisorAccess: true,
        validateMilestoneId: true,
      };

      reflector.getAllAndOverride.mockReturnValue(options);
      accessControlService.enforceAccess.mockResolvedValue();
      accessControlService.validateSupervisorAccess.mockResolvedValue();

      const result = await guard.canActivate(contextWithSupervisor);

      expect(result).toBe(true);
      expect(
        accessControlService.validateSupervisorAccess,
      ).toHaveBeenCalledWith('milestone-123', supervisorUser.id);
    });

    it('should handle milestone access exceptions', async () => {
      const options: MilestoneSecurityOptions = {
        validateMilestoneId: true,
        requiredPermission: 'write',
      };

      reflector.getAllAndOverride.mockReturnValue(options);
      accessControlService.enforceAccess.mockRejectedValue(
        new MilestonePermissionException('Access denied'),
      );

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        MilestonePermissionException,
      );
    });

    it('should check role permissions correctly', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      const contextWithAdmin = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => ({ ...mockRequest, user: adminUser }),
        }),
      } as ExecutionContext;

      const options: MilestoneSecurityOptions = {
        allowAdminAccess: false,
      };

      reflector.getAllAndOverride.mockReturnValue(options);

      await expect(guard.canActivate(contextWithAdmin)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should enforce student-only operations', async () => {
      const supervisorUser = { ...mockUser, role: UserRole.SUPERVISOR };
      const contextWithSupervisor = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => ({ ...mockRequest, user: supervisorUser }),
        }),
      } as ExecutionContext;

      const options: MilestoneSecurityOptions = {
        requireOwnership: true,
      };

      reflector.getAllAndOverride.mockReturnValue(options);

      await expect(guard.canActivate(contextWithSupervisor)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should handle comprehensive security validation', async () => {
      const options: MilestoneSecurityOptions = {
        requireOwnership: true,
        allowSupervisorAccess: true,
        allowAdminAccess: true,
        requiredPermission: 'write',
        rateLimitOperation: 'milestone_update',
        sanitizeInput: true,
        validateMilestoneId: true,
      };

      reflector.getAllAndOverride.mockReturnValue(options);
      rateLimitingService.enforceMilestoneRateLimit.mockResolvedValue();
      sanitizationService.sanitizeTitle.mockReturnValue('Sanitized Title');
      sanitizationService.sanitizeDescription.mockReturnValue(
        'Sanitized Description',
      );
      sanitizationService.validateMilestoneData.mockReturnValue({
        title: 'Sanitized Title',
        description: 'Sanitized Description',
      });
      accessControlService.enforceAccess.mockResolvedValue();
      accessControlService.validateOwnership.mockResolvedValue();

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(rateLimitingService.enforceMilestoneRateLimit).toHaveBeenCalled();
      expect(sanitizationService.validateMilestoneData).toHaveBeenCalled();
      expect(accessControlService.enforceAccess).toHaveBeenCalled();
      expect(accessControlService.validateOwnership).toHaveBeenCalled();
    });

    it('should skip milestone validation when no milestone ID is present', async () => {
      const contextWithoutMilestoneId = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => ({
            ...mockRequest,
            params: {},
          }),
        }),
      } as ExecutionContext;

      const options: MilestoneSecurityOptions = {
        validateMilestoneId: true,
        requiredPermission: 'write',
      };

      reflector.getAllAndOverride.mockReturnValue(options);

      const result = await guard.canActivate(contextWithoutMilestoneId);

      expect(result).toBe(true);
      expect(accessControlService.enforceAccess).not.toHaveBeenCalled();
    });

    it('should handle sanitization warnings', async () => {
      const options: MilestoneSecurityOptions = {
        sanitizeInput: true,
      };

      reflector.getAllAndOverride.mockReturnValue(options);
      sanitizationService.sanitizeTitle.mockReturnValue('Sanitized Title');
      sanitizationService.sanitizeDescription.mockReturnValue(
        'Sanitized Description',
      );
      sanitizationService.validateMilestoneData.mockReturnValue({
        title: 'Sanitized Title',
        description: 'Sanitized Description',
        warnings: ['HTML tags removed', 'Dangerous URLs removed'],
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(sanitizationService.validateMilestoneData).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const options: MilestoneSecurityOptions = {
        rateLimitOperation: 'milestone_creation',
      };

      reflector.getAllAndOverride.mockReturnValue(options);
      rateLimitingService.enforceMilestoneRateLimit.mockRejectedValue(
        new Error('Unexpected error'),
      );

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        MilestoneRateLimitException,
      );
    });

    it('should handle sanitization service errors', async () => {
      const options: MilestoneSecurityOptions = {
        sanitizeInput: true,
      };

      reflector.getAllAndOverride.mockReturnValue(options);
      sanitizationService.sanitizeTitle.mockImplementation(() => {
        throw new Error('Sanitization service error');
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle access control service errors', async () => {
      const options: MilestoneSecurityOptions = {
        validateMilestoneId: true,
      };

      reflector.getAllAndOverride.mockReturnValue(options);
      accessControlService.enforceAccess.mockRejectedValue(
        new Error('Access control service error'),
      );

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

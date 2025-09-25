import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminGuard } from '../admin.guard';
import { UserRole } from '../../enums/user-role.enum';
import { User } from '../../../entities/user.entity';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let reflector: Reflector;

  const mockReflector = {
    get: jest.fn(),
  };

  const createMockExecutionContext = (
    user?: Partial<User>,
    permissions?: string[],
  ): ExecutionContext => {
    const mockRequest: any = {
      user,
      method: 'GET',
      url: '/admin/test',
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '192.168.1.1',
      },
    };

    mockReflector.get.mockReturnValue(permissions);

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<AdminGuard>(AdminGuard);
    reflector = module.get<Reflector>(Reflector);

    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should throw UnauthorizedException when user is not authenticated', async () => {
      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Authentication required for admin access',
      );
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      const user: Partial<User> = {
        id: 'user-1',
        email: 'student@ui.edu.ng',
        role: UserRole.STUDENT,
        isActive: true,
        isEmailVerified: true,
      };

      const context = createMockExecutionContext(user);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Admin privileges required to access this resource',
      );
    });

    it('should throw ForbiddenException when admin account is deactivated', async () => {
      const user: Partial<User> = {
        id: 'admin-1',
        email: 'admin@ui.edu.ng',
        role: UserRole.ADMIN,
        isActive: false,
        isEmailVerified: true,
      };

      const context = createMockExecutionContext(user);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Admin account has been deactivated',
      );
    });

    it('should throw ForbiddenException when admin email is not verified', async () => {
      const user: Partial<User> = {
        id: 'admin-1',
        email: 'admin@ui.edu.ng',
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: false,
      };

      const context = createMockExecutionContext(user);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Email verification required for admin access',
      );
    });

    it('should allow access for valid admin user without permissions', async () => {
      const user: Partial<User> = {
        id: 'admin-1',
        email: 'admin@ui.edu.ng',
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
      };

      const context = createMockExecutionContext(user);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access for valid admin user with permissions', async () => {
      const user: Partial<User> = {
        id: 'admin-1',
        email: 'admin@ui.edu.ng',
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
      };

      const permissions = ['user.create', 'user.update'];
      const context = createMockExecutionContext(user, permissions);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should add admin context to request for audit logging', async () => {
      const user: Partial<User> = {
        id: 'admin-1',
        email: 'admin@ui.edu.ng',
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
      };

      const context = createMockExecutionContext(user);
      const request = context.switchToHttp().getRequest();

      await guard.canActivate(context);

      expect(request.adminContext).toBeDefined();
      expect(request.adminContext.adminId).toBe('admin-1');
      expect(request.adminContext.adminEmail).toBe('admin@ui.edu.ng');
      expect(request.adminContext.ipAddress).toBe('192.168.1.1');
      expect(request.adminContext.userAgent).toBe('test-agent');
      expect(request.adminContext.timestamp).toBeInstanceOf(Date);
    });

    it('should extract IP address from different headers', async () => {
      const user: Partial<User> = {
        id: 'admin-1',
        email: 'admin@ui.edu.ng',
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
      };

      // Test x-real-ip header
      const mockRequest: any = {
        user,
        method: 'GET',
        url: '/admin/test',
        headers: {
          'x-real-ip': '10.0.0.1',
        },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      mockReflector.get.mockReturnValue(undefined);

      await guard.canActivate(context);

      expect(mockRequest.adminContext.ipAddress).toBe('10.0.0.1');
    });

    it('should handle missing user-agent header', async () => {
      const user: Partial<User> = {
        id: 'admin-1',
        email: 'admin@ui.edu.ng',
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
      };

      const mockRequest: any = {
        user,
        method: 'GET',
        url: '/admin/test',
        headers: {},
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      mockReflector.get.mockReturnValue(undefined);

      await guard.canActivate(context);

      expect(mockRequest.adminContext.userAgent).toBe('unknown');
    });
  });

  describe('permission checking', () => {
    it('should check permissions when specified', async () => {
      const user: Partial<User> = {
        id: 'admin-1',
        email: 'admin@ui.edu.ng',
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
      };

      const permissions = ['user.create'];
      const context = createMockExecutionContext(user, permissions);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockReflector.get).toHaveBeenCalledWith('permissions', {});
    });

    it('should allow access when no permissions are specified', async () => {
      const user: Partial<User> = {
        id: 'admin-1',
        email: 'admin@ui.edu.ng',
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
      };

      const context = createMockExecutionContext(user, undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when permissions array is empty', async () => {
      const user: Partial<User> = {
        id: 'admin-1',
        email: 'admin@ui.edu.ng',
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
      };

      const context = createMockExecutionContext(user, []);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('IP address extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const user: Partial<User> = {
        id: 'admin-1',
        email: 'admin@ui.edu.ng',
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
      };

      const mockRequest: any = {
        user,
        method: 'GET',
        url: '/admin/test',
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1',
        },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      mockReflector.get.mockReturnValue(undefined);

      await guard.canActivate(context);

      expect(mockRequest.adminContext.ipAddress).toBe('203.0.113.1');
    });

    it('should fallback to unknown when no IP headers are present', async () => {
      const user: Partial<User> = {
        id: 'admin-1',
        email: 'admin@ui.edu.ng',
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
      };

      const mockRequest: any = {
        user,
        method: 'GET',
        url: '/admin/test',
        headers: {},
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      mockReflector.get.mockReturnValue(undefined);

      await guard.canActivate(context);

      expect(mockRequest.adminContext.ipAddress).toBe('unknown');
    });
  });
});

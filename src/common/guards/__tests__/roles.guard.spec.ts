import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles.guard';
import { UserRole } from '../../enums/user-role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockStudentUser = {
    id: 'student-id',
    email: 'student@ui.edu.ng',
    role: UserRole.STUDENT,
    isActive: true,
    isEmailVerified: true,
  };

  const mockSupervisorUser = {
    id: 'supervisor-id',
    email: 'supervisor@ui.edu.ng',
    role: UserRole.SUPERVISOR,
    isActive: true,
    isEmailVerified: true,
  };

  const mockAdminUser = {
    id: 'admin-id',
    email: 'admin@ui.edu.ng',
    role: UserRole.ADMIN,
    isActive: true,
    isEmailVerified: true,
  };

  const createMockExecutionContext = (user: any = null): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/test',
          user,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      // Arrange
      const context = createMockExecutionContext(mockStudentUser);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when required roles array is empty', () => {
      // Arrange
      const context = createMockExecutionContext(mockStudentUser);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when user has the required role', () => {
      // Arrange
      const context = createMockExecutionContext(mockStudentUser);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.STUDENT]);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when user has one of multiple required roles', () => {
      // Arrange
      const context = createMockExecutionContext(mockSupervisorUser);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.STUDENT, UserRole.SUPERVISOR]);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user does not have required role', () => {
      // Arrange
      const context = createMockExecutionContext(mockStudentUser);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN]);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(
        new ForbiddenException('Access denied. Required role(s): admin'),
      );
    });

    it('should throw ForbiddenException when user does not have any of multiple required roles', () => {
      // Arrange
      const context = createMockExecutionContext(mockStudentUser);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.SUPERVISOR, UserRole.ADMIN]);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(
        new ForbiddenException(
          'Access denied. Required role(s): supervisor, admin',
        ),
      );
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      // Arrange
      const context = createMockExecutionContext(null);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.STUDENT]);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(
        new ForbiddenException('Authentication required before role checking'),
      );
    });

    it('should work correctly for admin role', () => {
      // Arrange
      const context = createMockExecutionContext(mockAdminUser);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN]);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should work correctly for supervisor role', () => {
      // Arrange
      const context = createMockExecutionContext(mockSupervisorUser);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.SUPERVISOR]);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should call reflector with correct parameters', () => {
      // Arrange
      const context = createMockExecutionContext(mockStudentUser);
      const getAllAndOverrideSpy = jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([]);

      // Act
      guard.canActivate(context);

      // Assert
      expect(getAllAndOverrideSpy).toHaveBeenCalledWith('roles', [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });
});

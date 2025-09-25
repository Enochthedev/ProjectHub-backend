import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { UserRole } from '../../enums/user-role.enum';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  const mockUser = {
    id: 'user-id',
    email: 'test@ui.edu.ng',
    role: UserRole.STUDENT,
    isActive: true,
    isEmailVerified: true,
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'GET',
        url: '/test',
        user: mockUser,
      }),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true for public routes', async () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should call super.canActivate for protected routes', async () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const superCanActivateSpy = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
    });

    it('should call super.canActivate when isPublic is not set', async () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const superCanActivateSpy = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
    });
  });

  describe('handleRequest', () => {
    it('should return user when authentication is successful', () => {
      // Act
      const result = guard.handleRequest(
        null,
        mockUser,
        null,
        mockExecutionContext,
      );

      // Assert
      expect(result).toBe(mockUser);
    });

    it('should throw UnauthorizedException when user is not provided', () => {
      // Act & Assert
      expect(() => {
        guard.handleRequest(null, null, null, mockExecutionContext);
      }).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with specific message for expired token', () => {
      // Arrange
      const info = { name: 'TokenExpiredError' };

      // Act & Assert
      expect(() => {
        guard.handleRequest(null, null, info, mockExecutionContext);
      }).toThrow(new UnauthorizedException('Access token has expired'));
    });

    it('should throw UnauthorizedException with specific message for invalid token', () => {
      // Arrange
      const info = { name: 'JsonWebTokenError' };

      // Act & Assert
      expect(() => {
        guard.handleRequest(null, null, info, mockExecutionContext);
      }).toThrow(new UnauthorizedException('Invalid access token'));
    });

    it('should throw UnauthorizedException with specific message for not before error', () => {
      // Arrange
      const info = { name: 'NotBeforeError' };

      // Act & Assert
      expect(() => {
        guard.handleRequest(null, null, info, mockExecutionContext);
      }).toThrow(new UnauthorizedException('Access token not active yet'));
    });

    it('should throw UnauthorizedException with specific message for user not found error', () => {
      // Arrange
      const error = new Error('User not found');

      // Act & Assert
      expect(() => {
        guard.handleRequest(error, null, null, mockExecutionContext);
      }).toThrow(new UnauthorizedException('User account not found'));
    });

    it('should throw UnauthorizedException with specific message for deactivated user', () => {
      // Arrange
      const error = new Error('User account is deactivated');

      // Act & Assert
      expect(() => {
        guard.handleRequest(error, null, null, mockExecutionContext);
      }).toThrow(
        new UnauthorizedException('User account has been deactivated'),
      );
    });

    it('should throw UnauthorizedException with specific message for unverified email', () => {
      // Arrange
      const error = new Error('Email not verified');

      // Act & Assert
      expect(() => {
        guard.handleRequest(error, null, null, mockExecutionContext);
      }).toThrow(
        new UnauthorizedException(
          'Email address must be verified before accessing this resource',
        ),
      );
    });

    it('should throw generic UnauthorizedException for unknown errors', () => {
      // Arrange
      const error = new Error('Unknown error');

      // Act & Assert
      expect(() => {
        guard.handleRequest(error, null, null, mockExecutionContext);
      }).toThrow(new UnauthorizedException('Authentication required'));
    });

    it('should throw generic UnauthorizedException when both err and user are null', () => {
      // Act & Assert
      expect(() => {
        guard.handleRequest(null, null, null, mockExecutionContext);
      }).toThrow(new UnauthorizedException('Authentication required'));
    });
  });
});

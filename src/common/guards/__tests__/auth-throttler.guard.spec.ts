import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { AuthThrottlerGuard } from '../auth-throttler.guard';

describe('AuthThrottlerGuard', () => {
  let guard: AuthThrottlerGuard;

  const mockRequest = {
    headers: {
      'x-forwarded-for': '192.168.1.1',
    },
    connection: {
      remoteAddress: '192.168.1.1',
    },
    route: {
      path: '/auth/login',
    },
    url: '/auth/login',
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthThrottlerGuard],
    }).compile();

    guard = module.get<AuthThrottlerGuard>(AuthThrottlerGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear the failed attempts map
    (guard as any).failedAttempts.clear();
  });

  describe('generateKey', () => {
    it('should generate a unique key based on IP and endpoint', () => {
      // Act
      const key = (guard as any).generateKey(mockExecutionContext, 'test');

      // Assert
      expect(key).toBe('192.168.1.1:/auth/login:test');
    });
  });

  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      // Arrange
      const request = {
        headers: { 'x-forwarded-for': '203.0.113.1' },
        connection: { remoteAddress: '192.168.1.1' },
      };

      // Act
      const ip = (guard as any).getClientIP(request);

      // Assert
      expect(ip).toBe('203.0.113.1');
    });

    it('should extract IP from x-real-ip header when x-forwarded-for is not available', () => {
      // Arrange
      const request = {
        headers: { 'x-real-ip': '203.0.113.2' },
        connection: { remoteAddress: '192.168.1.1' },
      };

      // Act
      const ip = (guard as any).getClientIP(request);

      // Assert
      expect(ip).toBe('203.0.113.2');
    });

    it('should extract IP from connection.remoteAddress when headers are not available', () => {
      // Arrange
      const request = {
        headers: {},
        connection: { remoteAddress: '192.168.1.1' },
      };

      // Act
      const ip = (guard as any).getClientIP(request);

      // Assert
      expect(ip).toBe('192.168.1.1');
    });

    it('should return "unknown" when no IP can be determined', () => {
      // Arrange
      const request = {
        headers: {},
      };

      // Act
      const ip = (guard as any).getClientIP(request);

      // Assert
      expect(ip).toBe('unknown');
    });
  });

  describe('handleThrottlingException', () => {
    it('should throw ThrottlerException with exponential backoff message', () => {
      // Act & Assert
      expect(() => {
        (guard as any).handleThrottlingException(mockExecutionContext);
      }).toThrow(ThrottlerException);
    });

    it('should track failed attempts and increase count', () => {
      // Arrange
      const failedAttempts = (guard as any).failedAttempts;

      // Act
      try {
        (guard as any).handleThrottlingException(mockExecutionContext);
      } catch (error) {
        // Expected to throw
      }

      // Assert
      const key = '192.168.1.1:/auth/login';
      expect(failedAttempts.has(key)).toBe(true);
      expect(failedAttempts.get(key).count).toBe(1);
    });

    it('should increase backoff delay with multiple attempts', () => {
      // Arrange
      const failedAttempts = (guard as any).failedAttempts;
      const key = '192.168.1.1:/auth/login';

      // Act - First attempt
      try {
        (guard as any).handleThrottlingException(mockExecutionContext);
      } catch (error) {
        expect(error.message).toContain('60 seconds');
      }

      // Act - Second attempt
      try {
        (guard as any).handleThrottlingException(mockExecutionContext);
      } catch (error) {
        expect(error.message).toContain('120 seconds');
      }

      // Assert
      expect(failedAttempts.get(key).count).toBe(2);
    });

    it('should reset count after 1 hour', () => {
      // Arrange
      const failedAttempts = (guard as any).failedAttempts;
      const key = '192.168.1.1:/auth/login';
      const oneHourAgo = new Date(Date.now() - 3600001); // Just over 1 hour ago

      failedAttempts.set(key, { count: 5, lastAttempt: oneHourAgo });

      // Act
      try {
        (guard as any).handleThrottlingException(mockExecutionContext);
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(failedAttempts.get(key).count).toBe(1); // Reset to 1 (current attempt)
    });
  });

  describe('cleanupOldEntries', () => {
    it('should remove entries older than 1 hour', () => {
      // Arrange
      const failedAttempts = (guard as any).failedAttempts;
      const oldKey = 'old-ip:/auth/login';
      const recentKey = 'recent-ip:/auth/login';
      const oneHourAgo = new Date(Date.now() - 3600001);
      const recent = new Date();

      failedAttempts.set(oldKey, { count: 3, lastAttempt: oneHourAgo });
      failedAttempts.set(recentKey, { count: 2, lastAttempt: recent });

      // Act
      (guard as any).cleanupOldEntries();

      // Assert
      expect(failedAttempts.has(oldKey)).toBe(false);
      expect(failedAttempts.has(recentKey)).toBe(true);
    });
  });

  describe('canActivate', () => {
    it('should call super.canActivate and return true when not throttled', async () => {
      // Arrange
      const superCanActivateSpy = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockResolvedValue(true);

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
    });

    it('should enhance ThrottlerException with custom logic', async () => {
      // Arrange
      const superCanActivateSpy = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockRejectedValue(new ThrottlerException('Rate limit exceeded'));

      const handleThrottlingExceptionSpy = jest
        .spyOn(guard as any, 'handleThrottlingException')
        .mockImplementation(() => {
          throw new ThrottlerException('Custom throttling message');
        });

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new ThrottlerException('Custom throttling message'),
      );

      expect(superCanActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
      expect(handleThrottlingExceptionSpy).toHaveBeenCalledWith(
        mockExecutionContext,
      );
    });

    it('should re-throw non-ThrottlerException errors', async () => {
      // Arrange
      const customError = new Error('Custom error');
      const superCanActivateSpy = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockRejectedValue(customError);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        customError,
      );
      expect(superCanActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityGuard, SecurityOptions } from '../security.guard';
import { InputSanitizationService } from '../../services/input-sanitization.service';
import { RateLimitingService } from '../../services/rate-limiting.service';
import { MalformedSearchQueryException } from '../../exceptions/project.exception';
import { RateLimitException } from '../../exceptions/app.exception';

describe('SecurityGuard', () => {
  let guard: SecurityGuard;
  let reflector: Reflector;
  let inputSanitizationService: InputSanitizationService;
  let rateLimitingService: RateLimitingService;

  const mockReflector = {
    get: jest.fn(),
  };

  const mockInputSanitizationService = {
    containsSecurityThreats: jest.fn(),
  };

  const mockRateLimitingService = {
    enforceRateLimit: jest.fn(),
  };

  const createMockExecutionContext = (request: any): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: InputSanitizationService,
          useValue: mockInputSanitizationService,
        },
        {
          provide: RateLimitingService,
          useValue: mockRateLimitingService,
        },
      ],
    }).compile();

    guard = module.get<SecurityGuard>(SecurityGuard);
    reflector = module.get<Reflector>(Reflector);
    inputSanitizationService = module.get<InputSanitizationService>(
      InputSanitizationService,
    );
    rateLimitingService = module.get<RateLimitingService>(RateLimitingService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow request when no security options are configured', async () => {
      const request = { ip: '127.0.0.1', query: {}, body: {} };
      const context = createMockExecutionContext(request);

      mockReflector.get.mockReturnValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimitingService.enforceRateLimit).not.toHaveBeenCalled();
    });

    it('should apply rate limiting when configured', async () => {
      const request = {
        ip: '127.0.0.1',
        user: { id: 'user123' },
        query: {},
        body: {},
      };
      const context = createMockExecutionContext(request);

      const securityOptions: SecurityOptions = {
        rateLimit: {
          endpoint: 'search',
          maxRequests: 10,
          windowMs: 60000,
        },
      };

      mockReflector.get.mockReturnValue(securityOptions);
      mockRateLimitingService.enforceRateLimit.mockResolvedValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimitingService.enforceRateLimit).toHaveBeenCalledWith(
        'user123',
        'search',
        {
          maxRequests: 10,
          windowMs: 60000,
        },
      );
    });

    it('should use IP address when user is not authenticated', async () => {
      const request = { ip: '192.168.1.1', query: {}, body: {} };
      const context = createMockExecutionContext(request);

      const securityOptions: SecurityOptions = {
        rateLimit: {
          endpoint: 'search',
        },
      };

      mockReflector.get.mockReturnValue(securityOptions);
      mockRateLimitingService.enforceRateLimit.mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(rateLimitingService.enforceRateLimit).toHaveBeenCalledWith(
        '192.168.1.1',
        'search',
        {
          maxRequests: undefined,
          windowMs: undefined,
        },
      );
    });

    it('should throw RateLimitException when rate limit is exceeded', async () => {
      const request = {
        ip: '127.0.0.1',
        user: { id: 'user123' },
        query: {},
        body: {},
      };
      const context = createMockExecutionContext(request);

      const securityOptions: SecurityOptions = {
        rateLimit: {
          endpoint: 'search',
        },
      };

      mockReflector.get.mockReturnValue(securityOptions);
      mockRateLimitingService.enforceRateLimit.mockRejectedValue(
        new RateLimitException('Rate limit exceeded', 60),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        RateLimitException,
      );
    });

    it('should skip rate limiting when skipRateLimit is true', async () => {
      const request = { ip: '127.0.0.1', query: {}, body: {} };
      const context = createMockExecutionContext(request);

      const securityOptions: SecurityOptions = {
        skipRateLimit: true,
        rateLimit: {
          endpoint: 'search',
        },
      };

      mockReflector.get.mockReturnValue(securityOptions);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimitingService.enforceRateLimit).not.toHaveBeenCalled();
    });
  });

  describe('input validation', () => {
    it('should validate query parameters when configured', async () => {
      const request = {
        ip: '127.0.0.1',
        query: { search: 'machine learning', filter: 'ai' },
        body: {},
      };
      const context = createMockExecutionContext(request);

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeQuery: true,
          maxQueryLength: 100,
        },
      };

      mockReflector.get.mockReturnValue(securityOptions);
      mockInputSanitizationService.containsSecurityThreats.mockReturnValue(
        false,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('machine learning');
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('ai');
    });

    it('should throw exception for query parameters that are too long', async () => {
      const longQuery = 'a'.repeat(101);
      const request = {
        ip: '127.0.0.1',
        query: { search: longQuery },
        body: {},
      };
      const context = createMockExecutionContext(request);

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeQuery: true,
          maxQueryLength: 100,
        },
      };

      mockReflector.get.mockReturnValue(securityOptions);

      await expect(guard.canActivate(context)).rejects.toThrow(
        MalformedSearchQueryException,
      );
    });

    it('should throw exception for query parameters with security threats', async () => {
      const request = {
        ip: '127.0.0.1',
        query: { search: "'; DROP TABLE projects; --" },
        body: {},
      };
      const context = createMockExecutionContext(request);

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeQuery: true,
        },
      };

      mockReflector.get.mockReturnValue(securityOptions);
      mockInputSanitizationService.containsSecurityThreats.mockReturnValue(
        true,
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        MalformedSearchQueryException,
      );
    });

    it('should validate request body when configured', async () => {
      const request = {
        ip: '127.0.0.1',
        query: {},
        body: {
          title: 'Project Title',
          abstract: 'Project description',
          tags: ['ai', 'ml'],
        },
      };
      const context = createMockExecutionContext(request);

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeBody: true,
          maxBodySize: 1000,
        },
      };

      mockReflector.get.mockReturnValue(securityOptions);
      mockInputSanitizationService.containsSecurityThreats.mockReturnValue(
        false,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('Project Title');
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('Project description');
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('ai');
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('ml');
    });

    it('should throw exception for request body that is too large', async () => {
      const largeBody = { data: 'a'.repeat(1001) };
      const request = {
        ip: '127.0.0.1',
        query: {},
        body: largeBody,
      };
      const context = createMockExecutionContext(request);

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeBody: true,
          maxBodySize: 1000,
        },
      };

      mockReflector.get.mockReturnValue(securityOptions);

      await expect(guard.canActivate(context)).rejects.toThrow(
        MalformedSearchQueryException,
      );
    });

    it('should throw exception for body fields with security threats', async () => {
      const request = {
        ip: '127.0.0.1',
        query: {},
        body: {
          title: '<script>alert("xss")</script>',
        },
      };
      const context = createMockExecutionContext(request);

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeBody: true,
        },
      };

      mockReflector.get.mockReturnValue(securityOptions);
      mockInputSanitizationService.containsSecurityThreats.mockReturnValue(
        true,
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        MalformedSearchQueryException,
      );
    });

    it('should skip input validation when skipInputValidation is true', async () => {
      const request = {
        ip: '127.0.0.1',
        query: { search: "'; DROP TABLE projects; --" },
        body: {},
      };
      const context = createMockExecutionContext(request);

      const securityOptions: SecurityOptions = {
        skipInputValidation: true,
        inputValidation: {
          sanitizeQuery: true,
        },
      };

      mockReflector.get.mockReturnValue(securityOptions);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).not.toHaveBeenCalled();
    });

    it('should handle nested objects in request body', async () => {
      const request = {
        ip: '127.0.0.1',
        query: {},
        body: {
          project: {
            details: {
              title: 'Nested Title',
              tags: ['tag1', 'tag2'],
            },
          },
        },
      };
      const context = createMockExecutionContext(request);

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeBody: true,
        },
      };

      mockReflector.get.mockReturnValue(securityOptions);
      mockInputSanitizationService.containsSecurityThreats.mockReturnValue(
        false,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('Nested Title');
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('tag1');
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('tag2');
    });
  });

  describe('combined security measures', () => {
    it('should apply both rate limiting and input validation', async () => {
      const request = {
        ip: '127.0.0.1',
        user: { id: 'user123' },
        query: { search: 'machine learning' },
        body: { title: 'Project Title' },
      };
      const context = createMockExecutionContext(request);

      const securityOptions: SecurityOptions = {
        rateLimit: {
          endpoint: 'search',
        },
        inputValidation: {
          sanitizeQuery: true,
          sanitizeBody: true,
        },
      };

      mockReflector.get.mockReturnValue(securityOptions);
      mockRateLimitingService.enforceRateLimit.mockResolvedValue(undefined);
      mockInputSanitizationService.containsSecurityThreats.mockReturnValue(
        false,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimitingService.enforceRateLimit).toHaveBeenCalled();
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('machine learning');
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('Project Title');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityGuard, SecurityOptions } from '../security.guard';
import { InputSanitizationService } from '../../services/input-sanitization.service';
import { RateLimitingService } from '../../services/rate-limiting.service';
import { MalformedSearchQueryException } from '../../exceptions/project.exception';
import { RateLimitException } from '../../exceptions/app.exception';

describe('SecurityGuard - Security Tests', () => {
  let guard: SecurityGuard;
  let reflector: Reflector;
  let inputSanitizationService: InputSanitizationService;
  let rateLimitingService: RateLimitingService;

  beforeEach(async () => {
    const mockInputSanitizationService = {
      containsSecurityThreats: jest.fn(),
    };

    const mockRateLimitingService = {
      enforceRateLimit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityGuard,
        Reflector,
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
  });

  const createMockExecutionContext = (
    request: any,
    securityOptions?: SecurityOptions,
  ): ExecutionContext => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
    } as ExecutionContext;

    if (securityOptions) {
      jest.spyOn(reflector, 'get').mockReturnValue(securityOptions);
    }

    return mockContext;
  };

  describe('Rate Limiting Security', () => {
    it('should enforce rate limits when configured', async () => {
      const request = {
        user: { id: 'user123' },
        ip: '192.168.1.1',
      };

      const securityOptions: SecurityOptions = {
        rateLimit: {
          endpoint: 'search',
          maxRequests: 30,
          windowMs: 60000,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      await guard.canActivate(context);

      expect(rateLimitingService.enforceRateLimit).toHaveBeenCalledWith(
        'user123',
        'search',
        {
          maxRequests: 30,
          windowMs: 60000,
        },
      );
    });

    it('should use IP address when user is not authenticated', async () => {
      const request = {
        ip: '192.168.1.1',
      };

      const securityOptions: SecurityOptions = {
        rateLimit: {
          endpoint: 'search',
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      await guard.canActivate(context);

      expect(rateLimitingService.enforceRateLimit).toHaveBeenCalledWith(
        '192.168.1.1',
        'search',
        expect.any(Object),
      );
    });

    it('should skip rate limiting when configured', async () => {
      const request = {
        user: { id: 'user123' },
        ip: '192.168.1.1',
      };

      const securityOptions: SecurityOptions = {
        skipRateLimit: true,
        rateLimit: {
          endpoint: 'search',
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      await guard.canActivate(context);

      expect(rateLimitingService.enforceRateLimit).not.toHaveBeenCalled();
    });

    it('should propagate rate limit exceptions', async () => {
      const request = {
        user: { id: 'user123' },
        ip: '192.168.1.1',
      };

      const securityOptions: SecurityOptions = {
        rateLimit: {
          endpoint: 'search',
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      (rateLimitingService.enforceRateLimit as jest.Mock).mockRejectedValue(
        new RateLimitException('Rate limit exceeded'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        RateLimitException,
      );
    });
  });

  describe('Input Validation Security', () => {
    it('should validate query parameters for security threats', async () => {
      const request = {
        query: {
          search: 'legitimate query',
          filter: 'valid filter',
        },
        user: { id: 'user123' },
      };

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeQuery: true,
          maxQueryLength: 100,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      (
        inputSanitizationService.containsSecurityThreats as jest.Mock
      ).mockReturnValue(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('legitimate query');
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('valid filter');
    });

    it('should detect and block malicious query parameters', async () => {
      const request = {
        query: {
          search: "'; DROP TABLE projects; --",
        },
        user: { id: 'user123' },
      };

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeQuery: true,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      (
        inputSanitizationService.containsSecurityThreats as jest.Mock
      ).mockReturnValue(true);

      await expect(guard.canActivate(context)).rejects.toThrow(
        MalformedSearchQueryException,
      );
    });

    it('should enforce query parameter length limits', async () => {
      const longQuery = 'a'.repeat(101); // Exceeds 100 char limit
      const request = {
        query: {
          search: longQuery,
        },
        user: { id: 'user123' },
      };

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeQuery: true,
          maxQueryLength: 100,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      await expect(guard.canActivate(context)).rejects.toThrow(
        MalformedSearchQueryException,
      );
    });

    it('should validate request body for security threats', async () => {
      const request = {
        body: {
          title: 'Project Title',
          description: 'Project Description',
        },
        user: { id: 'user123' },
      };

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeBody: true,
          maxBodySize: 1000,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      (
        inputSanitizationService.containsSecurityThreats as jest.Mock
      ).mockReturnValue(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('Project Title');
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('Project Description');
    });

    it('should detect malicious content in request body', async () => {
      const request = {
        body: {
          title: '<script>alert("XSS")</script>',
        },
        user: { id: 'user123' },
      };

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeBody: true,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      (
        inputSanitizationService.containsSecurityThreats as jest.Mock
      ).mockReturnValue(true);

      await expect(guard.canActivate(context)).rejects.toThrow(
        MalformedSearchQueryException,
      );
    });

    it('should enforce request body size limits', async () => {
      const largeBody = {
        description: 'a'.repeat(1001), // Exceeds 1000 char limit
      };

      const request = {
        body: largeBody,
        user: { id: 'user123' },
      };

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeBody: true,
          maxBodySize: 1000,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      await expect(guard.canActivate(context)).rejects.toThrow(
        MalformedSearchQueryException,
      );
    });

    it('should validate nested objects in request body', async () => {
      const request = {
        body: {
          project: {
            title: 'Safe Title',
            metadata: {
              tags: ['safe', '<script>alert(1)</script>'],
            },
          },
        },
        user: { id: 'user123' },
      };

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeBody: true,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      (inputSanitizationService.containsSecurityThreats as jest.Mock)
        .mockReturnValueOnce(false) // For 'Safe Title'
        .mockReturnValueOnce(false) // For 'safe'
        .mockReturnValueOnce(true); // For '<script>alert(1)</script>'

      await expect(guard.canActivate(context)).rejects.toThrow(
        MalformedSearchQueryException,
      );
    });

    it('should validate arrays in request body', async () => {
      const request = {
        body: {
          tags: ['legitimate', 'tags', "'; DROP TABLE projects; --"],
        },
        user: { id: 'user123' },
      };

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeBody: true,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      (inputSanitizationService.containsSecurityThreats as jest.Mock)
        .mockReturnValueOnce(false) // For 'legitimate'
        .mockReturnValueOnce(false) // For 'tags'
        .mockReturnValueOnce(true); // For SQL injection

      await expect(guard.canActivate(context)).rejects.toThrow(
        MalformedSearchQueryException,
      );
    });

    it('should skip input validation when configured', async () => {
      const request = {
        query: {
          search: "'; DROP TABLE projects; --",
        },
        body: {
          title: '<script>alert("XSS")</script>',
        },
        user: { id: 'user123' },
      };

      const securityOptions: SecurityOptions = {
        skipInputValidation: true,
        inputValidation: {
          sanitizeQuery: true,
          sanitizeBody: true,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Combined Security Measures', () => {
    it('should apply both rate limiting and input validation', async () => {
      const request = {
        query: {
          search: 'legitimate query',
        },
        body: {
          title: 'Safe Title',
        },
        user: { id: 'user123' },
      };

      const securityOptions: SecurityOptions = {
        rateLimit: {
          endpoint: 'search',
        },
        inputValidation: {
          sanitizeQuery: true,
          sanitizeBody: true,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      (
        inputSanitizationService.containsSecurityThreats as jest.Mock
      ).mockReturnValue(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimitingService.enforceRateLimit).toHaveBeenCalled();
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalled();
    });

    it('should fail fast on rate limit before input validation', async () => {
      const request = {
        query: {
          search: "'; DROP TABLE projects; --",
        },
        user: { id: 'user123' },
      };

      const securityOptions: SecurityOptions = {
        rateLimit: {
          endpoint: 'search',
        },
        inputValidation: {
          sanitizeQuery: true,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      (rateLimitingService.enforceRateLimit as jest.Mock).mockRejectedValue(
        new RateLimitException('Rate limit exceeded'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        RateLimitException,
      );

      // Input validation should not be called if rate limit fails
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing request object gracefully', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => null,
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      jest.spyOn(reflector, 'get').mockReturnValue({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle missing security options gracefully', async () => {
      const request = {
        user: { id: 'user123' },
      };

      const context = createMockExecutionContext(request);

      jest.spyOn(reflector, 'get').mockReturnValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimitingService.enforceRateLimit).not.toHaveBeenCalled();
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).not.toHaveBeenCalled();
    });

    it('should handle empty query and body objects', async () => {
      const request = {
        query: {},
        body: {},
        user: { id: 'user123' },
      };

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeQuery: true,
          sanitizeBody: true,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).not.toHaveBeenCalled();
    });

    it('should handle non-string values in query and body', async () => {
      const request = {
        query: {
          limit: 10,
          active: true,
          tags: ['tag1', 'tag2'],
        },
        body: {
          count: 5,
          enabled: false,
          metadata: { key: 'value' },
        },
        user: { id: 'user123' },
      };

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeQuery: true,
          sanitizeBody: true,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      (
        inputSanitizationService.containsSecurityThreats as jest.Mock
      ).mockReturnValue(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Should only check string values
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('tag1');
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('tag2');
      expect(
        inputSanitizationService.containsSecurityThreats,
      ).toHaveBeenCalledWith('value');
    });
  });

  describe('Performance and Memory Safety', () => {
    it('should handle large nested objects efficiently', async () => {
      const largeNestedObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 'deep value',
              },
            },
          },
        },
      };

      // Create a large object with many properties
      for (let i = 0; i < 100; i++) {
        largeNestedObject[`prop${i}`] = `value${i}`;
      }

      const request = {
        body: largeNestedObject,
        user: { id: 'user123' },
      };

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeBody: true,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      (
        inputSanitizationService.containsSecurityThreats as jest.Mock
      ).mockReturnValue(false);

      const startTime = Date.now();
      const result = await guard.canActivate(context);
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should prevent stack overflow with circular references', async () => {
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;

      const request = {
        body: circularObject,
        user: { id: 'user123' },
      };

      const securityOptions: SecurityOptions = {
        inputValidation: {
          sanitizeBody: true,
        },
      };

      const context = createMockExecutionContext(request, securityOptions);

      // Should handle circular references gracefully
      await expect(guard.canActivate(context)).rejects.toThrow();
    });
  });
});

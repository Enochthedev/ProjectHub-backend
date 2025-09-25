import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIAssistantErrorRecoveryService } from '../ai-assistant-error-recovery.service';
import {
  AIServiceUnavailableException,
  CircuitBreakerOpenException,
  AIModelTimeoutException,
  RateLimitExceededException,
} from '../../common/exceptions/ai-assistant.exception';

describe('AIAssistantErrorRecoveryService', () => {
  let service: AIAssistantErrorRecoveryService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIAssistantErrorRecoveryService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'ai.retry.maxAttempts': 3,
                'ai.retry.baseDelayMs': 100,
                'ai.retry.maxDelayMs': 5000,
                'ai.retry.backoffMultiplier': 2,
                'ai.retry.retryableErrors': [
                  'ECONNRESET',
                  'AI_SERVICE_UNAVAILABLE',
                ],
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AIAssistantErrorRecoveryService>(
      AIAssistantErrorRecoveryService,
    );
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset service state
    service.resetServiceHealth('test-service');
  });

  describe('executeWithRecovery', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await service.executeWithRecovery(
        mockOperation,
        'test-service',
        'test-operation',
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].success).toBe(true);
      expect(result.recoveryMethod).toBe('none');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors and eventually succeed', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(
          new AIServiceUnavailableException('test-service'),
        )
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const result = await service.executeWithRecovery(
        mockOperation,
        'test-service',
        'test-operation',
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toHaveLength(3);
      expect(result.attempts[0].success).toBe(false);
      expect(result.attempts[1].success).toBe(false);
      expect(result.attempts[2].success).toBe(true);
      expect(result.recoveryMethod).toBe('retry');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should fail immediately on non-retryable errors', async () => {
      const nonRetryableError = new Error('Non-retryable error');
      const mockOperation = jest.fn().mockRejectedValue(nonRetryableError);

      const result = await service.executeWithRecovery(
        mockOperation,
        'test-service',
        'test-operation',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(nonRetryableError);
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].success).toBe(false);
      expect(result.recoveryMethod).toBe('none');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should fail after max attempts with retryable errors', async () => {
      const retryableError = new AIServiceUnavailableException('test-service');
      const mockOperation = jest.fn().mockRejectedValue(retryableError);

      const result = await service.executeWithRecovery(
        mockOperation,
        'test-service',
        'test-operation',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AIServiceUnavailableException);
      expect(result.attempts).toHaveLength(3);
      expect(result.attempts.every((attempt) => !attempt.success)).toBe(true);
      expect(result.recoveryMethod).toBe('none');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should respect custom retry configuration', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new AIServiceUnavailableException('test-service'));
      const customConfig = { maxAttempts: 2, baseDelayMs: 50 };

      const result = await service.executeWithRecovery(
        mockOperation,
        'test-service',
        'test-operation',
        customConfig,
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toHaveLength(2);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should not execute when circuit breaker is open', async () => {
      // Manually open circuit breaker
      service.openCircuitBreaker('test-service', 60000);

      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await service.executeWithRecovery(
        mockOperation,
        'test-service',
        'test-operation',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(CircuitBreakerOpenException);
      expect(result.recoveryMethod).toBe('circuit_breaker');
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should update service health on success and failure', async () => {
      // Test successful operation
      const successOperation = jest.fn().mockResolvedValue('success');
      await service.executeWithRecovery(
        successOperation,
        'test-service',
        'test-op',
      );

      let health = service.getServiceHealth('test-service');
      expect(health.isHealthy).toBe(true);
      expect(health.consecutiveFailures).toBe(0);
      expect(health.lastSuccessAt).toBeDefined();

      // Test failed operation
      const failOperation = jest
        .fn()
        .mockRejectedValue(new Error('Non-retryable'));
      await service.executeWithRecovery(
        failOperation,
        'test-service',
        'test-op',
      );

      health = service.getServiceHealth('test-service');
      expect(health.isHealthy).toBe(false);
      expect(health.consecutiveFailures).toBe(1);
      expect(health.errorCount).toBe(1);
      expect(health.lastFailureAt).toBeDefined();
    });

    it('should calculate exponential backoff delays correctly', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new AIServiceUnavailableException('test-service'));
      const startTime = Date.now();

      await service.executeWithRecovery(
        mockOperation,
        'test-service',
        'test-operation',
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should have delays: 100ms + 200ms = 300ms minimum
      expect(totalTime).toBeGreaterThanOrEqual(300);
      expect(totalTime).toBeLessThan(1000); // Should not be too long for test
    });
  });

  describe('executeWithGracefulDegradation', () => {
    it('should use primary operation when it succeeds', async () => {
      const primaryOperation = jest.fn().mockResolvedValue('primary-result');
      const fallbackOperation = jest.fn().mockResolvedValue('fallback-result');

      const result = await service.executeWithGracefulDegradation(
        primaryOperation,
        fallbackOperation,
        'test-service',
        'test-operation',
      );

      expect(result.result).toBe('primary-result');
      expect(result.usedFallback).toBe(false);
      expect(result.error).toBeUndefined();
      expect(primaryOperation).toHaveBeenCalled();
      expect(fallbackOperation).not.toHaveBeenCalled();
    });

    it('should use fallback operation when primary fails', async () => {
      const primaryError = new AIServiceUnavailableException('test-service');
      const primaryOperation = jest.fn().mockRejectedValue(primaryError);
      const fallbackOperation = jest.fn().mockResolvedValue('fallback-result');

      const result = await service.executeWithGracefulDegradation(
        primaryOperation,
        fallbackOperation,
        'test-service',
        'test-operation',
      );

      expect(result.result).toBe('fallback-result');
      expect(result.usedFallback).toBe(true);
      expect(result.error).toBe(primaryError);
      expect(primaryOperation).toHaveBeenCalled();
      expect(fallbackOperation).toHaveBeenCalled();
    });

    it('should throw error when both primary and fallback fail', async () => {
      const primaryOperation = jest
        .fn()
        .mockRejectedValue(new Error('Primary failed'));
      const fallbackOperation = jest
        .fn()
        .mockRejectedValue(new Error('Fallback failed'));

      await expect(
        service.executeWithGracefulDegradation(
          primaryOperation,
          fallbackOperation,
          'test-service',
          'test-operation',
        ),
      ).rejects.toThrow('Fallback failed');
    });
  });

  describe('circuit breaker functionality', () => {
    it('should open circuit breaker after consecutive failures', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new AIServiceUnavailableException('test-service'));

      // Trigger 5 separate operation failures to open circuit breaker
      for (let i = 0; i < 5; i++) {
        const result = await service.executeWithRecovery(
          mockOperation,
          'test-service',
          'test-operation',
        );
        expect(result.success).toBe(false);
      }

      // Check if circuit breaker is open
      const isOpen = service.isCircuitBreakerOpen('test-service');
      expect(isOpen).toBe(true);

      // The health status should reflect the circuit breaker state
      const health = service.getServiceHealth('test-service');
      expect(health.circuitBreakerOpen).toBe(true);
    });

    it('should reset circuit breaker on successful operation', async () => {
      // Open circuit breaker
      service.openCircuitBreaker('test-service', 1); // 1ms duration for quick test

      // Wait for circuit breaker to allow retry
      await new Promise((resolve) => setTimeout(resolve, 10));

      const mockOperation = jest.fn().mockResolvedValue('success');
      await service.executeWithRecovery(
        mockOperation,
        'test-service',
        'test-operation',
      );

      expect(service.isCircuitBreakerOpen('test-service')).toBe(false);
    });

    it('should manually open and close circuit breaker', async () => {
      service.openCircuitBreaker('test-service', 60000);
      expect(service.isCircuitBreakerOpen('test-service')).toBe(true);

      service.closeCircuitBreaker('test-service');
      expect(service.isCircuitBreakerOpen('test-service')).toBe(false);
    });
  });

  describe('service health management', () => {
    it('should track service health correctly', async () => {
      const successOperation = jest.fn().mockResolvedValue('success');
      const failOperation = jest.fn().mockRejectedValue(new Error('failure'));

      // Initial health should be healthy
      let health = service.getServiceHealth('new-service');
      expect(health.isHealthy).toBe(true);
      expect(health.errorCount).toBe(0);

      // After failure
      await service.executeWithRecovery(
        failOperation,
        'new-service',
        'test-op',
      );
      health = service.getServiceHealth('new-service');
      expect(health.isHealthy).toBe(false);
      expect(health.errorCount).toBe(1);
      expect(health.consecutiveFailures).toBe(1);

      // After success
      await service.executeWithRecovery(
        successOperation,
        'new-service',
        'test-op',
      );
      health = service.getServiceHealth('new-service');
      expect(health.isHealthy).toBe(true);
      expect(health.consecutiveFailures).toBe(0);
    });

    it('should get all service health statuses', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await service.executeWithRecovery(operation, 'service-1', 'test-op');
      await service.executeWithRecovery(operation, 'service-2', 'test-op');

      const allHealth = service.getAllServiceHealth();
      expect(allHealth).toHaveLength(2);
      expect(allHealth.map((h) => h.serviceName)).toContain('service-1');
      expect(allHealth.map((h) => h.serviceName)).toContain('service-2');
    });

    it('should reset service health', async () => {
      const failOperation = jest.fn().mockRejectedValue(new Error('failure'));

      await service.executeWithRecovery(
        failOperation,
        'test-service',
        'test-op',
      );

      let health = service.getServiceHealth('test-service');
      expect(health.errorCount).toBe(1);

      service.resetServiceHealth('test-service');

      health = service.getServiceHealth('test-service');
      expect(health.errorCount).toBe(0);
      expect(health.isHealthy).toBe(true);
    });
  });

  describe('user-friendly error messages', () => {
    it('should create appropriate message for AI service unavailable', () => {
      const error = new AIServiceUnavailableException('test-service');
      const message = service.createUserFriendlyErrorMessage(
        error,
        'test-service',
      );

      expect(message).toContain('AI assistant is temporarily unavailable');
      expect(message).toContain('knowledge base');
    });

    it('should create appropriate message for circuit breaker open', () => {
      service.openCircuitBreaker('test-service', 60000);
      const error = new CircuitBreakerOpenException('test-service');
      const message = service.createUserFriendlyErrorMessage(
        error,
        'test-service',
      );

      expect(message).toContain('temporarily disabled');
      expect(message).toContain('repeated failures');
    });

    it('should create appropriate message for timeout', () => {
      const error = new AIModelTimeoutException('test-model', 15000);
      const message = service.createUserFriendlyErrorMessage(
        error,
        'test-service',
      );

      expect(message).toContain('taking longer than usual');
      expect(message).toContain('high demand');
    });

    it('should create appropriate message for rate limit', () => {
      const error = new RateLimitExceededException();
      const message = service.createUserFriendlyErrorMessage(
        error,
        'test-service',
      );

      expect(message).toContain('usage limit');
      expect(message).toContain('wait a moment');
    });

    it('should create generic message for unknown errors', () => {
      const error = new Error('Unknown error');
      const message = service.createUserFriendlyErrorMessage(
        error,
        'test-service',
      );

      expect(message).toContain('technical difficulties');
      expect(message).toContain('knowledge base');
    });
  });

  describe('recovery recommendations', () => {
    it('should provide recommendations for unhealthy service', async () => {
      const failOperation = jest.fn().mockRejectedValue(new Error('failure'));

      // Generate multiple failures
      for (let i = 0; i < 6; i++) {
        await service.executeWithRecovery(
          failOperation,
          'test-service',
          'test-op',
        );
      }

      const recommendations =
        service.getRecoveryRecommendations('test-service');

      expect(recommendations).toContain(
        'Check service connectivity and authentication',
      );
      expect(recommendations).toContain(
        'Verify API endpoints and configuration',
      );
    });

    it('should provide recommendations for healthy service', () => {
      const recommendations =
        service.getRecoveryRecommendations('healthy-service');

      expect(recommendations).toContain(
        'Service appears healthy - no immediate action required',
      );
    });
  });

  describe('configuration management', () => {
    it('should get retry configuration', () => {
      const config = service.getRetryConfiguration();

      expect(config.maxAttempts).toBe(3);
      expect(config.baseDelayMs).toBe(100);
      expect(config.backoffMultiplier).toBe(2);
    });

    it('should update retry configuration', () => {
      const updates = { maxAttempts: 5, baseDelayMs: 200 };
      service.updateRetryConfiguration(updates);

      const config = service.getRetryConfiguration();
      expect(config.maxAttempts).toBe(5);
      expect(config.baseDelayMs).toBe(200);
    });
  });
});

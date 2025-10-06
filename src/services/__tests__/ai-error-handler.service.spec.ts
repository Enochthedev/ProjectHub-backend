import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AIErrorHandlerService,
  AIErrorContext,
  BudgetConstraintError,
  ModelFailureError,
  TimeoutError,
} from '../ai-error-handler.service';
import { AIAssistantErrorRecoveryService } from '../ai-assistant-error-recovery.service';
import { OpenRouterService, ModelSelection } from '../openrouter.service';
import {
  AIServiceUnavailableException,
  CircuitBreakerOpenException,
  AIModelTimeoutException,
  RateLimitExceededException,
} from '../../common/exceptions/ai-assistant.exception';

describe('AIErrorHandlerService', () => {
  let service: AIErrorHandlerService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockErrorRecoveryService: jest.Mocked<AIAssistantErrorRecoveryService>;
  let mockOpenRouterService: jest.Mocked<OpenRouterService>;

  const mockContext: AIErrorContext = {
    userId: 'test-user-123',
    conversationId: 'conv-456',
    query: 'Test query',
    modelId: 'gpt-4',
    provider: 'openai',
    attemptNumber: 1,
    timestamp: new Date(),
  };

  beforeEach(async () => {
    const mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config = {
          'ai.errorHandler.enableAutomaticFallback': true,
          'ai.errorHandler.enableBudgetDegradation': true,
          'ai.errorHandler.maxRetryAttempts': 3,
          'ai.errorHandler.timeoutMs': 30000,
          'ai.errorHandler.budgetWarningThreshold': 0.8,
          'ai.errorHandler.budgetCriticalThreshold': 0.95,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const mockErrorRecovery = {
      executeWithRecovery: jest.fn(),
    };

    const mockOpenRouter = {
      selectOptimalModel: jest.fn(),
      getBudgetStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIErrorHandlerService,
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
        {
          provide: AIAssistantErrorRecoveryService,
          useValue: mockErrorRecovery,
        },
        {
          provide: OpenRouterService,
          useValue: mockOpenRouter,
        },
      ],
    }).compile();

    service = module.get<AIErrorHandlerService>(AIErrorHandlerService);
    mockConfigService = module.get(ConfigService);
    mockErrorRecoveryService = module.get(AIAssistantErrorRecoveryService);
    mockOpenRouterService = module.get(OpenRouterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeWithErrorHandling', () => {
    it('should execute operation successfully without errors', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const mockRecoveryResult = {
        success: true,
        result: 'success',
        attempts: [
          {
            attemptNumber: 1,
            timestamp: new Date(),
            error: null,
            recoveryAction: 'none',
            success: true,
          },
        ],
        totalTime: 1000,
        recoveryMethod: 'none' as const,
      };

      mockOpenRouterService.getBudgetStatus.mockResolvedValue({
        remainingBudget: 100,
        budgetUtilization: 0.5,
        totalBudget: 200,
      });

      mockErrorRecoveryService.executeWithRecovery.mockResolvedValue(
        mockRecoveryResult,
      );

      const result = await service.executeWithErrorHandling(
        mockOperation,
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.fallbackUsed).toBe(false);
      expect(result.degradationLevel).toBe('none');
      expect(result.recoveryMethod).toBe('none');
      expect(result.userMessage).toBe('Operation completed successfully');
    });

    it('should handle budget constraint check failure', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      mockOpenRouterService.getBudgetStatus.mockResolvedValue({
        remainingBudget: 5,
        budgetUtilization: 0.96,
        totalBudget: 100,
      });

      const result = await service.executeWithErrorHandling(
        mockOperation,
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as BudgetConstraintError).name).toBe(
        'BudgetConstraintError',
      );
      expect(result.userMessage).toContain('budget has been exceeded');
    });

    it('should use fallback operation when primary fails', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error('Primary failed'));
      const mockFallbackOperation = jest
        .fn()
        .mockResolvedValue('fallback success');

      const mockRecoveryResult = {
        success: false,
        error: new Error('Primary failed'),
        attempts: [
          {
            attemptNumber: 1,
            timestamp: new Date(),
            error: new Error('Primary failed'),
            recoveryAction: 'retry',
            success: false,
          },
        ],
        totalTime: 2000,
        recoveryMethod: 'retry' as const,
      };

      mockOpenRouterService.getBudgetStatus.mockResolvedValue({
        remainingBudget: 100,
        budgetUtilization: 0.5,
        totalBudget: 200,
      });

      mockErrorRecoveryService.executeWithRecovery.mockResolvedValue(
        mockRecoveryResult,
      );

      const result = await service.executeWithErrorHandling(
        mockOperation,
        mockContext,
        mockFallbackOperation,
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('fallback success');
      expect(result.fallbackUsed).toBe(true);
      expect(result.degradationLevel).toBe('partial');
      expect(result.recoveryMethod).toBe('fallback_response');
      expect(result.userMessage).toBe(
        'Response generated using fallback method',
      );
    });

    it('should handle operation failure without fallback', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error('Operation failed'));

      const mockRecoveryResult = {
        success: false,
        error: new Error('Operation failed'),
        attempts: [
          {
            attemptNumber: 1,
            timestamp: new Date(),
            error: new Error('Operation failed'),
            recoveryAction: 'retry',
            success: false,
          },
        ],
        totalTime: 2000,
        recoveryMethod: 'retry' as const,
      };

      mockOpenRouterService.getBudgetStatus.mockResolvedValue({
        remainingBudget: 100,
        budgetUtilization: 0.5,
        totalBudget: 200,
      });

      mockErrorRecoveryService.executeWithRecovery.mockResolvedValue(
        mockRecoveryResult,
      );

      const result = await service.executeWithErrorHandling(
        mockOperation,
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.fallbackUsed).toBe(false);
      expect(result.degradationLevel).toBe('full');
      expect(result.recoveryMethod).toBe('none');
    });
  });

  describe('handleModelFailure', () => {
    const mockOriginalModel: ModelSelection = {
      modelId: 'gpt-4',
      provider: 'openai',
      estimatedCost: 0.06,
      estimatedTokens: 1000,
      maxTokens: 4096,
      supportsStreaming: true,
      contextWindow: 8192,
    };

    it('should successfully fallback to alternative model', async () => {
      const mockFallbackModel: ModelSelection = {
        modelId: 'gpt-3.5-turbo',
        provider: 'openai',
        estimatedCost: 0.002,
        estimatedTokens: 1000,
        maxTokens: 4096,
        supportsStreaming: true,
        contextWindow: 4096,
      };

      const mockOperation = jest.fn().mockResolvedValue('fallback result');

      mockOpenRouterService.selectOptimalModel.mockResolvedValue(
        mockFallbackModel,
      );

      const result = await service.handleModelFailure(
        mockOriginalModel,
        mockOperation,
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('fallback result');
      expect(result.fallbackUsed).toBe(true);
      expect(result.degradationLevel).toBe('partial');
      expect(result.recoveryMethod).toBe('fallback_model');
      expect(result.userMessage).toBe(
        'Response generated using alternative AI model',
      );
      expect(mockOperation).toHaveBeenCalledWith(mockFallbackModel);
    });

    it('should fail when no alternative model is available', async () => {
      const mockOperation = jest.fn();

      // Return the same model (no alternative available)
      mockOpenRouterService.selectOptimalModel.mockResolvedValue(
        mockOriginalModel,
      );

      const result = await service.handleModelFailure(
        mockOriginalModel,
        mockOperation,
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('No alternative model available');
      expect(result.fallbackUsed).toBe(true);
      expect(result.degradationLevel).toBe('full');
      expect(result.recoveryMethod).toBe('fallback_model');
    });

    it('should handle fallback model failure', async () => {
      const mockFallbackModel: ModelSelection = {
        modelId: 'gpt-3.5-turbo',
        provider: 'openai',
        estimatedCost: 0.002,
        estimatedTokens: 1000,
        maxTokens: 4096,
        supportsStreaming: true,
        contextWindow: 4096,
      };

      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error('Fallback model failed'));

      mockOpenRouterService.selectOptimalModel.mockResolvedValue(
        mockFallbackModel,
      );

      const result = await service.handleModelFailure(
        mockOriginalModel,
        mockOperation,
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Fallback model failed');
      expect(result.fallbackUsed).toBe(true);
      expect(result.degradationLevel).toBe('full');
      expect(result.recoveryMethod).toBe('fallback_model');
    });
  });

  describe('handleTimeout', () => {
    it('should complete operation within timeout', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await service.handleTimeout(
        mockOperation,
        mockContext,
        5000,
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.fallbackUsed).toBe(false);
      expect(result.degradationLevel).toBe('none');
      expect(result.recoveryMethod).toBe('none');
      expect(result.attempts).toBe(1);
    });

    it('should timeout and retry with exponential backoff', async () => {
      const mockOperation = jest
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 100),
            ),
        )
        .mockImplementationOnce(
          () =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 100),
            ),
        )
        .mockResolvedValueOnce('success on third attempt');

      // Mock sleep to avoid actual delays in tests
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      const result = await service.handleTimeout(
        mockOperation,
        mockContext,
        50,
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('success on third attempt');
      expect(result.recoveryMethod).toBe('retry');
      expect(result.attempts).toBe(3);
    });

    it('should fail after max retry attempts', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error('Always fails'));

      // Mock sleep to avoid actual delays in tests
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      const result = await service.handleTimeout(
        mockOperation,
        mockContext,
        50,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.recoveryMethod).toBe('retry');
      expect(result.attempts).toBe(3); // maxRetryAttempts from config
      expect(result.userMessage).toContain('taking longer than usual');
    });

    it('should handle actual timeout error', async () => {
      const mockOperation = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200)), // Takes longer than timeout
      );

      const result = await service.handleTimeout(
        mockOperation,
        mockContext,
        50,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as TimeoutError).name).toBe('TimeoutError');
      expect(result.recoveryMethod).toBe('retry');
    });
  });

  describe('handleBudgetConstraint', () => {
    it('should execute normally when budget is within limits', async () => {
      const mockOperation = jest.fn().mockResolvedValue('normal result');

      mockOpenRouterService.getBudgetStatus.mockResolvedValue({
        remainingBudget: 100,
        budgetUtilization: 0.5,
        totalBudget: 200,
      });

      const result = await service.handleBudgetConstraint(
        mockOperation,
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('normal result');
      expect(result.fallbackUsed).toBe(false);
      expect(result.degradationLevel).toBe('none');
      expect(result.recoveryMethod).toBe('none');
      expect(mockOperation).toHaveBeenCalledWith(false); // degradedMode = false
    });

    it('should use partial degradation when budget warning threshold is reached', async () => {
      const mockOperation = jest.fn().mockResolvedValue('warning result');

      mockOpenRouterService.getBudgetStatus.mockResolvedValue({
        remainingBudget: 40,
        budgetUtilization: 0.85, // Above warning threshold (0.8)
        totalBudget: 200,
      });

      const result = await service.handleBudgetConstraint(
        mockOperation,
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('warning result');
      expect(result.fallbackUsed).toBe(false);
      expect(result.degradationLevel).toBe('partial');
      expect(result.recoveryMethod).toBe('none');
      expect(result.userMessage).toContain('Budget warning threshold reached');
      expect(mockOperation).toHaveBeenCalledWith(false); // degradedMode = false
    });

    it('should use full degradation when budget critical threshold is reached', async () => {
      const mockOperation = jest.fn().mockResolvedValue('degraded result');

      mockOpenRouterService.getBudgetStatus.mockResolvedValue({
        remainingBudget: 5,
        budgetUtilization: 0.96, // Above critical threshold (0.95)
        totalBudget: 200,
      });

      const result = await service.handleBudgetConstraint(
        mockOperation,
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('degraded result');
      expect(result.fallbackUsed).toBe(true);
      expect(result.degradationLevel).toBe('full');
      expect(result.recoveryMethod).toBe('budget_degradation');
      expect(result.userMessage).toContain('cost-optimized AI service');
      expect(mockOperation).toHaveBeenCalledWith(true); // degradedMode = true
    });

    it('should throw error when budget degradation is disabled and critical threshold is reached', async () => {
      // Mock config to disable budget degradation
      mockConfigService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'ai.errorHandler.enableBudgetDegradation') return false;
          if (key === 'ai.errorHandler.budgetCriticalThreshold') return 0.95;
          return defaultValue;
        },
      );

      // Recreate service with new config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AIErrorHandlerService,
          { provide: ConfigService, useValue: mockConfigService },
          {
            provide: AIAssistantErrorRecoveryService,
            useValue: mockErrorRecoveryService,
          },
          { provide: OpenRouterService, useValue: mockOpenRouterService },
        ],
      }).compile();

      const serviceWithDisabledDegradation = module.get<AIErrorHandlerService>(
        AIErrorHandlerService,
      );
      const mockOperation = jest.fn();

      mockOpenRouterService.getBudgetStatus.mockResolvedValue({
        remainingBudget: 5,
        budgetUtilization: 0.96,
        totalBudget: 200,
      });

      const result =
        await serviceWithDisabledDegradation.handleBudgetConstraint(
          mockOperation,
          mockContext,
        );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as BudgetConstraintError).name).toBe(
        'BudgetConstraintError',
      );
    });

    it('should fallback to normal operation when budget check fails', async () => {
      const mockOperation = jest.fn().mockResolvedValue('fallback result');

      mockOpenRouterService.getBudgetStatus.mockRejectedValue(
        new Error('Budget service unavailable'),
      );

      const result = await service.handleBudgetConstraint(
        mockOperation,
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('fallback result');
      expect(result.userMessage).toContain('budget check failed');
      expect(mockOperation).toHaveBeenCalledWith(false);
    });

    it('should require userId for budget constraint handling', async () => {
      const mockOperation = jest.fn();
      const contextWithoutUserId = { ...mockContext, userId: undefined };

      await expect(
        service.handleBudgetConstraint(mockOperation, contextWithoutUserId),
      ).rejects.toThrow('User ID required for budget constraint handling');
    });
  });

  describe('checkBudgetConstraints', () => {
    it('should pass when budget is within limits', async () => {
      mockOpenRouterService.getBudgetStatus.mockResolvedValue({
        remainingBudget: 100,
        budgetUtilization: 0.5,
        totalBudget: 200,
      });

      await expect(
        service.checkBudgetConstraints('test-user'),
      ).resolves.not.toThrow();
    });

    it('should throw BudgetConstraintError when critical threshold is exceeded', async () => {
      mockOpenRouterService.getBudgetStatus.mockResolvedValue({
        remainingBudget: 5,
        budgetUtilization: 0.96,
        totalBudget: 200,
      });

      await expect(service.checkBudgetConstraints('test-user')).rejects.toThrow(
        'Budget limit exceeded',
      );
    });

    it('should log warning but not throw when budget check fails', async () => {
      mockOpenRouterService.getBudgetStatus.mockRejectedValue(
        new Error('Service unavailable'),
      );

      await expect(
        service.checkBudgetConstraints('test-user'),
      ).resolves.not.toThrow();
    });
  });

  describe('createUserFriendlyMessage', () => {
    it('should return appropriate message for BudgetConstraintError', () => {
      const error = new Error('Budget exceeded') as BudgetConstraintError;
      error.name = 'BudgetConstraintError';

      const message = (service as any).createUserFriendlyMessage(
        error,
        mockContext,
      );

      expect(message).toContain('budget has been exceeded');
    });

    it('should return appropriate message for ModelFailureError', () => {
      const error = new Error('Model failed') as ModelFailureError;
      error.name = 'ModelFailureError';

      const message = (service as any).createUserFriendlyMessage(
        error,
        mockContext,
      );

      expect(message).toContain('temporarily unavailable');
    });

    it('should return appropriate message for TimeoutError', () => {
      const error = new Error('Timeout') as TimeoutError;
      error.name = 'TimeoutError';

      const message = (service as any).createUserFriendlyMessage(
        error,
        mockContext,
      );

      expect(message).toContain('taking longer than usual');
    });

    it('should return appropriate message for AIServiceUnavailableException', () => {
      const error = new AIServiceUnavailableException('Service down');

      const message = (service as any).createUserFriendlyMessage(
        error,
        mockContext,
      );

      expect(message).toContain('temporarily unavailable');
    });

    it('should return appropriate message for RateLimitExceededException', () => {
      const error = new RateLimitExceededException('Rate limit hit');

      const message = (service as any).createUserFriendlyMessage(
        error,
        mockContext,
      );

      expect(message).toContain('Too many requests');
    });

    it('should return appropriate message for CircuitBreakerOpenException', () => {
      const error = new CircuitBreakerOpenException('Circuit breaker open');

      const message = (service as any).createUserFriendlyMessage(
        error,
        mockContext,
      );

      expect(message).toContain('high error rates');
    });

    it('should return appropriate message for AIModelTimeoutException', () => {
      const error = new AIModelTimeoutException('Model timeout');

      const message = (service as any).createUserFriendlyMessage(
        error,
        mockContext,
      );

      expect(message).toContain('took too long to respond');
    });

    it('should return generic message for unknown errors', () => {
      const error = new Error('Unknown error');

      const message = (service as any).createUserFriendlyMessage(
        error,
        mockContext,
      );

      expect(message).toContain('unexpected error occurred');
    });
  });

  describe('calculateExponentialBackoff', () => {
    it('should calculate correct backoff delays', () => {
      const delay1 = (service as any).calculateExponentialBackoff(1);
      const delay2 = (service as any).calculateExponentialBackoff(2);
      const delay3 = (service as any).calculateExponentialBackoff(3);

      // First delay should be around 1000ms (base delay)
      expect(delay1).toBeGreaterThanOrEqual(750); // With jitter
      expect(delay1).toBeLessThan(1250);

      // Second delay should be around 2000ms (base * multiplier)
      expect(delay2).toBeGreaterThanOrEqual(1500);
      expect(delay2).toBeLessThan(2500);

      // Third delay should be around 4000ms (base * multiplier^2)
      expect(delay3).toBeGreaterThanOrEqual(3000);
      expect(delay3).toBeLessThan(5000);
    });

    it('should respect maximum delay limit', () => {
      const delay = (service as any).calculateExponentialBackoff(10); // Very high attempt

      expect(delay).toBeLessThanOrEqual(30000 * 1.25); // Max delay + max jitter
    });

    it('should respect minimum delay limit', () => {
      const delay = (service as any).calculateExponentialBackoff(1);

      expect(delay).toBeGreaterThanOrEqual(100); // Minimum delay
    });
  });

  describe('trackErrorMetrics', () => {
    it('should track error metrics correctly', () => {
      const error = new Error('Test error');
      error.name = 'TestError';

      (service as any).trackErrorMetrics('test-user', error);

      const metrics = (service as any).errorMetrics.get('test-user');
      expect(metrics).toBeDefined();
      expect(metrics.totalErrors).toBe(1);
      expect(metrics.errorsByType.get('TestError')).toBe(1);
      expect(metrics.lastError).toBeInstanceOf(Date);
    });

    it('should accumulate error counts', () => {
      const error1 = new Error('Test error 1');
      error1.name = 'TestError';
      const error2 = new Error('Test error 2');
      error2.name = 'TestError';
      const error3 = new Error('Different error');
      error3.name = 'DifferentError';

      (service as any).trackErrorMetrics('test-user', error1);
      (service as any).trackErrorMetrics('test-user', error2);
      (service as any).trackErrorMetrics('test-user', error3);

      const metrics = (service as any).errorMetrics.get('test-user');
      expect(metrics.totalErrors).toBe(3);
      expect(metrics.errorsByType.get('TestError')).toBe(2);
      expect(metrics.errorsByType.get('DifferentError')).toBe(1);
    });
  });
});

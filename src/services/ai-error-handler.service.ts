import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIAssistantErrorRecoveryService } from './ai-assistant-error-recovery.service';
import {
  OpenRouterService,
  ModelSelection,
  ConversationContext,
} from './openrouter.service';
import {
  AIServiceUnavailableException,
  CircuitBreakerOpenException,
  AIModelTimeoutException,
  RateLimitExceededException,
} from '../common/exceptions/ai-assistant.exception';

export interface AIErrorContext {
  userId?: string;
  conversationId?: string;
  query: string;
  modelId?: string;
  provider?: string;
  attemptNumber: number;
  timestamp: Date;
}

export interface BudgetConstraintError extends Error {
  name: 'BudgetConstraintError';
  remainingBudget: number;
  requestedCost: number;
  budgetUtilization: number;
}

export interface ModelFailureError extends Error {
  name: 'ModelFailureError';
  modelId: string;
  provider: string;
  failureReason: string;
  isRetryable: boolean;
}

export interface TimeoutError extends Error {
  name: 'TimeoutError';
  timeoutMs: number;
  elapsedMs: number;
}

export interface AIErrorHandlerResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  fallbackUsed: boolean;
  degradationLevel: 'none' | 'partial' | 'full';
  recoveryMethod:
    | 'retry'
    | 'fallback'
    | 'circuit_breaker'
    | 'fallback_model'
    | 'fallback_response'
    | 'budget_degradation'
    | 'none';
  attempts: number;
  totalTime: number;
  userMessage: string;
}

export interface FallbackStrategy {
  type:
    | 'cheaper_model'
    | 'cached_response'
    | 'template_response'
    | 'knowledge_base';
  priority: number;
  estimatedQuality: number;
  estimatedCost: number;
}

@Injectable()
export class AIErrorHandlerService {
  private readonly logger = new Logger(AIErrorHandlerService.name);

  private readonly config: {
    enableAutomaticFallback: boolean;
    enableBudgetDegradation: boolean;
    maxRetryAttempts: number;
    timeoutMs: number;
    budgetWarningThreshold: number;
    budgetCriticalThreshold: number;
    fallbackStrategies: FallbackStrategy[];
  };

  private readonly errorMetrics = new Map<
    string,
    {
      totalErrors: number;
      errorsByType: Map<string, number>;
      lastError: Date;
      recoverySuccessRate: number;
    }
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly errorRecoveryService: AIAssistantErrorRecoveryService,
    private readonly openRouterService: OpenRouterService,
  ) {
    this.config = {
      enableAutomaticFallback:
        this.configService.get<boolean>(
          'ai.errorHandler.enableAutomaticFallback',
        ) ?? true,
      enableBudgetDegradation:
        this.configService.get<boolean>(
          'ai.errorHandler.enableBudgetDegradation',
        ) ?? true,
      maxRetryAttempts:
        this.configService.get<number>('ai.errorHandler.maxRetryAttempts') || 3,
      timeoutMs:
        this.configService.get<number>('ai.errorHandler.timeoutMs') || 30000,
      budgetWarningThreshold:
        this.configService.get<number>(
          'ai.errorHandler.budgetWarningThreshold',
        ) || 0.8,
      budgetCriticalThreshold:
        this.configService.get<number>(
          'ai.errorHandler.budgetCriticalThreshold',
        ) || 0.95,
      fallbackStrategies: [
        {
          type: 'cheaper_model',
          priority: 1,
          estimatedQuality: 0.75,
          estimatedCost: 0.3,
        },
        {
          type: 'cached_response',
          priority: 2,
          estimatedQuality: 0.85,
          estimatedCost: 0,
        },
        {
          type: 'knowledge_base',
          priority: 3,
          estimatedQuality: 0.65,
          estimatedCost: 0,
        },
        {
          type: 'template_response',
          priority: 4,
          estimatedQuality: 0.5,
          estimatedCost: 0,
        },
      ],
    };

    this.logger.log('AI Error Handler service initialized');
  }

  /**
   * Execute AI operation with comprehensive error handling
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: AIErrorContext,
    fallbackOperation?: () => Promise<T>,
  ): Promise<AIErrorHandlerResult<T>> {
    const startTime = Date.now();
    const serviceName = `ai-model-${context.modelId || 'unknown'}`;

    try {
      // Check budget constraints before execution
      if (context.userId) {
        await this.checkBudgetConstraints(context.userId);
      }

      // Execute with recovery
      const recoveryResult =
        await this.errorRecoveryService.executeWithRecovery(
          operation,
          serviceName,
          `AI operation for user ${context.userId}`,
          {
            maxAttempts: this.config.maxRetryAttempts,
          },
        );

      if (recoveryResult.success) {
        return {
          success: true,
          result: recoveryResult.result,
          fallbackUsed: false,
          degradationLevel: 'none',
          recoveryMethod: recoveryResult.recoveryMethod,
          attempts: recoveryResult.attempts.length,
          totalTime: recoveryResult.totalTime,
          userMessage: 'Operation completed successfully',
        };
      }

      // Primary operation failed, try fallback strategies
      if (this.config.enableAutomaticFallback && fallbackOperation) {
        this.logger.warn(
          `Primary operation failed, attempting fallback for user ${context.userId}`,
        );

        const fallbackResult = await this.executeFallbackStrategy(
          fallbackOperation,
          context,
          recoveryResult.error!,
        );

        return fallbackResult;
      }

      // No fallback available or disabled
      return {
        success: false,
        error: recoveryResult.error,
        fallbackUsed: false,
        degradationLevel: 'full',
        recoveryMethod: 'none',
        attempts: recoveryResult.attempts.length,
        totalTime: Date.now() - startTime,
        userMessage: this.createUserFriendlyMessage(
          recoveryResult.error!,
          context,
        ),
      };
    } catch (error) {
      this.logger.error(
        `Error in AI operation: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Track error metrics
      this.trackErrorMetrics(context.userId || 'anonymous', error as Error);

      return {
        success: false,
        error: error as Error,
        fallbackUsed: false,
        degradationLevel: 'full',
        recoveryMethod: 'none',
        attempts: context.attemptNumber,
        totalTime: Date.now() - startTime,
        userMessage: this.createUserFriendlyMessage(error as Error, context),
      };
    }
  }

  /**
   * Handle model failure with intelligent fallback
   */
  async handleModelFailure<T>(
    originalModel: ModelSelection,
    operation: (model: ModelSelection) => Promise<T>,
    context: AIErrorContext,
  ): Promise<AIErrorHandlerResult<T>> {
    const startTime = Date.now();

    this.logger.warn(
      `Model ${originalModel.modelId} failed, attempting fallback`,
    );

    try {
      // Get conversation context for model selection
      const conversationContext: ConversationContext = {
        userId: context.userId || 'anonymous',
        conversationId: context.conversationId || 'unknown',
        messageCount: 0,
        averageResponseTime: 1500,
      };

      // Select alternative model (cheaper and faster)
      const fallbackModel = await this.openRouterService.selectOptimalModel(
        context.query,
        conversationContext,
        {
          maxCost: originalModel.estimatedCost * 0.5, // Use cheaper model
          prioritizeSpeed: true,
        },
      );

      // Ensure we don't use the same failed model
      if (fallbackModel.modelId === originalModel.modelId) {
        throw new Error('No alternative model available');
      }

      this.logger.log(`Falling back to model: ${fallbackModel.modelId}`);

      // Execute with fallback model
      const result = await operation(fallbackModel);

      return {
        success: true,
        result,
        fallbackUsed: true,
        degradationLevel: 'partial',
        recoveryMethod: 'fallback_model',
        attempts: context.attemptNumber + 1,
        totalTime: Date.now() - startTime,
        userMessage: 'Response generated using alternative AI model',
      };
    } catch (error) {
      this.logger.error(
        `Fallback model also failed: ${(error as Error).message}`,
      );

      return {
        success: false,
        error: error as Error,
        fallbackUsed: true,
        degradationLevel: 'full',
        recoveryMethod: 'fallback_model',
        attempts: context.attemptNumber + 1,
        totalTime: Date.now() - startTime,
        userMessage: this.createUserFriendlyMessage(error as Error, context),
      };
    }
  }

  /**
   * Handle timeout with retry and exponential backoff
   */
  async handleTimeout<T>(
    operation: () => Promise<T>,
    context: AIErrorContext,
    timeoutMs: number = this.config.timeoutMs,
  ): Promise<AIErrorHandlerResult<T>> {
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetryAttempts; attempt++) {
      try {
        this.logger.debug(
          `Timeout-protected operation attempt ${attempt}/${this.config.maxRetryAttempts}`,
        );

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            const error: TimeoutError = new Error(
              `Operation timed out after ${timeoutMs}ms`,
            ) as TimeoutError;
            error.name = 'TimeoutError';
            error.timeoutMs = timeoutMs;
            error.elapsedMs = Date.now() - startTime;
            reject(error);
          }, timeoutMs);
        });

        // Race between operation and timeout
        const result = await Promise.race([operation(), timeoutPromise]);

        return {
          success: true,
          result,
          fallbackUsed: false,
          degradationLevel: 'none',
          recoveryMethod: attempt > 1 ? 'retry' : 'none',
          attempts: attempt,
          totalTime: Date.now() - startTime,
          userMessage: 'Operation completed successfully',
        };
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.maxRetryAttempts) {
          const delay = this.calculateExponentialBackoff(attempt);
          this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      fallbackUsed: false,
      degradationLevel: 'full',
      recoveryMethod: 'retry',
      attempts: this.config.maxRetryAttempts,
      totalTime: Date.now() - startTime,
      userMessage:
        'The AI service is taking longer than usual. Please try again or rephrase your question.',
    };
  }

  /**
   * Handle budget constraints with graceful degradation
   */
  async handleBudgetConstraint<T>(
    operation: (degradedMode: boolean) => Promise<T>,
    context: AIErrorContext,
  ): Promise<AIErrorHandlerResult<T>> {
    const startTime = Date.now();

    if (!context.userId) {
      throw new Error('User ID required for budget constraint handling');
    }

    try {
      const budgetStatus = await this.openRouterService.getBudgetStatus(
        context.userId,
      );

      // Check budget utilization level
      if (
        budgetStatus.budgetUtilization >= this.config.budgetCriticalThreshold
      ) {
        this.logger.warn(
          `Critical budget threshold reached for user ${context.userId}`,
        );

        if (!this.config.enableBudgetDegradation) {
          const error: BudgetConstraintError = new Error(
            'Budget limit exceeded',
          ) as BudgetConstraintError;
          error.name = 'BudgetConstraintError';
          error.remainingBudget = budgetStatus.remainingBudget;
          error.requestedCost = 0;
          error.budgetUtilization = budgetStatus.budgetUtilization;
          throw error;
        }

        // Use degraded mode (cheaper models, cached responses)
        const result = await operation(true);

        return {
          success: true,
          result,
          fallbackUsed: true,
          degradationLevel: 'full',
          recoveryMethod: 'budget_degradation',
          attempts: 1,
          totalTime: Date.now() - startTime,
          userMessage:
            'Using cost-optimized AI service due to budget constraints',
        };
      } else if (
        budgetStatus.budgetUtilization >= this.config.budgetWarningThreshold
      ) {
        this.logger.warn(
          `Budget warning threshold reached for user ${context.userId}`,
        );

        // Use partial degradation (mix of normal and cheaper models)
        const result = await operation(false);

        return {
          success: true,
          result,
          fallbackUsed: false,
          degradationLevel: 'partial',
          recoveryMethod: 'none',
          attempts: 1,
          totalTime: Date.now() - startTime,
          userMessage:
            'Budget warning threshold reached, using optimized AI service',
        };
      } else {
        // Normal operation - budget is within acceptable limits
        const result = await operation(false);

        return {
          success: true,
          result,
          fallbackUsed: false,
          degradationLevel: 'none',
          recoveryMethod: 'none',
          attempts: 1,
          totalTime: Date.now() - startTime,
          userMessage: 'AI service completed successfully',
        };
      }
    } catch (error) {
      this.logger.error('Budget constraint handling failed:', error);

      // Re-throw BudgetConstraintError when budget degradation is disabled
      if (error instanceof Error && error.name === 'BudgetConstraintError') {
        return {
          success: false,
          error: error,
          fallbackUsed: false,
          degradationLevel: 'full',
          recoveryMethod: 'none',
          attempts: 1,
          totalTime: Date.now() - startTime,
          userMessage: this.createUserFriendlyMessage(error, context),
        };
      }

      // Fallback to normal operation if budget checking fails (for other errors)
      try {
        const result = await operation(false);
        return {
          success: true,
          result,
          fallbackUsed: false,
          degradationLevel: 'none',
          recoveryMethod: 'none',
          attempts: 1,
          totalTime: Date.now() - startTime,
          userMessage: 'AI service completed (budget check failed)',
        };
      } catch (fallbackError) {
        throw fallbackError;
      }
    }
  }

  /**
   * Check budget constraints for a user
   */
  async checkBudgetConstraints(userId: string): Promise<void> {
    try {
      const budgetStatus = await this.openRouterService.getBudgetStatus(userId);

      if (
        budgetStatus.budgetUtilization >= this.config.budgetCriticalThreshold
      ) {
        const error: BudgetConstraintError = new Error(
          'Budget limit exceeded',
        ) as BudgetConstraintError;
        error.name = 'BudgetConstraintError';
        error.remainingBudget = budgetStatus.remainingBudget;
        error.requestedCost = 0;
        error.budgetUtilization = budgetStatus.budgetUtilization;
        throw error;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'BudgetConstraintError') {
        throw error;
      }
      // Log budget check failure but don't block operation
      this.logger.warn(
        `Budget constraint check failed for user ${userId}:`,
        error,
      );
    }
  }

  /**
   * Execute fallback strategy when primary operation fails
   */
  private async executeFallbackStrategy<T>(
    fallbackOperation: () => Promise<T>,
    context: AIErrorContext,
    _originalError: Error,
  ): Promise<AIErrorHandlerResult<T>> {
    const startTime = Date.now();

    try {
      this.logger.log(`Executing fallback strategy for user ${context.userId}`);

      const result = await fallbackOperation();

      return {
        success: true,
        result,
        fallbackUsed: true,
        degradationLevel: 'partial',
        recoveryMethod: 'fallback_response',
        attempts: context.attemptNumber + 1,
        totalTime: Date.now() - startTime,
        userMessage: 'Response generated using fallback method',
      };
    } catch (fallbackError) {
      this.logger.error(
        `Fallback strategy also failed: ${(fallbackError as Error).message}`,
      );

      return {
        success: false,
        error: fallbackError as Error,
        fallbackUsed: true,
        degradationLevel: 'full',
        recoveryMethod: 'fallback_response',
        attempts: context.attemptNumber + 1,
        totalTime: Date.now() - startTime,
        userMessage: this.createUserFriendlyMessage(
          fallbackError as Error,
          context,
        ),
      };
    }
  }

  /**
   * Create user-friendly error messages
   */
  private createUserFriendlyMessage(
    error: Error,
    _context: AIErrorContext,
  ): string {
    if (error.name === 'BudgetConstraintError') {
      return 'Your AI usage budget has been exceeded. Please contact support or upgrade your plan.';
    }

    if (error.name === 'ModelFailureError') {
      return "The AI model is temporarily unavailable. We're using an alternative model for your request.";
    }

    if (error.name === 'TimeoutError') {
      return 'The AI service is taking longer than usual. Please try again or rephrase your question.';
    }

    if (error instanceof AIServiceUnavailableException) {
      return 'The AI service is temporarily unavailable. Please try again in a few moments.';
    }

    if (error instanceof RateLimitExceededException) {
      return 'Too many requests. Please wait a moment before trying again.';
    }

    if (error instanceof CircuitBreakerOpenException) {
      return 'The AI service is temporarily unavailable due to high error rates. Please try again later.';
    }

    if (error instanceof AIModelTimeoutException) {
      return 'The AI model took too long to respond. Please try again with a shorter or simpler request.';
    }

    // Generic fallback message
    return 'An unexpected error occurred with the AI service. Please try again or contact support if the problem persists.';
  }

  /**
   * Track error metrics for monitoring and analysis
   */
  private trackErrorMetrics(userId: string, error: Error): void {
    const userMetrics = this.errorMetrics.get(userId) || {
      totalErrors: 0,
      errorsByType: new Map<string, number>(),
      lastError: new Date(),
      recoverySuccessRate: 0,
    };

    userMetrics.totalErrors++;
    userMetrics.lastError = new Date();

    const errorType = error.name || 'UnknownError';
    const currentCount = userMetrics.errorsByType.get(errorType) || 0;
    userMetrics.errorsByType.set(errorType, currentCount + 1);

    this.errorMetrics.set(userId, userMetrics);

    // Log error for monitoring
    this.logger.error(
      `Error tracked for user ${userId}: ${errorType} - ${error.message}`,
    );
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateExponentialBackoff(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const backoffMultiplier = 2;

    const delay = Math.min(
      baseDelay * Math.pow(backoffMultiplier, attempt - 1),
      maxDelay,
    );

    // Add jitter (±25% randomization)
    const jitter = delay * 0.25 * (Math.random() - 0.5);

    return Math.max(100, delay + jitter); // Minimum 100ms delay
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

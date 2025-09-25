import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIServiceUnavailableException,
  CircuitBreakerOpenException,
  AIModelTimeoutException,
  RateLimitExceededException,
} from '../common/exceptions/ai-assistant.exception';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface RecoveryAttempt {
  attemptNumber: number;
  timestamp: Date;
  error: Error;
  recoveryAction: string;
  success: boolean;
  responseTime?: number;
}

export interface RecoveryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: RecoveryAttempt[];
  totalTime: number;
  recoveryMethod: 'retry' | 'fallback' | 'circuit_breaker' | 'none';
}

export interface ServiceHealthStatus {
  serviceName: string;
  isHealthy: boolean;
  lastError?: Error;
  errorCount: number;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  consecutiveFailures: number;
  averageResponseTime: number;
  circuitBreakerOpen: boolean;
}

@Injectable()
export class AIAssistantErrorRecoveryService {
  private readonly logger = new Logger(AIAssistantErrorRecoveryService.name);

  private readonly retryConfig: RetryConfig;
  private readonly serviceHealth = new Map<string, ServiceHealthStatus>();
  private readonly circuitBreakers = new Map<
    string,
    {
      isOpen: boolean;
      failureCount: number;
      lastFailureTime: Date;
      nextRetryTime: Date;
    }
  >();

  constructor(private readonly configService: ConfigService) {
    this.retryConfig = {
      maxAttempts: this.configService.get<number>('ai.retry.maxAttempts') || 3,
      baseDelayMs:
        this.configService.get<number>('ai.retry.baseDelayMs') || 1000,
      maxDelayMs:
        this.configService.get<number>('ai.retry.maxDelayMs') || 30000,
      backoffMultiplier:
        this.configService.get<number>('ai.retry.backoffMultiplier') || 2,
      retryableErrors: this.configService.get<string[]>(
        'ai.retry.retryableErrors',
      ) || [
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'AI_SERVICE_UNAVAILABLE',
        'AI_MODEL_TIMEOUT',
        'RATE_LIMIT_EXCEEDED',
      ],
    };

    this.logger.log('AI Assistant Error Recovery service initialized');
  }

  /**
   * Execute operation with automatic retry and recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    serviceName: string,
    operationName: string,
    customRetryConfig?: Partial<RetryConfig>,
  ): Promise<RecoveryResult<T>> {
    const startTime = Date.now();
    const config = { ...this.retryConfig, ...customRetryConfig };
    const attempts: RecoveryAttempt[] = [];

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(serviceName)) {
      const error = new CircuitBreakerOpenException(
        serviceName,
        this.getCircuitBreakerResetTime(serviceName),
      );
      return {
        success: false,
        error,
        attempts: [],
        totalTime: Date.now() - startTime,
        recoveryMethod: 'circuit_breaker',
      };
    }

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      const attemptStartTime = Date.now();

      try {
        this.logger.debug(
          `Executing ${operationName} attempt ${attempt}/${config.maxAttempts}`,
        );

        const result = await operation();
        const responseTime = Date.now() - attemptStartTime;

        // Record successful attempt
        attempts.push({
          attemptNumber: attempt,
          timestamp: new Date(),
          error: null as any,
          recoveryAction: attempt === 1 ? 'initial_attempt' : 'retry_success',
          success: true,
          responseTime,
        });

        // Update service health
        this.updateServiceHealth(serviceName, true, responseTime);
        this.resetCircuitBreaker(serviceName);

        this.logger.debug(`${operationName} succeeded on attempt ${attempt}`);

        return {
          success: true,
          result,
          attempts,
          totalTime: Date.now() - startTime,
          recoveryMethod: attempt === 1 ? 'none' : 'retry',
        };
      } catch (error) {
        const responseTime = Date.now() - attemptStartTime;

        // Record failed attempt
        attempts.push({
          attemptNumber: attempt,
          timestamp: new Date(),
          error: error as Error,
          recoveryAction: this.determineRecoveryAction(
            error as Error,
            attempt,
            config.maxAttempts,
          ),
          success: false,
          responseTime,
        });

        // Check if error is retryable
        if (
          !this.isRetryableError(error as Error) ||
          attempt === config.maxAttempts
        ) {
          this.logger.error(
            `${operationName} failed permanently after ${attempt} attempts: ${(error as Error).message}`,
          );

          // Update circuit breaker on final failure
          this.updateCircuitBreaker(serviceName);

          // Update service health after circuit breaker is updated
          this.updateServiceHealth(
            serviceName,
            false,
            responseTime,
            error as Error,
          );

          return {
            success: false,
            error: error as Error,
            attempts,
            totalTime: Date.now() - startTime,
            recoveryMethod: 'none',
          };
        }

        // Update service health for non-final failures
        this.updateServiceHealth(
          serviceName,
          false,
          responseTime,
          error as Error,
        );

        // Calculate delay for next attempt
        const delay = this.calculateRetryDelay(attempt, config);

        this.logger.warn(
          `${operationName} attempt ${attempt} failed: ${(error as Error).message}. Retrying in ${delay}ms`,
        );

        // Wait before next attempt
        if (attempt < config.maxAttempts) {
          await this.sleep(delay);
        }
      }
    }

    // This should never be reached, but included for completeness
    const finalError = new Error(`All ${config.maxAttempts} attempts failed`);
    return {
      success: false,
      error: finalError,
      attempts,
      totalTime: Date.now() - startTime,
      recoveryMethod: 'retry',
    };
  }

  /**
   * Execute operation with graceful degradation
   */
  async executeWithGracefulDegradation<T, F>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<F>,
    serviceName: string,
    operationName: string,
  ): Promise<{ result: T | F; usedFallback: boolean; error?: Error }> {
    try {
      // Try primary operation first
      const result = await this.executeWithRecovery(
        primaryOperation,
        serviceName,
        operationName,
      );

      if (result.success) {
        return {
          result: result.result!,
          usedFallback: false,
        };
      }

      // Primary failed, try fallback
      this.logger.warn(
        `Primary operation failed, attempting fallback for ${operationName}`,
      );

      const fallbackResult = await fallbackOperation();

      return {
        result: fallbackResult,
        usedFallback: true,
        error: result.error,
      };
    } catch (error) {
      this.logger.error(
        `Both primary and fallback operations failed for ${operationName}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Get service health status
   */
  getServiceHealth(serviceName: string): ServiceHealthStatus {
    return (
      this.serviceHealth.get(serviceName) || {
        serviceName,
        isHealthy: true,
        errorCount: 0,
        consecutiveFailures: 0,
        averageResponseTime: 0,
        circuitBreakerOpen: false,
      }
    );
  }

  /**
   * Get all service health statuses
   */
  getAllServiceHealth(): ServiceHealthStatus[] {
    return Array.from(this.serviceHealth.values());
  }

  /**
   * Reset service health status
   */
  resetServiceHealth(serviceName: string): void {
    this.serviceHealth.delete(serviceName);
    this.resetCircuitBreaker(serviceName);
    this.logger.log(`Reset health status for service: ${serviceName}`);
  }

  /**
   * Check if circuit breaker is open for a service
   */
  isCircuitBreakerOpen(serviceName: string): boolean {
    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) return false;

    // Check if it's time to try again
    if (breaker.isOpen && new Date() >= breaker.nextRetryTime) {
      this.logger.log(`Circuit breaker half-open for service: ${serviceName}`);
      breaker.isOpen = false; // Move to half-open state
    }

    return breaker.isOpen;
  }

  /**
   * Get circuit breaker reset time
   */
  getCircuitBreakerResetTime(serviceName: string): Date | undefined {
    const breaker = this.circuitBreakers.get(serviceName);
    return breaker?.nextRetryTime;
  }

  /**
   * Manually open circuit breaker
   */
  openCircuitBreaker(serviceName: string, durationMs: number = 60000): void {
    const breaker = this.circuitBreakers.get(serviceName) || {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: new Date(),
      nextRetryTime: new Date(),
    };

    breaker.isOpen = true;
    breaker.nextRetryTime = new Date(Date.now() + durationMs);

    this.circuitBreakers.set(serviceName, breaker);
    this.logger.warn(
      `Manually opened circuit breaker for service: ${serviceName}`,
    );
  }

  /**
   * Manually close circuit breaker
   */
  closeCircuitBreaker(serviceName: string): void {
    this.resetCircuitBreaker(serviceName);
    this.logger.log(
      `Manually closed circuit breaker for service: ${serviceName}`,
    );
  }

  /**
   * Create informative error message for users
   */
  createUserFriendlyErrorMessage(error: Error, serviceName: string): string {
    if (error instanceof AIServiceUnavailableException) {
      return `The AI assistant is temporarily unavailable. Please try again in a few minutes, or I can provide alternative guidance using our knowledge base.`;
    }

    if (error instanceof CircuitBreakerOpenException) {
      const resetTime = this.getCircuitBreakerResetTime(serviceName);
      const resetTimeStr = resetTime
        ? ` (service will retry at ${resetTime.toLocaleTimeString()})`
        : '';
      return `The AI service is temporarily disabled due to repeated failures${resetTimeStr}. I can still help you using our knowledge base and templates.`;
    }

    if (error instanceof AIModelTimeoutException) {
      return `The AI service is taking longer than usual to respond. This might be due to high demand. Please try rephrasing your question or I can provide guidance from our knowledge base.`;
    }

    if (error instanceof RateLimitExceededException) {
      return `You've reached the AI service usage limit. Please wait a moment before trying again, or I can help you using our knowledge base and guidelines.`;
    }

    // Generic error message
    return `I'm experiencing technical difficulties with the AI service right now. I can still assist you using our knowledge base, templates, and guidelines. Would you like me to try that instead?`;
  }

  /**
   * Get recovery recommendations for administrators
   */
  getRecoveryRecommendations(serviceName: string): string[] {
    const health = this.getServiceHealth(serviceName);
    const recommendations: string[] = [];

    if (health.consecutiveFailures >= 5) {
      recommendations.push('Check service connectivity and authentication');
      recommendations.push('Verify API endpoints and configuration');
    }

    if (health.averageResponseTime > 10000) {
      recommendations.push('Investigate service performance issues');
      recommendations.push('Consider scaling or optimizing the service');
    }

    if (health.circuitBreakerOpen) {
      recommendations.push(
        'Circuit breaker is open - service will retry automatically',
      );
      recommendations.push('Monitor service logs for underlying issues');
    }

    if (health.errorCount > 100) {
      recommendations.push(
        'High error count detected - investigate service stability',
      );
      recommendations.push('Consider implementing additional monitoring');
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Service appears healthy - no immediate action required',
      );
    }

    return recommendations;
  }

  /**
   * Update service health status
   */
  private updateServiceHealth(
    serviceName: string,
    success: boolean,
    responseTime: number,
    error?: Error,
  ): void {
    const health = this.serviceHealth.get(serviceName) || {
      serviceName,
      isHealthy: true,
      errorCount: 0,
      consecutiveFailures: 0,
      averageResponseTime: 0,
      circuitBreakerOpen: false,
    };

    if (success) {
      health.isHealthy = true;
      health.lastSuccessAt = new Date();
      health.consecutiveFailures = 0;
      health.averageResponseTime =
        (health.averageResponseTime + responseTime) / 2;
    } else {
      health.isHealthy = false;
      health.lastError = error;
      health.lastFailureAt = new Date();
      health.errorCount += 1;
      health.consecutiveFailures += 1;
    }

    health.circuitBreakerOpen = this.isCircuitBreakerOpen(serviceName);
    this.serviceHealth.set(serviceName, health);
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(serviceName: string): void {
    const breaker = this.circuitBreakers.get(serviceName) || {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: new Date(),
      nextRetryTime: new Date(),
    };

    breaker.failureCount += 1;
    breaker.lastFailureTime = new Date();

    // Open circuit breaker after 5 consecutive failures
    if (breaker.failureCount >= 5) {
      breaker.isOpen = true;
      breaker.nextRetryTime = new Date(Date.now() + 60000); // 1 minute
      this.logger.warn(`Circuit breaker opened for service: ${serviceName}`);
    }

    this.circuitBreakers.set(serviceName, breaker);
  }

  /**
   * Reset circuit breaker
   */
  private resetCircuitBreaker(serviceName: string): void {
    const breaker = this.circuitBreakers.get(serviceName);
    if (breaker) {
      breaker.isOpen = false;
      breaker.failureCount = 0;
      this.circuitBreakers.set(serviceName, breaker);
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Check error code/type
    if (
      error instanceof AIServiceUnavailableException ||
      error instanceof AIModelTimeoutException ||
      error instanceof RateLimitExceededException
    ) {
      return true;
    }

    // Check error message for retryable patterns
    const errorMessage = error.message.toLowerCase();
    return this.retryConfig.retryableErrors.some((retryableError) =>
      errorMessage.includes(retryableError.toLowerCase()),
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    const delay =
      config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelayMs);
  }

  /**
   * Determine recovery action for logging
   */
  private determineRecoveryAction(
    error: Error,
    attempt: number,
    maxAttempts: number,
  ): string {
    if (attempt === maxAttempts) {
      return 'final_failure';
    }

    if (this.isRetryableError(error)) {
      return 'retry_scheduled';
    }

    return 'non_retryable_error';
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get retry configuration
   */
  getRetryConfiguration(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Update retry configuration
   */
  updateRetryConfiguration(updates: Partial<RetryConfig>): void {
    Object.assign(this.retryConfig, updates);
    this.logger.log('Retry configuration updated');
  }
}

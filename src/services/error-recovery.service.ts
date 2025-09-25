import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Recommendation } from '../entities/recommendation.entity';
import { RecommendationResultDto } from '../dto/recommendation';
import {
  AIServiceException,
  RateLimitExceededException,
  CircuitBreakerOpenException,
  AIModelTimeoutException,
} from '../common/exceptions/app.exception';

export interface RecoveryOptions {
  useCachedResults?: boolean;
  fallbackToRuleBased?: boolean;
  maxCacheAge?: number; // in milliseconds
  includeRecoveryMessage?: boolean;
}

export interface RecoveryResult<T> {
  data: T;
  recoveryMethod: 'cache' | 'fallback' | 'degraded' | 'none';
  recoveryMessage?: string;
  originalError?: Error;
}

@Injectable()
export class ErrorRecoveryService {
  private readonly logger = new Logger(ErrorRecoveryService.name);

  constructor(
    @InjectRepository(Recommendation)
    private readonly recommendationRepository: Repository<Recommendation>,
  ) {}

  /**
   * Attempt to recover from AI service errors with graceful degradation
   */
  async recoverFromAIError<T>(
    error: Error,
    studentId: string,
    fallbackFn?: () => Promise<T>,
    options: RecoveryOptions = {},
  ): Promise<RecoveryResult<T | RecommendationResultDto>> {
    const {
      useCachedResults = true,
      fallbackToRuleBased = true,
      maxCacheAge = 3600000, // 1 hour
      includeRecoveryMessage = true,
    } = options;

    this.logger.warn(`Attempting recovery from AI error: ${error.message}`, {
      errorType: error.constructor.name,
      studentId,
    });

    // Try cached results first
    if (useCachedResults) {
      try {
        const cachedResult = await this.getCachedRecommendations(
          studentId,
          maxCacheAge,
        );
        if (cachedResult) {
          const recoveryMessage = this.generateRecoveryMessage(error, 'cache');

          return {
            data: this.addRecoveryMessageToResult(
              cachedResult,
              recoveryMessage,
              includeRecoveryMessage,
            ),
            recoveryMethod: 'cache',
            recoveryMessage: includeRecoveryMessage
              ? recoveryMessage
              : undefined,
            originalError: error,
          };
        }
      } catch (cacheError) {
        this.logger.warn(`Cache recovery failed: ${cacheError.message}`);
      }
    }

    // Try fallback function if provided
    if (fallbackToRuleBased && fallbackFn) {
      try {
        const fallbackResult = await fallbackFn();
        const recoveryMessage = this.generateRecoveryMessage(error, 'fallback');

        return {
          data: this.addRecoveryMessageToResult(
            fallbackResult,
            recoveryMessage,
            includeRecoveryMessage,
          ),
          recoveryMethod: 'fallback',
          recoveryMessage: includeRecoveryMessage ? recoveryMessage : undefined,
          originalError: error,
        };
      } catch (fallbackError) {
        this.logger.error(`Fallback recovery failed: ${fallbackError.message}`);
      }
    }

    // If all recovery methods fail, provide degraded service
    const degradedResult = this.createDegradedResponse(error, studentId);
    const recoveryMessage = this.generateRecoveryMessage(error, 'degraded');

    return {
      data: this.addRecoveryMessageToResult(
        degradedResult,
        recoveryMessage,
        includeRecoveryMessage,
      ),
      recoveryMethod: 'degraded',
      recoveryMessage: includeRecoveryMessage ? recoveryMessage : undefined,
      originalError: error,
    };
  }

  /**
   * Get cached recommendations if available and not too old
   */
  private async getCachedRecommendations(
    studentId: string,
    maxAge: number,
  ): Promise<RecommendationResultDto | null> {
    const cutoffTime = new Date(Date.now() - maxAge);

    const cachedRecommendation = await this.recommendationRepository
      .createQueryBuilder('recommendation')
      .where('recommendation.studentId = :studentId', { studentId })
      .andWhere('recommendation.createdAt > :cutoffTime', { cutoffTime })
      .orderBy('recommendation.createdAt', 'DESC')
      .getOne();

    if (!cachedRecommendation) {
      return null;
    }

    // Convert entity to DTO format
    return {
      recommendations: cachedRecommendation.projectSuggestions,
      reasoning: cachedRecommendation.reasoning,
      averageSimilarityScore: Number(
        cachedRecommendation.averageSimilarityScore,
      ),
      fromCache: true,
      generatedAt: cachedRecommendation.createdAt,
      expiresAt: cachedRecommendation.expiresAt || undefined,
      metadata: {
        method: 'cached-recovery',
        fallback: false,
        projectsAnalyzed: cachedRecommendation.projectSuggestions.length,
        cacheHitRate: 1.0,
        processingTimeMs: 0,
        originalGenerationTime: cachedRecommendation.createdAt,
      },
    };
  }

  /**
   * Create a degraded response when all recovery methods fail
   */
  private createDegradedResponse(
    error: Error,
    studentId: string,
  ): RecommendationResultDto {
    return {
      recommendations: [],
      reasoning: this.generateDegradedReasoning(error),
      averageSimilarityScore: 0,
      fromCache: false,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 300000), // 5 minutes
      metadata: {
        method: 'degraded-service',
        fallback: true,
        projectsAnalyzed: 0,
        cacheHitRate: 0,
        processingTimeMs: 0,
        error: error.message,
        errorType: error.constructor.name,
      },
    };
  }

  /**
   * Generate appropriate recovery message based on error type and recovery method
   */
  private generateRecoveryMessage(
    error: Error,
    recoveryMethod: string,
  ): string {
    const errorMessages = {
      [AIServiceException.name]:
        'AI recommendation service is temporarily unavailable',
      [RateLimitExceededException.name]:
        'AI service rate limit has been reached',
      [CircuitBreakerOpenException.name]:
        'AI service is experiencing issues and has been temporarily disabled',
      [AIModelTimeoutException.name]: 'AI service request timed out',
    };

    const recoveryMessages = {
      cache: "We've provided your most recent recommendations from our cache",
      fallback: "We've generated recommendations using our backup system",
      degraded:
        'Service is temporarily limited. Please try again in a few minutes',
    };

    const errorType = error.constructor.name;
    const errorMessage =
      errorMessages[errorType] ||
      'An unexpected error occurred with our recommendation service';
    const recoveryMessage =
      recoveryMessages[recoveryMethod] ||
      "We're working to restore full service";

    return `${errorMessage}. ${recoveryMessage}.`;
  }

  /**
   * Generate reasoning for degraded service response
   */
  private generateDegradedReasoning(error: Error): string {
    const baseMessage =
      "We're currently unable to generate personalized recommendations due to a temporary service issue";

    if (error instanceof RateLimitExceededException) {
      return `${baseMessage}. Our AI service has reached its usage limit. Please try again later or contact support if this persists.`;
    }

    if (error instanceof CircuitBreakerOpenException) {
      return `${baseMessage}. Our recommendation system is temporarily disabled for maintenance. Please try again in a few minutes.`;
    }

    if (error instanceof AIModelTimeoutException) {
      return `${baseMessage}. The AI model is taking longer than expected to respond. Please try again with a simpler request or contact support.`;
    }

    return `${baseMessage}. Please try again in a few minutes, or browse projects manually in the meantime.`;
  }

  /**
   * Add recovery message to result if needed
   */
  private addRecoveryMessageToResult<T>(
    result: T,
    recoveryMessage: string,
    includeMessage: boolean,
  ): T {
    if (!includeMessage || !result || typeof result !== 'object') {
      return result;
    }

    // If it's a RecommendationResultDto, add recovery message to reasoning
    if ('reasoning' in result && typeof result.reasoning === 'string') {
      const modifiedResult = { ...result };
      modifiedResult.reasoning = `${recoveryMessage}\n\n${result.reasoning}`;

      // Update metadata if present
      if (
        'metadata' in modifiedResult &&
        modifiedResult.metadata &&
        typeof modifiedResult.metadata === 'object'
      ) {
        modifiedResult.metadata = {
          ...modifiedResult.metadata,
          recoveryUsed: true,
          recoveryMessage,
        };
      }

      return modifiedResult;
    }

    return result;
  }

  /**
   * Determine if error is recoverable
   */
  isRecoverableError(error: Error): boolean {
    return (
      error instanceof AIServiceException ||
      error instanceof RateLimitExceededException ||
      error instanceof CircuitBreakerOpenException ||
      error instanceof AIModelTimeoutException
    );
  }

  /**
   * Get recovery suggestions for different error types
   */
  getRecoverySuggestions(error: Error): string[] {
    if (error instanceof RateLimitExceededException) {
      return [
        'Try again in a few minutes when the rate limit resets',
        'Browse projects manually using the search and filter options',
        'Update your profile to get better cached recommendations',
      ];
    }

    if (error instanceof CircuitBreakerOpenException) {
      return [
        'Wait a few minutes for the service to recover automatically',
        'Check our status page for service updates',
        'Use the manual project search as an alternative',
      ];
    }

    if (error instanceof AIModelTimeoutException) {
      return [
        'Simplify your profile information and try again',
        'Check your internet connection',
        'Try again during off-peak hours',
      ];
    }

    if (error instanceof AIServiceException) {
      return [
        'Try again in a few minutes',
        'Clear your browser cache and reload the page',
        'Contact support if the issue persists',
      ];
    }

    return [
      'Refresh the page and try again',
      'Check your internet connection',
      'Contact support if the problem continues',
    ];
  }

  /**
   * Log recovery attempt for monitoring
   */
  logRecoveryAttempt(
    error: Error,
    recoveryMethod: string,
    success: boolean,
    studentId?: string,
  ): void {
    this.logger.log(`Recovery attempt: ${recoveryMethod}`, {
      errorType: error.constructor.name,
      errorMessage: error.message,
      recoveryMethod,
      success,
      studentId,
      timestamp: new Date().toISOString(),
    });
  }
}

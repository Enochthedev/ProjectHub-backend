import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HfInference } from '@huggingface/inference';
import { AIRateLimiterService } from './ai-rate-limiter.service';
import { CircuitBreakerService } from './circuit-breaker.service';

export interface ModelInfo {
  name: string;
  maxTokens: number;
  dimensions?: number;
}

export interface RateLimitStatus {
  remaining: number;
  resetTime: Date;
  monthlyUsage: number;
  monthlyLimit: number;
}

export interface QAResponse {
  answer: string;
  score: number;
  start?: number;
  end?: number;
}

export interface QARequest {
  question: string;
  context: string;
}

@Injectable()
export class HuggingFaceService {
  private readonly logger = new Logger(HuggingFaceService.name);
  private readonly hf: HfInference;
  private readonly config: {
    model: string;
    qaModel: string;
    timeout: number;
    maxTokensPerRequest: number;
    retryAttempts: number;
    retryDelayMs: number;
    qaMaxContextLength: number;
    qaMaxAnswerLength: number;
    qaConfidenceThreshold: number;
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly rateLimiterService: AIRateLimiterService,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {
    const apiKey = this.configService.get<string>('huggingFace.apiKey');

    if (!apiKey) {
      throw new Error('Hugging Face API key is required');
    }

    this.hf = new HfInference(apiKey);
    this.config = {
      model:
        this.configService.get<string>('huggingFace.model') ||
        'sentence-transformers/all-MiniLM-L6-v2',
      qaModel:
        this.configService.get<string>('huggingFace.qaModel') ||
        'distilbert-base-cased-distilled-squad',
      timeout: this.configService.get<number>('huggingFace.timeout') || 15000,
      maxTokensPerRequest:
        this.configService.get<number>('huggingFace.maxTokensPerRequest') ||
        512,
      retryAttempts:
        this.configService.get<number>('huggingFace.retryAttempts') || 3,
      retryDelayMs:
        this.configService.get<number>('huggingFace.retryDelayMs') || 1000,
      qaMaxContextLength:
        this.configService.get<number>('huggingFace.qaMaxContextLength') || 512,
      qaMaxAnswerLength:
        this.configService.get<number>('huggingFace.qaMaxAnswerLength') || 200,
      qaConfidenceThreshold:
        this.configService.get<number>('huggingFace.qaConfidenceThreshold') ||
        0.3,
    };

    this.logger.log(
      `Initialized Hugging Face service with embedding model: ${this.config.model}, Q&A model: ${this.config.qaModel}`,
    );
  }

  /**
   * Generate embeddings for given texts using the configured model
   */
  async generateEmbeddings(
    texts: string[],
    userId?: string,
  ): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    // Check rate limits before processing
    const rateLimitResult =
      await this.rateLimiterService.checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      throw new HttpException(
        {
          message: 'Rate limit exceeded',
          remainingRequests: rateLimitResult.remainingRequests,
          resetTime: rateLimitResult.resetTime,
          monthlyUsage: rateLimitResult.monthlyUsage,
          monthlyLimit: rateLimitResult.monthlyLimit,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.logger.debug(`Generating embeddings for ${texts.length} texts`);

    try {
      const embeddings: number[][] = [];

      // Process texts individually to handle token limits
      for (const text of texts) {
        const truncatedText = this.truncateText(text);
        const embedding = await this.circuitBreakerService.execute(
          'hugging-face-embeddings',
          () => this.generateSingleEmbedding(truncatedText, userId),
          {
            failureThreshold: 3,
            recoveryTimeout: 30000, // 30 seconds
            halfOpenMaxCalls: 2,
          },
        );
        embeddings.push(embedding);
      }

      this.logger.debug(
        `Successfully generated ${embeddings.length} embeddings`,
      );
      return embeddings;
    } catch (error) {
      this.logger.error(
        `Failed to generate embeddings: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate embedding for a single text
   */
  private async generateSingleEmbedding(
    text: string,
    userId?: string,
  ): Promise<number[]> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      const startTime = Date.now();
      let success = false;
      let errorMessage: string | undefined;

      try {
        const response = await Promise.race([
          this.hf.featureExtraction({
            model: this.config.model,
            inputs: text,
          }),
          this.createTimeoutPromise(this.config.timeout),
        ]);

        const endTime = Date.now();
        const responseTime = endTime - startTime;
        success = true;

        this.logger.debug(
          `Embedding generated in ${responseTime}ms (attempt ${attempt})`,
        );

        // Track successful usage
        await this.rateLimiterService.trackUsage({
          endpoint: '/embeddings',
          model: this.config.model,
          tokensUsed: Math.ceil(text.length / 4), // Approximate token count
          responseTimeMs: responseTime,
          success: true,
          userId,
        });

        // Handle different response formats
        if (Array.isArray(response)) {
          if (Array.isArray(response[0])) {
            return response[0] as number[];
          }
          return response as number[];
        }

        throw new Error('Invalid response format from Hugging Face API');
      } catch (error) {
        lastError = error;
        errorMessage = error.message;
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Track failed usage
        await this.rateLimiterService.trackUsage({
          endpoint: '/embeddings',
          model: this.config.model,
          tokensUsed: 0,
          responseTimeMs: responseTime,
          success: false,
          errorMessage,
          userId,
        });

        this.logger.warn(
          `Embedding generation attempt ${attempt} failed: ${error.message}`,
        );

        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
          await this.delay(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Get model information
   */
  getModelInfo(): ModelInfo {
    return {
      name: this.config.model,
      maxTokens: this.config.maxTokensPerRequest,
    };
  }

  /**
   * Get rate limit status for a user
   */
  async getRateLimitStatus(userId?: string): Promise<RateLimitStatus> {
    const result = await this.rateLimiterService.checkRateLimit(userId);
    return {
      remaining: result.remainingRequests,
      resetTime: result.resetTime,
      monthlyUsage: result.monthlyUsage,
      monthlyLimit: result.monthlyLimit,
    };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return this.circuitBreakerService.getStatus('hugging-face-embeddings');
  }

  /**
   * Check if the service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.circuitBreakerService.execute(
        'hugging-face-health-check',
        () => this.generateSingleEmbedding('health check'),
        {
          failureThreshold: 2,
          recoveryTimeout: 15000, // 15 seconds for health checks
          halfOpenMaxCalls: 1,
        },
      );
      return true;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Truncate text to fit within token limits
   */
  private truncateText(text: string): string {
    // Simple approximation: ~4 characters per token
    const maxChars = this.config.maxTokensPerRequest * 4;

    if (text.length <= maxChars) {
      return text;
    }

    const truncated = text.substring(0, maxChars);
    this.logger.debug(
      `Text truncated from ${text.length} to ${truncated.length} characters`,
    );

    return truncated;
  }

  /**
   * Create a timeout promise
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Get the current model name
   */
  getModelName(): string {
    return this.config.model;
  }

  /**
   * Answer a question using the configured Q&A model
   */
  async questionAnswering(
    request: QARequest,
    userId?: string,
  ): Promise<QAResponse> {
    if (!request.question || !request.context) {
      throw new Error('Question and context are required');
    }

    // Check rate limits before processing
    const rateLimitResult =
      await this.rateLimiterService.checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      throw new HttpException(
        {
          message: 'Rate limit exceeded',
          remainingRequests: rateLimitResult.remainingRequests,
          resetTime: rateLimitResult.resetTime,
          monthlyUsage: rateLimitResult.monthlyUsage,
          monthlyLimit: rateLimitResult.monthlyLimit,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.logger.debug(`Processing Q&A request: "${request.question}"`);

    try {
      const response = await this.circuitBreakerService.execute(
        'hugging-face-qa',
        () => this.processQARequest(request, userId),
        {
          failureThreshold: 3,
          recoveryTimeout: 30000, // 30 seconds
          halfOpenMaxCalls: 2,
        },
      );

      this.logger.debug(
        `Q&A response generated with confidence: ${response.score}`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to process Q&A request: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process a single Q&A request with retries
   */
  private async processQARequest(
    request: QARequest,
    userId?: string,
  ): Promise<QAResponse> {
    let lastError: Error = new Error('Unknown error');

    // Truncate context to fit within token limits
    const truncatedContext = this.truncateContext(request.context);
    const truncatedQuestion = this.truncateQuestion(request.question);

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      const startTime = Date.now();
      let success = false;
      let errorMessage: string | undefined;

      try {
        const response = await Promise.race([
          this.hf.questionAnswering({
            model: this.config.qaModel,
            inputs: {
              question: truncatedQuestion,
              context: truncatedContext,
            },
          }),
          this.createTimeoutPromise(this.config.timeout),
        ]);

        const endTime = Date.now();
        const responseTime = endTime - startTime;
        success = true;

        this.logger.debug(
          `Q&A processed in ${responseTime}ms (attempt ${attempt})`,
        );

        // Track successful usage
        await this.rateLimiterService.trackUsage({
          endpoint: '/question-answering',
          model: this.config.qaModel,
          tokensUsed: Math.ceil(
            (truncatedQuestion.length + truncatedContext.length) / 4,
          ),
          responseTimeMs: responseTime,
          success: true,
          userId,
        });

        // Validate and format response
        const qaResponse = this.validateQAResponse(response);
        return qaResponse;
      } catch (error) {
        lastError = error;
        errorMessage = error.message;
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Track failed usage
        await this.rateLimiterService.trackUsage({
          endpoint: '/question-answering',
          model: this.config.qaModel,
          tokensUsed: 0,
          responseTimeMs: responseTime,
          success: false,
          errorMessage,
          userId,
        });

        this.logger.warn(`Q&A attempt ${attempt} failed: ${error.message}`);

        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
          await this.delay(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Validate and format Q&A response
   */
  private validateQAResponse(response: any): QAResponse {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format from Hugging Face Q&A API');
    }

    const answer = response.answer || '';
    const score = typeof response.score === 'number' ? response.score : 0;

    // Validate confidence threshold
    if (score < this.config.qaConfidenceThreshold) {
      this.logger.warn(
        `Q&A response confidence (${score}) below threshold (${this.config.qaConfidenceThreshold})`,
      );
    }

    return {
      answer: answer.trim(),
      score: Math.max(0, Math.min(1, score)), // Normalize score between 0 and 1
      start: response.start,
      end: response.end,
    };
  }

  /**
   * Truncate context to fit within token limits
   */
  private truncateContext(context: string): string {
    // Reserve some tokens for the question and response
    const maxContextChars = (this.config.qaMaxContextLength - 50) * 4; // Approximate chars per token

    if (context.length <= maxContextChars) {
      return context;
    }

    // Try to truncate at sentence boundaries
    const truncated = context.substring(0, maxContextChars);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?'),
    );

    if (lastSentenceEnd > maxContextChars * 0.7) {
      // If we can preserve at least 70% of content with sentence boundary
      const result = truncated.substring(0, lastSentenceEnd + 1);
      this.logger.debug(
        `Context truncated at sentence boundary from ${context.length} to ${result.length} characters`,
      );
      return result;
    }

    this.logger.debug(
      `Context truncated from ${context.length} to ${truncated.length} characters`,
    );
    return truncated;
  }

  /**
   * Truncate question to reasonable length
   */
  private truncateQuestion(question: string): string {
    const maxQuestionChars = 200; // Reasonable question length

    if (question.length <= maxQuestionChars) {
      return question;
    }

    const truncated = question.substring(0, maxQuestionChars);
    this.logger.debug(
      `Question truncated from ${question.length} to ${truncated.length} characters`,
    );
    return truncated;
  }

  /**
   * Get Q&A model configuration
   */
  getQAModelInfo(): ModelInfo & { confidenceThreshold: number } {
    return {
      name: this.config.qaModel,
      maxTokens: this.config.qaMaxContextLength,
      confidenceThreshold: this.config.qaConfidenceThreshold,
    };
  }

  /**
   * Check if Q&A service is healthy
   */
  async qaHealthCheck(): Promise<boolean> {
    try {
      const testRequest: QARequest = {
        question: 'What is this?',
        context: 'This is a health check test for the Q&A service.',
      };

      await this.circuitBreakerService.execute(
        'hugging-face-qa-health-check',
        () => this.processQARequest(testRequest),
        {
          failureThreshold: 2,
          recoveryTimeout: 15000, // 15 seconds for health checks
          halfOpenMaxCalls: 1,
        },
      );
      return true;
    } catch (error) {
      this.logger.error(`Q&A health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

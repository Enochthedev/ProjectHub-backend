import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface LoadingProgress {
  stage: LoadingStage;
  percentage: number;
  message: string;
  estimatedTimeRemaining?: number;
  details?: string;
}

export interface QueueStatus {
  position: number;
  totalInQueue: number;
  estimatedWaitTime: number;
  averageProcessingTime: number;
}

export enum LoadingStage {
  QUEUED = 'queued',
  VALIDATING_PROFILE = 'validating_profile',
  FETCHING_PROJECTS = 'fetching_projects',
  GENERATING_EMBEDDINGS = 'generating_embeddings',
  CALCULATING_SIMILARITY = 'calculating_similarity',
  APPLYING_FILTERS = 'applying_filters',
  RANKING_RESULTS = 'ranking_results',
  GENERATING_EXPLANATIONS = 'generating_explanations',
  CACHING_RESULTS = 'caching_results',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface RecommendationRequest {
  id: string;
  studentId: string;
  startTime: Date;
  currentStage: LoadingStage;
  progress: number;
  estimatedDuration: number;
  actualDuration?: number;
}

@Injectable()
export class ProgressiveLoadingService {
  private readonly logger = new Logger(ProgressiveLoadingService.name);
  private readonly activeRequests = new Map<string, RecommendationRequest>();
  private readonly requestQueue: string[] = [];
  private readonly processingHistory: number[] = []; // Store last 50 processing times
  private readonly maxHistorySize = 50;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Start tracking a recommendation request
   */
  startRequest(requestId: string, studentId: string): void {
    const request: RecommendationRequest = {
      id: requestId,
      studentId,
      startTime: new Date(),
      currentStage: LoadingStage.QUEUED,
      progress: 0,
      estimatedDuration: this.getEstimatedDuration(),
    };

    this.activeRequests.set(requestId, request);
    this.requestQueue.push(requestId);

    this.logger.debug(
      `Started tracking request ${requestId} for student ${studentId}`,
    );
    this.emitProgress(requestId);
  }

  /**
   * Update the progress of a request
   */
  updateProgress(
    requestId: string,
    stage: LoadingStage,
    percentage: number,
    message: string,
    details?: string,
  ): void {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      this.logger.warn(`Request ${requestId} not found for progress update`);
      return;
    }

    request.currentStage = stage;
    request.progress = percentage;

    const progress: LoadingProgress = {
      stage,
      percentage,
      message,
      estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(request),
      details,
    };

    this.logger.debug(
      `Progress update for ${requestId}: ${stage} - ${percentage}%`,
    );
    this.eventEmitter.emit('recommendation.progress', {
      requestId,
      studentId: request.studentId,
      progress,
    });
  }

  /**
   * Complete a request
   */
  completeRequest(requestId: string): void {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      this.logger.warn(`Request ${requestId} not found for completion`);
      return;
    }

    const actualDuration = Date.now() - request.startTime.getTime();
    request.actualDuration = actualDuration;
    request.currentStage = LoadingStage.COMPLETED;
    request.progress = 100;

    // Store processing time for future estimates
    this.addProcessingTime(actualDuration);

    // Remove from queue and active requests
    const queueIndex = this.requestQueue.indexOf(requestId);
    if (queueIndex > -1) {
      this.requestQueue.splice(queueIndex, 1);
    }

    this.logger.debug(`Completed request ${requestId} in ${actualDuration}ms`);

    this.eventEmitter.emit('recommendation.completed', {
      requestId,
      studentId: request.studentId,
      duration: actualDuration,
    });

    // Clean up after a delay to allow final status checks
    setTimeout(() => {
      this.activeRequests.delete(requestId);
    }, 30000); // Keep for 30 seconds
  }

  /**
   * Mark a request as failed
   */
  failRequest(requestId: string, error: string): void {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      this.logger.warn(`Request ${requestId} not found for failure`);
      return;
    }

    request.currentStage = LoadingStage.ERROR;
    request.progress = 0;

    // Remove from queue
    const queueIndex = this.requestQueue.indexOf(requestId);
    if (queueIndex > -1) {
      this.requestQueue.splice(queueIndex, 1);
    }

    this.logger.error(`Failed request ${requestId}: ${error}`);

    this.eventEmitter.emit('recommendation.failed', {
      requestId,
      studentId: request.studentId,
      error,
    });

    // Clean up after a delay
    setTimeout(() => {
      this.activeRequests.delete(requestId);
    }, 30000);
  }

  /**
   * Get current progress for a request
   */
  getProgress(requestId: string): LoadingProgress | null {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      return null;
    }

    return {
      stage: request.currentStage,
      percentage: request.progress,
      message: this.getStageMessage(request.currentStage),
      estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(request),
      details: this.getStageDetails(request.currentStage),
    };
  }

  /**
   * Get queue status for a request
   */
  getQueueStatus(requestId: string): QueueStatus | null {
    const queuePosition = this.requestQueue.indexOf(requestId);
    if (queuePosition === -1) {
      return null;
    }

    return {
      position: queuePosition + 1,
      totalInQueue: this.requestQueue.length,
      estimatedWaitTime: this.calculateQueueWaitTime(queuePosition),
      averageProcessingTime: this.getAverageProcessingTime(),
    };
  }

  /**
   * Get all active requests (for monitoring)
   */
  getActiveRequests(): RecommendationRequest[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Get system load information
   */
  getSystemLoad(): {
    activeRequests: number;
    queueLength: number;
    averageProcessingTime: number;
    estimatedCapacity: number;
  } {
    return {
      activeRequests: this.activeRequests.size,
      queueLength: this.requestQueue.length,
      averageProcessingTime: this.getAverageProcessingTime(),
      estimatedCapacity: this.calculateSystemCapacity(),
    };
  }

  /**
   * Emit progress update
   */
  private emitProgress(requestId: string): void {
    const progress = this.getProgress(requestId);
    const request = this.activeRequests.get(requestId);

    if (progress && request) {
      this.eventEmitter.emit('recommendation.progress', {
        requestId,
        studentId: request.studentId,
        progress,
      });
    }
  }

  /**
   * Calculate estimated time remaining for a request
   */
  private calculateEstimatedTimeRemaining(
    request: RecommendationRequest,
  ): number {
    const elapsed = Date.now() - request.startTime.getTime();
    const progressRatio = request.progress / 100;

    if (progressRatio <= 0) {
      return request.estimatedDuration;
    }

    const estimatedTotal = elapsed / progressRatio;
    return Math.max(0, estimatedTotal - elapsed);
  }

  /**
   * Calculate queue wait time
   */
  private calculateQueueWaitTime(position: number): number {
    const averageProcessingTime = this.getAverageProcessingTime();
    return position * averageProcessingTime;
  }

  /**
   * Get estimated duration for a new request
   */
  private getEstimatedDuration(): number {
    const averageTime = this.getAverageProcessingTime();
    return averageTime > 0 ? averageTime : 8000; // Default 8 seconds
  }

  /**
   * Get average processing time from history
   */
  private getAverageProcessingTime(): number {
    if (this.processingHistory.length === 0) {
      return 8000; // Default 8 seconds
    }

    const sum = this.processingHistory.reduce((acc, time) => acc + time, 0);
    return sum / this.processingHistory.length;
  }

  /**
   * Add processing time to history
   */
  private addProcessingTime(duration: number): void {
    this.processingHistory.push(duration);

    // Keep only the most recent entries
    if (this.processingHistory.length > this.maxHistorySize) {
      this.processingHistory.shift();
    }
  }

  /**
   * Calculate system capacity
   */
  private calculateSystemCapacity(): number {
    const averageTime = this.getAverageProcessingTime();
    const maxConcurrentRequests = 5; // Configurable based on system resources

    // Requests per minute
    return Math.round((60000 / averageTime) * maxConcurrentRequests);
  }

  /**
   * Get user-friendly message for each stage
   */
  private getStageMessage(stage: LoadingStage): string {
    const messages: { [key in LoadingStage]: string } = {
      [LoadingStage.QUEUED]: 'Your request is in the queue...',
      [LoadingStage.VALIDATING_PROFILE]: 'Checking your profile information...',
      [LoadingStage.FETCHING_PROJECTS]: 'Finding available projects...',
      [LoadingStage.GENERATING_EMBEDDINGS]:
        'Analyzing your interests and skills...',
      [LoadingStage.CALCULATING_SIMILARITY]:
        'Matching you with suitable projects...',
      [LoadingStage.APPLYING_FILTERS]: 'Applying your preferences...',
      [LoadingStage.RANKING_RESULTS]: 'Ranking the best matches...',
      [LoadingStage.GENERATING_EXPLANATIONS]:
        'Preparing explanations for recommendations...',
      [LoadingStage.CACHING_RESULTS]:
        'Saving results for faster future access...',
      [LoadingStage.COMPLETED]: 'Recommendations ready!',
      [LoadingStage.ERROR]: 'Something went wrong. Please try again.',
    };

    return messages[stage];
  }

  /**
   * Get detailed information for each stage
   */
  private getStageDetails(stage: LoadingStage): string {
    const details: { [key in LoadingStage]: string } = {
      [LoadingStage.QUEUED]:
        'Waiting for processing to begin. Your position in the queue will be updated shortly.',
      [LoadingStage.VALIDATING_PROFILE]:
        'Making sure your profile has enough information to generate good recommendations.',
      [LoadingStage.FETCHING_PROJECTS]:
        'Searching through all available projects that match your criteria.',
      [LoadingStage.GENERATING_EMBEDDINGS]:
        'Using AI to understand the meaning behind your skills and interests.',
      [LoadingStage.CALCULATING_SIMILARITY]:
        'Comparing your profile with project requirements using advanced algorithms.',
      [LoadingStage.APPLYING_FILTERS]:
        'Filtering results based on your specialization and difficulty preferences.',
      [LoadingStage.RANKING_RESULTS]:
        'Ordering projects from best to least matching based on multiple factors.',
      [LoadingStage.GENERATING_EXPLANATIONS]:
        'Creating clear explanations for why each project was recommended.',
      [LoadingStage.CACHING_RESULTS]:
        'Storing results so future requests will be much faster.',
      [LoadingStage.COMPLETED]:
        'Your personalized recommendations are ready to view.',
      [LoadingStage.ERROR]:
        'An error occurred during processing. Our system will try alternative methods.',
    };

    return details[stage];
  }

  /**
   * Get progress percentage for each stage
   */
  getStageProgress(stage: LoadingStage): number {
    const stageProgress: { [key in LoadingStage]: number } = {
      [LoadingStage.QUEUED]: 5,
      [LoadingStage.VALIDATING_PROFILE]: 15,
      [LoadingStage.FETCHING_PROJECTS]: 25,
      [LoadingStage.GENERATING_EMBEDDINGS]: 45,
      [LoadingStage.CALCULATING_SIMILARITY]: 65,
      [LoadingStage.APPLYING_FILTERS]: 75,
      [LoadingStage.RANKING_RESULTS]: 85,
      [LoadingStage.GENERATING_EXPLANATIONS]: 95,
      [LoadingStage.CACHING_RESULTS]: 98,
      [LoadingStage.COMPLETED]: 100,
      [LoadingStage.ERROR]: 0,
    };

    return stageProgress[stage];
  }

  /**
   * Clean up old requests (should be called periodically)
   */
  cleanupOldRequests(): void {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    for (const [requestId, request] of this.activeRequests.entries()) {
      const age = now - request.startTime.getTime();
      if (age > maxAge) {
        this.logger.debug(`Cleaning up old request ${requestId}`);
        this.activeRequests.delete(requestId);

        const queueIndex = this.requestQueue.indexOf(requestId);
        if (queueIndex > -1) {
          this.requestQueue.splice(queueIndex, 1);
        }
      }
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { EmbeddingService } from './embedding.service';
import { SimilarityService } from './similarity.service';
import { TextProcessingService } from './text-processing.service';
import { RecommendationCacheService } from './recommendation-cache.service';
import { AIRateLimiterService } from './ai-rate-limiter.service';

import {
  RecommendationResultDto,
  ProjectRecommendationDto,
  RecommendationMetadata,
} from '../dto/recommendation';

import { RecommendationOptions } from './recommendation.service';
import { UserRole } from '../common/enums/user-role.enum';
import { ApprovalStatus } from '../common/enums/approval-status.enum';

export interface BatchRequest {
  id: string;
  studentIds: string[];
  options: RecommendationOptions;
  priority: BatchPriority;
  createdAt: Date;
  estimatedProcessingTime?: number;
}

export interface BatchResult {
  requestId: string;
  results: Map<string, RecommendationResultDto | Error>;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  processingTimeMs: number;
  cacheHitRate: number;
}

export enum BatchPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
}

export interface BatchStats {
  queueSize: number;
  processingCount: number;
  completedToday: number;
  averageProcessingTime: number;
  cacheHitRate: number;
  errorRate: number;
}

@Injectable()
export class BatchRecommendationService {
  private readonly logger = new Logger(BatchRecommendationService.name);

  // Queue management
  private readonly requestQueue: BatchRequest[] = [];
  private readonly processingRequests = new Map<string, BatchRequest>();
  private readonly completedRequests = new Map<string, BatchResult>();
  private isProcessing = false;

  // Configuration
  private readonly MAX_CONCURRENT_REQUESTS = 3;
  private readonly MAX_BATCH_SIZE = 50;
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly BATCH_TIMEOUT_MS = 300000; // 5 minutes
  private readonly CLEANUP_INTERVAL_MS = 3600000; // 1 hour

  // Statistics
  private dailyStats = {
    completed: 0,
    totalProcessingTime: 0,
    totalCacheHits: 0,
    totalRequests: 0,
    errors: 0,
    lastReset: new Date(),
  };

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
    private readonly embeddingService: EmbeddingService,
    private readonly similarityService: SimilarityService,
    private readonly textProcessingService: TextProcessingService,
    private readonly cacheService: RecommendationCacheService,
    private readonly rateLimiterService: AIRateLimiterService,
  ) {
    // Start queue processor
    this.startQueueProcessor();

    // Start cleanup timer
    setInterval(
      () => this.cleanupCompletedRequests(),
      this.CLEANUP_INTERVAL_MS,
    );
  }

  /**
   * Submit a batch recommendation request
   */
  async submitBatchRequest(
    studentIds: string[],
    options: RecommendationOptions = {},
    priority: BatchPriority = BatchPriority.NORMAL,
  ): Promise<string> {
    if (studentIds.length === 0) {
      throw new Error('Student IDs array cannot be empty');
    }

    if (studentIds.length > this.MAX_BATCH_SIZE) {
      throw new Error(
        `Batch size cannot exceed ${this.MAX_BATCH_SIZE} students`,
      );
    }

    if (this.requestQueue.length >= this.MAX_QUEUE_SIZE) {
      throw new Error('Request queue is full. Please try again later.');
    }

    const requestId = this.generateRequestId();
    const estimatedTime = this.estimateProcessingTime(studentIds.length);

    const request: BatchRequest = {
      id: requestId,
      studentIds: [...studentIds], // Create copy to prevent external modification
      options: { ...options },
      priority,
      createdAt: new Date(),
      estimatedProcessingTime: estimatedTime,
    };

    // Insert request in priority order
    this.insertRequestByPriority(request);

    this.logger.log(
      `Queued batch request ${requestId} for ${studentIds.length} students ` +
        `(priority: ${BatchPriority[priority]}, estimated: ${estimatedTime}ms)`,
    );

    return requestId;
  }

  /**
   * Get batch request status
   */
  getBatchStatus(requestId: string): {
    status: 'queued' | 'processing' | 'completed' | 'not_found';
    position?: number;
    estimatedWaitTime?: number;
    result?: BatchResult;
  } {
    // Check if completed
    const completed = this.completedRequests.get(requestId);
    if (completed) {
      return { status: 'completed', result: completed };
    }

    // Check if processing
    if (this.processingRequests.has(requestId)) {
      return { status: 'processing' };
    }

    // Check if queued
    const queuePosition = this.requestQueue.findIndex(
      (req) => req.id === requestId,
    );
    if (queuePosition !== -1) {
      const estimatedWaitTime = this.calculateEstimatedWaitTime(queuePosition);
      return {
        status: 'queued',
        position: queuePosition + 1,
        estimatedWaitTime,
      };
    }

    return { status: 'not_found' };
  }

  /**
   * Cancel a queued batch request
   */
  cancelBatchRequest(requestId: string): boolean {
    const queueIndex = this.requestQueue.findIndex(
      (req) => req.id === requestId,
    );
    if (queueIndex !== -1) {
      this.requestQueue.splice(queueIndex, 1);
      this.logger.log(`Cancelled batch request ${requestId}`);
      return true;
    }
    return false;
  }

  /**
   * Get batch processing statistics
   */
  getBatchStats(): BatchStats {
    this.resetDailyStatsIfNeeded();

    const avgProcessingTime =
      this.dailyStats.completed > 0
        ? this.dailyStats.totalProcessingTime / this.dailyStats.completed
        : 0;

    const cacheHitRate =
      this.dailyStats.totalRequests > 0
        ? this.dailyStats.totalCacheHits / this.dailyStats.totalRequests
        : 0;

    const errorRate =
      this.dailyStats.totalRequests > 0
        ? this.dailyStats.errors / this.dailyStats.totalRequests
        : 0;

    return {
      queueSize: this.requestQueue.length,
      processingCount: this.processingRequests.size,
      completedToday: this.dailyStats.completed,
      averageProcessingTime: Math.round(avgProcessingTime),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  /**
   * Process batch recommendations with optimized embedding generation
   */
  private async processBatchRecommendations(
    request: BatchRequest,
  ): Promise<BatchResult> {
    const startTime = Date.now();
    const results = new Map<string, RecommendationResultDto | Error>();
    let cacheHits = 0;

    this.logger.log(
      `Processing batch request ${request.id} for ${request.studentIds.length} students`,
    );

    try {
      // Check cache first for all students
      const cacheResults = await this.checkBatchCache(request.studentIds);
      cacheHits = cacheResults.hits;

      // Get students that need fresh recommendations
      const studentsNeedingGeneration = request.studentIds.filter(
        (studentId) => !cacheResults.cached.has(studentId),
      );

      // Add cached results
      cacheResults.cached.forEach((result, studentId) => {
        results.set(studentId, result);
      });

      if (studentsNeedingGeneration.length > 0) {
        // Generate recommendations for remaining students
        const generatedResults = await this.generateBatchRecommendations(
          studentsNeedingGeneration,
          request.options,
        );

        // Add generated results
        generatedResults.forEach((result, studentId) => {
          results.set(studentId, result);
        });
      }

      const processingTime = Date.now() - startTime;
      const successCount = Array.from(results.values()).filter(
        (r) => !(r instanceof Error),
      ).length;
      const errorCount = results.size - successCount;

      // Update statistics
      this.updateDailyStats(
        results.size,
        cacheHits,
        processingTime,
        errorCount,
      );

      const batchResult: BatchResult = {
        requestId: request.id,
        results,
        totalProcessed: results.size,
        successCount,
        errorCount,
        processingTimeMs: processingTime,
        cacheHitRate: results.size > 0 ? cacheHits / results.size : 0,
      };

      this.logger.log(
        `Completed batch request ${request.id}: ${successCount}/${results.size} successful, ` +
          `${cacheHits} cache hits, ${processingTime}ms`,
      );

      return batchResult;
    } catch (error) {
      this.logger.error(`Error processing batch request ${request.id}:`, error);

      // Mark all as errors
      request.studentIds.forEach((studentId) => {
        results.set(studentId, error as Error);
      });

      return {
        requestId: request.id,
        results,
        totalProcessed: results.size,
        successCount: 0,
        errorCount: results.size,
        processingTimeMs: Date.now() - startTime,
        cacheHitRate: 0,
      };
    }
  }

  /**
   * Check cache for multiple students
   */
  private async checkBatchCache(studentIds: string[]): Promise<{
    cached: Map<string, RecommendationResultDto>;
    hits: number;
  }> {
    const cached = new Map<string, RecommendationResultDto>();
    let hits = 0;

    for (const studentId of studentIds) {
      const cachedResult =
        await this.cacheService.getCachedRecommendations(studentId);
      if (cachedResult) {
        cached.set(studentId, cachedResult);
        hits++;
      }
    }

    return { cached, hits };
  }

  /**
   * Generate recommendations for multiple students with batch optimization
   */
  private async generateBatchRecommendations(
    studentIds: string[],
    options: RecommendationOptions,
  ): Promise<Map<string, RecommendationResultDto | Error>> {
    const results = new Map<string, RecommendationResultDto | Error>();

    try {
      // Get all student profiles
      const students = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.studentProfile', 'studentProfile')
        .where('user.id IN (:...studentIds)', { studentIds })
        .andWhere('user.role = :role', { role: UserRole.STUDENT })
        .getMany();

      // Get available projects (shared for all students)
      const projects = await this.getAvailableProjects(options);

      if (projects.length === 0) {
        const error = new Error('No available projects found');
        studentIds.forEach((id) => results.set(id, error));
        return results;
      }

      // Process student profiles in batch
      const studentTexts = students.map((student) => {
        if (!student.studentProfile) {
          return null;
        }
        const textResult = this.textProcessingService.processStudentProfile(
          student.studentProfile,
        );
        return textResult.combined.text;
      });

      // Process project texts once (shared for all students)
      const projectTexts = projects.map((project) => {
        const projectResult =
          this.textProcessingService.processProject(project);
        return projectResult.combined.text;
      });

      // Generate embeddings in batches
      const validStudentTexts = studentTexts.filter(
        (text) => text !== null,
      ) as string[];
      const [studentEmbeddings, projectEmbeddings] = await Promise.all([
        this.embeddingService.generateEmbeddings(validStudentTexts),
        this.embeddingService.generateEmbeddings(projectTexts),
      ]);

      // Generate recommendations for each student
      let studentIndex = 0;
      for (let i = 0; i < students.length; i++) {
        const student = students[i];

        try {
          if (!student.studentProfile || studentTexts[i] === null) {
            results.set(
              student.id,
              new Error('Student profile not found or incomplete'),
            );
            continue;
          }

          const studentEmbedding = studentEmbeddings.embeddings[studentIndex];
          studentIndex++;

          // Calculate similarities for this student
          const similarityResult =
            this.similarityService.calculateBatchSimilarity(
              studentEmbedding,
              projectEmbeddings.embeddings,
              {
                normalizeScores: true,
                includeRanking: true,
                minThreshold: options.minSimilarityScore || 0.3,
                maxResults: options.limit || 10,
              },
            );

          // Create recommendations
          const recommendations = this.createRecommendationsFromSimilarity(
            student.studentProfile,
            projects,
            similarityResult,
            options,
          );

          const result: RecommendationResultDto = {
            recommendations,
            reasoning: this.generateOverallReasoning(
              student.studentProfile,
              recommendations,
            ),
            averageSimilarityScore: this.calculateAverageScore(recommendations),
            fromCache: false,
            generatedAt: new Date(),
            expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
            metadata: {
              method: 'ai-embeddings-batch',
              fallback: false,
              projectsAnalyzed: projects.length,
              cacheHitRate:
                projectEmbeddings.cacheHits / projectTexts.length || 0,
              processingTimeMs: 0, // Will be set by caller
            },
          };

          // Cache the result
          await this.cacheService.setCachedRecommendations(student.id, result);

          results.set(student.id, result);
        } catch (error) {
          this.logger.error(
            `Error generating recommendations for student ${student.id}:`,
            error,
          );
          results.set(student.id, error as Error);
        }
      }
    } catch (error) {
      this.logger.error('Error in batch recommendation generation:', error);
      studentIds.forEach((id) => results.set(id, error as Error));
    }

    return results;
  }

  /**
   * Start the queue processor
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.requestQueue.length === 0) {
        return;
      }

      if (this.processingRequests.size >= this.MAX_CONCURRENT_REQUESTS) {
        return;
      }

      // Check rate limits before processing
      const rateLimitStatus = await this.rateLimiterService.checkRateLimit();
      if (!rateLimitStatus.allowed) {
        this.logger.debug('Rate limit reached, delaying batch processing');
        return;
      }

      this.isProcessing = true;

      try {
        // Get next request by priority
        const request = this.requestQueue.shift();
        if (!request) {
          return;
        }

        this.processingRequests.set(request.id, request);

        // Process request asynchronously
        this.processBatchRecommendations(request)
          .then((result) => {
            this.completedRequests.set(request.id, result);
            this.processingRequests.delete(request.id);
          })
          .catch((error) => {
            this.logger.error(
              `Batch processing failed for request ${request.id}:`,
              error,
            );
            this.processingRequests.delete(request.id);
          });
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Check every second
  }

  /**
   * Helper methods
   */
  private generateRequestId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private insertRequestByPriority(request: BatchRequest): void {
    let insertIndex = this.requestQueue.length;

    for (let i = 0; i < this.requestQueue.length; i++) {
      if (request.priority > this.requestQueue[i].priority) {
        insertIndex = i;
        break;
      }
    }

    this.requestQueue.splice(insertIndex, 0, request);
  }

  private estimateProcessingTime(studentCount: number): number {
    // Base time + per-student time (rough estimates)
    const baseTime = 2000; // 2 seconds
    const perStudentTime = 500; // 0.5 seconds per student
    return baseTime + studentCount * perStudentTime;
  }

  private calculateEstimatedWaitTime(queuePosition: number): number {
    let estimatedTime = 0;

    for (
      let i = 0;
      i < Math.min(queuePosition, this.requestQueue.length);
      i++
    ) {
      const request = this.requestQueue[i];
      estimatedTime += request.estimatedProcessingTime || 5000;
    }

    return estimatedTime;
  }

  private updateDailyStats(
    totalRequests: number,
    cacheHits: number,
    processingTime: number,
    errors: number,
  ): void {
    this.dailyStats.completed++;
    this.dailyStats.totalRequests += totalRequests;
    this.dailyStats.totalCacheHits += cacheHits;
    this.dailyStats.totalProcessingTime += processingTime;
    this.dailyStats.errors += errors;
  }

  private resetDailyStatsIfNeeded(): void {
    const now = new Date();
    const lastReset = this.dailyStats.lastReset;

    if (
      now.getDate() !== lastReset.getDate() ||
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear()
    ) {
      this.dailyStats = {
        completed: 0,
        totalProcessingTime: 0,
        totalCacheHits: 0,
        totalRequests: 0,
        errors: 0,
        lastReset: now,
      };
    }
  }

  private cleanupCompletedRequests(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    for (const [requestId, result] of this.completedRequests.entries()) {
      if (new Date(result.requestId) < cutoffTime) {
        this.completedRequests.delete(requestId);
      }
    }
  }

  // Placeholder methods that would be implemented based on existing services
  private async getAvailableProjects(
    options: RecommendationOptions,
  ): Promise<Project[]> {
    // This would use the same logic as RecommendationService.getAvailableProjects
    return this.projectRepository.find({
      where: { approvalStatus: ApprovalStatus.APPROVED },
      relations: ['supervisor'],
    });
  }

  private createRecommendationsFromSimilarity(
    studentProfile: StudentProfile,
    projects: Project[],
    similarityResult: any,
    options: RecommendationOptions,
  ): ProjectRecommendationDto[] {
    // This would use the same logic as RecommendationService
    return [];
  }

  private generateOverallReasoning(
    studentProfile: StudentProfile,
    recommendations: ProjectRecommendationDto[],
  ): string {
    // This would use the same logic as RecommendationService
    return 'Batch-generated recommendations based on AI similarity analysis';
  }

  private calculateAverageScore(
    recommendations: ProjectRecommendationDto[],
  ): number {
    if (recommendations.length === 0) return 0;
    const sum = recommendations.reduce(
      (acc, rec) => acc + rec.similarityScore,
      0,
    );
    return sum / recommendations.length;
  }
}

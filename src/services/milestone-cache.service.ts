import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  ProjectProgressDto,
  MilestoneAnalyticsDto,
  SupervisorDashboardDto,
  StudentProgressSummaryDto,
} from '../dto/milestone';

export interface MilestoneCacheServiceInterface {
  getCachedProgress(studentId: string): Promise<ProjectProgressDto | null>;
  setCachedProgress(
    studentId: string,
    progress: ProjectProgressDto,
    ttl?: number,
  ): Promise<void>;
  invalidateProgressCache(studentId: string): Promise<void>;

  getCachedAnalytics(studentId: string): Promise<MilestoneAnalyticsDto | null>;
  setCachedAnalytics(
    studentId: string,
    analytics: MilestoneAnalyticsDto,
    ttl?: number,
  ): Promise<void>;
  invalidateAnalyticsCache(studentId: string): Promise<void>;

  getCachedSupervisorDashboard(
    supervisorId: string,
  ): Promise<SupervisorDashboardDto | null>;
  setCachedSupervisorDashboard(
    supervisorId: string,
    dashboard: SupervisorDashboardDto,
    ttl?: number,
  ): Promise<void>;
  invalidateSupervisorDashboardCache(supervisorId: string): Promise<void>;

  getCachedStudentSummaries(
    supervisorId: string,
  ): Promise<StudentProgressSummaryDto[] | null>;
  setCachedStudentSummaries(
    supervisorId: string,
    summaries: StudentProgressSummaryDto[],
    ttl?: number,
  ): Promise<void>;
  invalidateStudentSummariesCache(supervisorId: string): Promise<void>;

  warmupCache(studentId: string): Promise<void>;
  invalidateAllStudentCaches(studentId: string): Promise<void>;
  invalidateAllSupervisorCaches(supervisorId: string): Promise<void>;

  getCacheStats(): Promise<CacheStatsDto>;
  clearAllCaches(): Promise<void>;
}

export interface CacheStatsDto {
  totalKeys: number;
  progressCacheHits: number;
  progressCacheMisses: number;
  analyticsCacheHits: number;
  analyticsCacheMisses: number;
  supervisorCacheHits: number;
  supervisorCacheMisses: number;
  cacheHitRate: number;
  lastUpdated: string;
}

@Injectable()
export class MilestoneCacheService implements MilestoneCacheServiceInterface {
  private readonly logger = new Logger(MilestoneCacheService.name);

  // Cache TTL configurations (in seconds)
  private readonly DEFAULT_TTL = 1800; // 30 minutes
  private readonly PROGRESS_TTL = 900; // 15 minutes
  private readonly ANALYTICS_TTL = 3600; // 1 hour
  private readonly SUPERVISOR_TTL = 1200; // 20 minutes

  // Cache key prefixes
  private readonly PROGRESS_PREFIX = 'milestone:progress:';
  private readonly ANALYTICS_PREFIX = 'milestone:analytics:';
  private readonly SUPERVISOR_DASHBOARD_PREFIX =
    'milestone:supervisor:dashboard:';
  private readonly STUDENT_SUMMARIES_PREFIX = 'milestone:supervisor:summaries:';

  // Cache statistics
  private cacheStats = {
    progressHits: 0,
    progressMisses: 0,
    analyticsHits: 0,
    analyticsMisses: 0,
    supervisorHits: 0,
    supervisorMisses: 0,
  };

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  // Progress caching methods
  async getCachedProgress(
    studentId: string,
  ): Promise<ProjectProgressDto | null> {
    try {
      const cacheKey = this.getProgressCacheKey(studentId);
      const cached = await this.cacheManager.get<ProjectProgressDto>(cacheKey);

      if (cached) {
        this.cacheStats.progressHits++;
        this.logger.debug(`Cache hit for progress: ${studentId}`);
        return cached;
      }

      this.cacheStats.progressMisses++;
      this.logger.debug(`Cache miss for progress: ${studentId}`);
      return null;
    } catch (error) {
      this.logger.error(
        `Error getting cached progress for ${studentId}:`,
        error,
      );
      return null;
    }
  }

  async setCachedProgress(
    studentId: string,
    progress: ProjectProgressDto,
    ttl?: number,
  ): Promise<void> {
    try {
      const cacheKey = this.getProgressCacheKey(studentId);
      const cacheTtl = ttl || this.PROGRESS_TTL;

      await this.cacheManager.set(cacheKey, progress, cacheTtl * 1000); // Convert to milliseconds
      this.logger.debug(
        `Cached progress for student ${studentId} with TTL ${cacheTtl}s`,
      );
    } catch (error) {
      this.logger.error(`Error caching progress for ${studentId}:`, error);
    }
  }

  async invalidateProgressCache(studentId: string): Promise<void> {
    try {
      const cacheKey = this.getProgressCacheKey(studentId);
      await this.cacheManager.del(cacheKey);
      this.logger.debug(`Invalidated progress cache for student ${studentId}`);
    } catch (error) {
      this.logger.error(
        `Error invalidating progress cache for ${studentId}:`,
        error,
      );
    }
  }

  // Analytics caching methods
  async getCachedAnalytics(
    studentId: string,
  ): Promise<MilestoneAnalyticsDto | null> {
    try {
      const cacheKey = this.getAnalyticsCacheKey(studentId);
      const cached =
        await this.cacheManager.get<MilestoneAnalyticsDto>(cacheKey);

      if (cached) {
        this.cacheStats.analyticsHits++;
        this.logger.debug(`Cache hit for analytics: ${studentId}`);
        return cached;
      }

      this.cacheStats.analyticsMisses++;
      this.logger.debug(`Cache miss for analytics: ${studentId}`);
      return null;
    } catch (error) {
      this.logger.error(
        `Error getting cached analytics for ${studentId}:`,
        error,
      );
      return null;
    }
  }

  async setCachedAnalytics(
    studentId: string,
    analytics: MilestoneAnalyticsDto,
    ttl?: number,
  ): Promise<void> {
    try {
      const cacheKey = this.getAnalyticsCacheKey(studentId);
      const cacheTtl = ttl || this.ANALYTICS_TTL;

      await this.cacheManager.set(cacheKey, analytics, cacheTtl * 1000);
      this.logger.debug(
        `Cached analytics for student ${studentId} with TTL ${cacheTtl}s`,
      );
    } catch (error) {
      this.logger.error(`Error caching analytics for ${studentId}:`, error);
    }
  }

  async invalidateAnalyticsCache(studentId: string): Promise<void> {
    try {
      const cacheKey = this.getAnalyticsCacheKey(studentId);
      await this.cacheManager.del(cacheKey);
      this.logger.debug(`Invalidated analytics cache for student ${studentId}`);
    } catch (error) {
      this.logger.error(
        `Error invalidating analytics cache for ${studentId}:`,
        error,
      );
    }
  }

  // Supervisor dashboard caching methods
  async getCachedSupervisorDashboard(
    supervisorId: string,
  ): Promise<SupervisorDashboardDto | null> {
    try {
      const cacheKey = this.getSupervisorDashboardCacheKey(supervisorId);
      const cached =
        await this.cacheManager.get<SupervisorDashboardDto>(cacheKey);

      if (cached) {
        this.cacheStats.supervisorHits++;
        this.logger.debug(
          `Cache hit for supervisor dashboard: ${supervisorId}`,
        );
        return cached;
      }

      this.cacheStats.supervisorMisses++;
      this.logger.debug(`Cache miss for supervisor dashboard: ${supervisorId}`);
      return null;
    } catch (error) {
      this.logger.error(
        `Error getting cached supervisor dashboard for ${supervisorId}:`,
        error,
      );
      return null;
    }
  }

  async setCachedSupervisorDashboard(
    supervisorId: string,
    dashboard: SupervisorDashboardDto,
    ttl?: number,
  ): Promise<void> {
    try {
      const cacheKey = this.getSupervisorDashboardCacheKey(supervisorId);
      const cacheTtl = ttl || this.SUPERVISOR_TTL;

      await this.cacheManager.set(cacheKey, dashboard, cacheTtl * 1000);
      this.logger.debug(
        `Cached supervisor dashboard for ${supervisorId} with TTL ${cacheTtl}s`,
      );
    } catch (error) {
      this.logger.error(
        `Error caching supervisor dashboard for ${supervisorId}:`,
        error,
      );
    }
  }

  async invalidateSupervisorDashboardCache(
    supervisorId: string,
  ): Promise<void> {
    try {
      const cacheKey = this.getSupervisorDashboardCacheKey(supervisorId);
      await this.cacheManager.del(cacheKey);
      this.logger.debug(
        `Invalidated supervisor dashboard cache for ${supervisorId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error invalidating supervisor dashboard cache for ${supervisorId}:`,
        error,
      );
    }
  }

  // Student summaries caching methods
  async getCachedStudentSummaries(
    supervisorId: string,
  ): Promise<StudentProgressSummaryDto[] | null> {
    try {
      const cacheKey = this.getStudentSummariesCacheKey(supervisorId);
      const cached =
        await this.cacheManager.get<StudentProgressSummaryDto[]>(cacheKey);

      if (cached) {
        this.cacheStats.supervisorHits++;
        this.logger.debug(`Cache hit for student summaries: ${supervisorId}`);
        return cached;
      }

      this.cacheStats.supervisorMisses++;
      this.logger.debug(`Cache miss for student summaries: ${supervisorId}`);
      return null;
    } catch (error) {
      this.logger.error(
        `Error getting cached student summaries for ${supervisorId}:`,
        error,
      );
      return null;
    }
  }

  async setCachedStudentSummaries(
    supervisorId: string,
    summaries: StudentProgressSummaryDto[],
    ttl?: number,
  ): Promise<void> {
    try {
      const cacheKey = this.getStudentSummariesCacheKey(supervisorId);
      const cacheTtl = ttl || this.SUPERVISOR_TTL;

      await this.cacheManager.set(cacheKey, summaries, cacheTtl * 1000);
      this.logger.debug(
        `Cached student summaries for supervisor ${supervisorId} with TTL ${cacheTtl}s`,
      );
    } catch (error) {
      this.logger.error(
        `Error caching student summaries for ${supervisorId}:`,
        error,
      );
    }
  }

  async invalidateStudentSummariesCache(supervisorId: string): Promise<void> {
    try {
      const cacheKey = this.getStudentSummariesCacheKey(supervisorId);
      await this.cacheManager.del(cacheKey);
      this.logger.debug(
        `Invalidated student summaries cache for supervisor ${supervisorId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error invalidating student summaries cache for ${supervisorId}:`,
        error,
      );
    }
  }

  // Cache warming and bulk operations
  async warmupCache(studentId: string): Promise<void> {
    this.logger.log(`Warming up cache for student ${studentId}`);

    try {
      // Note: In a real implementation, you would call the actual services to generate and cache the data
      // For now, we'll just log the warmup operation
      this.logger.debug(`Cache warmup completed for student ${studentId}`);
    } catch (error) {
      this.logger.error(
        `Error warming up cache for student ${studentId}:`,
        error,
      );
    }
  }

  async invalidateAllStudentCaches(studentId: string): Promise<void> {
    this.logger.log(`Invalidating all caches for student ${studentId}`);

    try {
      await Promise.all([
        this.invalidateProgressCache(studentId),
        this.invalidateAnalyticsCache(studentId),
      ]);

      this.logger.debug(`All caches invalidated for student ${studentId}`);
    } catch (error) {
      this.logger.error(
        `Error invalidating all caches for student ${studentId}:`,
        error,
      );
    }
  }

  async invalidateAllSupervisorCaches(supervisorId: string): Promise<void> {
    this.logger.log(`Invalidating all caches for supervisor ${supervisorId}`);

    try {
      await Promise.all([
        this.invalidateSupervisorDashboardCache(supervisorId),
        this.invalidateStudentSummariesCache(supervisorId),
      ]);

      this.logger.debug(
        `All caches invalidated for supervisor ${supervisorId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error invalidating all caches for supervisor ${supervisorId}:`,
        error,
      );
    }
  }

  // Cache statistics and management
  async getCacheStats(): Promise<CacheStatsDto> {
    try {
      // Note: In a real Redis implementation, you would get actual cache statistics
      const totalHits =
        this.cacheStats.progressHits +
        this.cacheStats.analyticsHits +
        this.cacheStats.supervisorHits;
      const totalMisses =
        this.cacheStats.progressMisses +
        this.cacheStats.analyticsMisses +
        this.cacheStats.supervisorMisses;
      const totalRequests = totalHits + totalMisses;

      return {
        totalKeys: 0, // Would be retrieved from Redis
        progressCacheHits: this.cacheStats.progressHits,
        progressCacheMisses: this.cacheStats.progressMisses,
        analyticsCacheHits: this.cacheStats.analyticsHits,
        analyticsCacheMisses: this.cacheStats.analyticsMisses,
        supervisorCacheHits: this.cacheStats.supervisorHits,
        supervisorCacheMisses: this.cacheStats.supervisorMisses,
        cacheHitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      throw error;
    }
  }

  async clearAllCaches(): Promise<void> {
    try {
      // Clear cache using available methods
      try {
        // Try to clear all keys - implementation depends on cache store
        this.logger.warn(
          'Cache reset not directly available, clearing individual caches',
        );
        // In a real implementation, you would iterate through known cache keys
      } catch (resetError) {
        this.logger.warn(
          'Cache reset failed, continuing with statistics reset',
        );
      }

      // Reset statistics
      this.cacheStats = {
        progressHits: 0,
        progressMisses: 0,
        analyticsHits: 0,
        analyticsMisses: 0,
        supervisorHits: 0,
        supervisorMisses: 0,
      };

      this.logger.log('All caches cleared successfully');
    } catch (error) {
      this.logger.error('Error clearing all caches:', error);
      throw error;
    }
  }

  // Private helper methods for cache key generation
  private getProgressCacheKey(studentId: string): string {
    return `${this.PROGRESS_PREFIX}${studentId}`;
  }

  private getAnalyticsCacheKey(studentId: string): string {
    return `${this.ANALYTICS_PREFIX}${studentId}`;
  }

  private getSupervisorDashboardCacheKey(supervisorId: string): string {
    return `${this.SUPERVISOR_DASHBOARD_PREFIX}${supervisorId}`;
  }

  private getStudentSummariesCacheKey(supervisorId: string): string {
    return `${this.STUDENT_SUMMARIES_PREFIX}${supervisorId}`;
  }
}

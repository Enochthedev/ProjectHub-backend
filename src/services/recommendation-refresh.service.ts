import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';

import { User } from '../entities/user.entity';
import { Recommendation } from '../entities/recommendation.entity';
import { ProjectView } from '../entities/project-view.entity';
import { RecommendationService } from './recommendation.service';
import { RecommendationCacheService } from './recommendation-cache.service';
import { UserRole } from '../common/enums/user-role.enum';
import { RecommendationStatus } from '../common/enums/recommendation-status.enum';

export interface RefreshStats {
  totalStudents: number;
  refreshedCount: number;
  errorCount: number;
  skippedCount: number;
  processingTimeMs: number;
}

@Injectable()
export class RecommendationRefreshService {
  private readonly logger = new Logger(RecommendationRefreshService.name);
  private isRefreshRunning = false;

  // Configuration
  private readonly STALE_THRESHOLD_HOURS = 2; // Consider recommendations stale after 2 hours
  private readonly ACTIVE_USER_DAYS = 7; // Users active in last 7 days
  private readonly BATCH_SIZE = 10; // Process users in batches
  private readonly BATCH_DELAY_MS = 1000; // Delay between batches to prevent overload

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Recommendation)
    private readonly recommendationRepository: Repository<Recommendation>,
    @InjectRepository(ProjectView)
    private readonly projectViewRepository: Repository<ProjectView>,
    private readonly recommendationService: RecommendationService,
    private readonly cacheService: RecommendationCacheService,
  ) {}

  /**
   * Scheduled task to refresh stale recommendations every 2 hours
   */
  @Cron('0 */2 * * *') // Every 2 hours
  async refreshStaleRecommendations(): Promise<void> {
    if (this.isRefreshRunning) {
      this.logger.warn('Recommendation refresh already running, skipping...');
      return;
    }

    this.isRefreshRunning = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting scheduled stale recommendation refresh...');

      // Get students with stale recommendations
      const staleStudentIds = await this.getStudentsWithStaleRecommendations();

      if (staleStudentIds.length === 0) {
        this.logger.log('No stale recommendations found');
        return;
      }

      const stats =
        await this.refreshRecommendationsForStudents(staleStudentIds);

      this.logger.log(
        `Stale recommendation refresh completed: ${stats.refreshedCount}/${stats.totalStudents} refreshed, ` +
          `${stats.errorCount} errors, ${stats.skippedCount} skipped in ${stats.processingTimeMs}ms`,
      );
    } catch (error) {
      this.logger.error(
        'Error during scheduled recommendation refresh:',
        error,
      );
    } finally {
      this.isRefreshRunning = false;
    }
  }

  /**
   * Scheduled task to warm up cache for active users daily at 1 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async warmUpActiveUserCache(): Promise<void> {
    try {
      this.logger.log('Starting cache warm-up for active users...');

      const activeStudentIds = await this.getActiveStudentIds();

      if (activeStudentIds.length === 0) {
        this.logger.log('No active students found for cache warm-up');
        return;
      }

      // Pre-generate recommendations for active users who don't have cached recommendations
      const studentsNeedingWarmUp =
        await this.getStudentsNeedingCacheWarmUp(activeStudentIds);

      if (studentsNeedingWarmUp.length === 0) {
        this.logger.log('All active users already have cached recommendations');
        return;
      }

      const stats = await this.refreshRecommendationsForStudents(
        studentsNeedingWarmUp,
      );

      this.logger.log(
        `Cache warm-up completed: ${stats.refreshedCount}/${stats.totalStudents} warmed up, ` +
          `${stats.errorCount} errors in ${stats.processingTimeMs}ms`,
      );
    } catch (error) {
      this.logger.error('Error during cache warm-up:', error);
    }
  }

  /**
   * Scheduled task to clean up expired recommendations daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredRecommendations(): Promise<void> {
    try {
      this.logger.log('Starting cleanup of expired recommendations...');

      const expiredCount = await this.recommendationRepository.count({
        where: {
          status: RecommendationStatus.ACTIVE,
          expiresAt: LessThan(new Date()),
        },
      });

      if (expiredCount === 0) {
        this.logger.log('No expired recommendations found');
        return;
      }

      // Mark expired recommendations as expired
      await this.recommendationRepository.update(
        {
          status: RecommendationStatus.ACTIVE,
          expiresAt: LessThan(new Date()),
        },
        {
          status: RecommendationStatus.EXPIRED,
        },
      );

      this.logger.log(`Marked ${expiredCount} recommendations as expired`);
    } catch (error) {
      this.logger.error('Error during recommendation cleanup:', error);
    }
  }

  /**
   * Manual refresh for specific students
   */
  async refreshRecommendationsForStudents(
    studentIds: string[],
  ): Promise<RefreshStats> {
    const startTime = Date.now();
    const stats: RefreshStats = {
      totalStudents: studentIds.length,
      refreshedCount: 0,
      errorCount: 0,
      skippedCount: 0,
      processingTimeMs: 0,
    };

    this.logger.log(
      `Starting recommendation refresh for ${studentIds.length} students...`,
    );

    // Process in batches to prevent overwhelming the system
    for (let i = 0; i < studentIds.length; i += this.BATCH_SIZE) {
      const batch = studentIds.slice(i, i + this.BATCH_SIZE);

      const batchPromises = batch.map(async (studentId) => {
        try {
          // Invalidate existing cache
          await this.cacheService.invalidateRecommendations(studentId);

          // Generate fresh recommendations
          await this.recommendationService.generateRecommendations(studentId, {
            forceRefresh: true,
          });

          stats.refreshedCount++;
          this.logger.debug(
            `Refreshed recommendations for student: ${studentId}`,
          );
        } catch (error) {
          stats.errorCount++;
          this.logger.error(
            `Error refreshing recommendations for student ${studentId}:`,
            error,
          );
        }
      });

      // Wait for batch to complete
      await Promise.allSettled(batchPromises);

      // Add delay between batches to prevent overloading
      if (i + this.BATCH_SIZE < studentIds.length) {
        await this.delay(this.BATCH_DELAY_MS);
      }
    }

    stats.processingTimeMs = Date.now() - startTime;
    return stats;
  }

  /**
   * Get students with stale recommendations
   */
  private async getStudentsWithStaleRecommendations(): Promise<string[]> {
    const staleThreshold = new Date(
      Date.now() - this.STALE_THRESHOLD_HOURS * 60 * 60 * 1000,
    );

    const staleRecommendations = await this.recommendationRepository.find({
      where: {
        status: RecommendationStatus.ACTIVE,
        updatedAt: LessThan(staleThreshold),
      },
      select: ['studentId'],
    });

    return staleRecommendations.map((rec) => rec.studentId);
  }

  /**
   * Get active student IDs (students who have been active recently)
   */
  private async getActiveStudentIds(): Promise<string[]> {
    const activeThreshold = new Date(
      Date.now() - this.ACTIVE_USER_DAYS * 24 * 60 * 60 * 1000,
    );

    // Get students who have viewed projects recently
    const activeViews = await this.projectViewRepository
      .createQueryBuilder('pv')
      .select('DISTINCT pv.viewerId', 'viewerId')
      .where('pv.viewedAt > :threshold', { threshold: activeThreshold })
      .andWhere('pv.viewerId IS NOT NULL')
      .getRawMany();

    const activeUserIds = activeViews.map((view) => view.viewerId);

    // Filter to only include students
    const activeStudents =
      activeUserIds.length > 0
        ? await this.userRepository
            .createQueryBuilder('user')
            .select('user.id')
            .where('user.id IN (:...activeUserIds)', { activeUserIds })
            .andWhere('user.role = :role', { role: UserRole.STUDENT })
            .getMany()
        : [];

    return activeStudents.map((student) => student.id);
  }

  /**
   * Get students who need cache warm-up (active students without cached recommendations)
   */
  private async getStudentsNeedingCacheWarmUp(
    activeStudentIds: string[],
  ): Promise<string[]> {
    const studentsNeedingWarmUp: string[] = [];

    for (const studentId of activeStudentIds) {
      const cached =
        await this.cacheService.getCachedRecommendations(studentId);
      if (!cached) {
        studentsNeedingWarmUp.push(studentId);
      }
    }

    return studentsNeedingWarmUp;
  }

  /**
   * Force refresh recommendations for a specific student
   */
  async forceRefreshStudent(studentId: string): Promise<void> {
    this.logger.log(
      `Force refreshing recommendations for student: ${studentId}`,
    );

    try {
      await this.cacheService.invalidateStudentCaches(studentId);
      await this.recommendationService.generateRecommendations(studentId, {
        forceRefresh: true,
      });

      this.logger.log(
        `Successfully force refreshed recommendations for student: ${studentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error force refreshing recommendations for student ${studentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get refresh service statistics
   */
  async getRefreshStats(): Promise<{
    isRefreshRunning: boolean;
    staleRecommendationsCount: number;
    activeStudentsCount: number;
    totalRecommendationsCount: number;
    expiredRecommendationsCount: number;
  }> {
    const [
      staleStudentIds,
      activeStudentIds,
      totalRecommendations,
      expiredRecommendations,
    ] = await Promise.all([
      this.getStudentsWithStaleRecommendations(),
      this.getActiveStudentIds(),
      this.recommendationRepository.count({
        where: { status: RecommendationStatus.ACTIVE },
      }),
      this.recommendationRepository.count({
        where: { status: RecommendationStatus.EXPIRED },
      }),
    ]);

    return {
      isRefreshRunning: this.isRefreshRunning,
      staleRecommendationsCount: staleStudentIds.length,
      activeStudentsCount: activeStudentIds.length,
      totalRecommendationsCount: totalRecommendations,
      expiredRecommendationsCount: expiredRecommendations,
    };
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectView } from '../entities/project-view.entity';

export interface ViewTrackingData {
  projectId: string;
  viewerId?: string;
  ipAddress: string;
  userAgent: string;
}

@Injectable()
export class ProjectViewTrackingService {
  private readonly logger = new Logger(ProjectViewTrackingService.name);
  private readonly viewDeduplicationWindow = 30 * 60 * 1000; // 30 minutes in milliseconds

  constructor(
    @InjectRepository(ProjectView)
    private readonly projectViewRepository: Repository<ProjectView>,
  ) {}

  /**
   * Track a project view with deduplication to prevent spam
   * @param data View tracking data including project ID, viewer info, and request metadata
   * @returns Promise<boolean> - true if view was recorded, false if deduplicated
   */
  async trackProjectView(data: ViewTrackingData): Promise<boolean> {
    try {
      // Check for duplicate views within the deduplication window
      const isDuplicate = await this.isDuplicateView(data);

      if (isDuplicate) {
        this.logger.debug(
          `Duplicate view detected for project ${data.projectId} from IP ${data.ipAddress}`,
        );
        return false;
      }

      // Create and save the view record
      const projectView = this.projectViewRepository.create({
        projectId: data.projectId,
        viewerId: data.viewerId || null,
        ipAddress: data.ipAddress,
        userAgent: this.sanitizeUserAgent(data.userAgent),
      });

      await this.projectViewRepository.save(projectView);

      this.logger.debug(
        `View tracked for project ${data.projectId} from ${data.viewerId ? 'authenticated user' : 'anonymous user'}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to track view for project ${data.projectId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get view count for a specific project
   * @param projectId The project ID to get view count for
   * @returns Promise<number> - total view count
   */
  async getProjectViewCount(projectId: string): Promise<number> {
    try {
      return await this.projectViewRepository.count({
        where: { projectId },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get view count for project ${projectId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get unique viewer count for a specific project (authenticated users only)
   * @param projectId The project ID to get unique viewer count for
   * @returns Promise<number> - unique authenticated viewer count
   */
  async getProjectUniqueViewerCount(projectId: string): Promise<number> {
    try {
      const result = await this.projectViewRepository
        .createQueryBuilder('view')
        .select('COUNT(DISTINCT view.viewerId)', 'count')
        .where('view.projectId = :projectId', { projectId })
        .andWhere('view.viewerId IS NOT NULL')
        .getRawOne();

      return parseInt(result.count) || 0;
    } catch (error) {
      this.logger.error(
        `Failed to get unique viewer count for project ${projectId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get recent views for a project within a time period
   * @param projectId The project ID
   * @param hours Number of hours to look back (default: 24)
   * @returns Promise<number> - view count in the specified time period
   */
  async getRecentViewCount(
    projectId: string,
    hours: number = 24,
  ): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

      return await this.projectViewRepository.count({
        where: {
          projectId,
          viewedAt: {
            $gte: cutoffDate,
          } as any,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get recent view count for project ${projectId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Check if a view is a duplicate within the deduplication window
   * @param data View tracking data
   * @returns Promise<boolean> - true if duplicate, false otherwise
   */
  private async isDuplicateView(data: ViewTrackingData): Promise<boolean> {
    const cutoffTime = new Date(Date.now() - this.viewDeduplicationWindow);

    const whereConditions: any = {
      projectId: data.projectId,
      ipAddress: data.ipAddress,
      viewedAt: {
        $gte: cutoffTime,
      } as any,
    };

    // If user is authenticated, also check by viewer ID
    if (data.viewerId) {
      whereConditions.viewerId = data.viewerId;
    }

    const existingView = await this.projectViewRepository.findOne({
      where: whereConditions,
    });

    return !!existingView;
  }

  /**
   * Sanitize user agent string to prevent potential security issues
   * @param userAgent Raw user agent string
   * @returns string - sanitized user agent
   */
  private sanitizeUserAgent(userAgent: string): string {
    if (!userAgent) {
      return 'Unknown';
    }

    // Limit length and remove potentially harmful characters
    return userAgent
      .substring(0, 500)
      .replace(/[<>'"]/g, '')
      .trim();
  }

  /**
   * Clean up old view records to maintain database performance
   * @param daysToKeep Number of days of view data to retain (default: 365)
   * @returns Promise<number> - number of records deleted
   */
  async cleanupOldViews(daysToKeep: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date(
        Date.now() - daysToKeep * 24 * 60 * 60 * 1000,
      );

      const result = await this.projectViewRepository
        .createQueryBuilder()
        .delete()
        .where('viewedAt < :cutoffDate', { cutoffDate })
        .execute();

      this.logger.log(
        `Cleaned up ${result.affected} old view records older than ${daysToKeep} days`,
      );
      return result.affected || 0;
    } catch (error) {
      this.logger.error('Failed to cleanup old view records:', error);
      throw error;
    }
  }
}

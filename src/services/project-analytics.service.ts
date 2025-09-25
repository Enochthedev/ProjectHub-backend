import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectView } from '../entities/project-view.entity';
import { ProjectBookmark } from '../entities/project-bookmark.entity';
import { ApprovalStatus } from '../common/enums/approval-status.enum';

export interface ProjectPopularityMetrics {
  projectId: string;
  title: string;
  viewCount: number;
  bookmarkCount: number;
  uniqueViewerCount: number;
  popularityScore: number;
  recentViewCount: number;
}

export interface TrendingProject {
  projectId: string;
  title: string;
  specialization: string;
  technologyStack: string[];
  viewCount: number;
  bookmarkCount: number;
  trendScore: number;
}

export interface SupervisorAnalytics {
  supervisorId: string;
  supervisorName: string;
  totalProjects: number;
  totalViews: number;
  totalBookmarks: number;
  averageViewsPerProject: number;
  averageBookmarksPerProject: number;
  mostPopularProject: {
    id: string;
    title: string;
    viewCount: number;
    bookmarkCount: number;
  } | null;
}

export interface TechnologyTrend {
  technology: string;
  projectCount: number;
  totalViews: number;
  totalBookmarks: number;
  averagePopularity: number;
}

export interface SpecializationTrend {
  specialization: string;
  projectCount: number;
  totalViews: number;
  totalBookmarks: number;
  averagePopularity: number;
}

@Injectable()
export class ProjectAnalyticsService {
  private readonly logger = new Logger(ProjectAnalyticsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectView)
    private readonly projectViewRepository: Repository<ProjectView>,
    @InjectRepository(ProjectBookmark)
    private readonly projectBookmarkRepository: Repository<ProjectBookmark>,
  ) {}

  /**
   * Get popularity metrics for a specific project
   * @param projectId The project ID to analyze
   * @returns Promise<ProjectPopularityMetrics | null>
   */
  async getProjectPopularityMetrics(
    projectId: string,
  ): Promise<ProjectPopularityMetrics | null> {
    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
        select: ['id', 'title'],
      });

      if (!project) {
        return null;
      }

      const [viewCount, bookmarkCount, uniqueViewerCount, recentViewCount] =
        await Promise.all([
          this.projectViewRepository.count({ where: { projectId } }),
          this.projectBookmarkRepository.count({ where: { projectId } }),
          this.getUniqueViewerCount(projectId),
          this.getRecentViewCount(projectId, 7), // Last 7 days
        ]);

      const popularityScore = this.calculatePopularityScore(
        viewCount,
        bookmarkCount,
        uniqueViewerCount,
      );

      return {
        projectId,
        title: project.title,
        viewCount,
        bookmarkCount,
        uniqueViewerCount,
        popularityScore,
        recentViewCount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get popularity metrics for project ${projectId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get trending projects based on recent activity and engagement
   * @param limit Number of trending projects to return (default: 10)
   * @param days Number of days to consider for trending calculation (default: 7)
   * @returns Promise<TrendingProject[]>
   */
  async getTrendingProjects(
    limit: number = 10,
    days: number = 7,
  ): Promise<TrendingProject[]> {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const query = `
        SELECT 
          p.id as "projectId",
          p.title,
          p.specialization,
          p.technology_stack as "technologyStack",
          COALESCE(v.view_count, 0) as "viewCount",
          COALESCE(b.bookmark_count, 0) as "bookmarkCount",
          (
            COALESCE(v.view_count, 0) * 1.0 + 
            COALESCE(b.bookmark_count, 0) * 3.0 +
            COALESCE(rv.recent_views, 0) * 2.0
          ) as "trendScore"
        FROM projects p
        LEFT JOIN (
          SELECT 
            project_id, 
            COUNT(*) as view_count
          FROM project_views 
          GROUP BY project_id
        ) v ON p.id = v.project_id
        LEFT JOIN (
          SELECT 
            project_id, 
            COUNT(*) as bookmark_count
          FROM project_bookmarks 
          GROUP BY project_id
        ) b ON p.id = b.project_id
        LEFT JOIN (
          SELECT 
            project_id, 
            COUNT(*) as recent_views
          FROM project_views 
          WHERE viewed_at >= $1
          GROUP BY project_id
        ) rv ON p.id = rv.project_id
        WHERE p.approval_status = 'approved'
        ORDER BY "trendScore" DESC
        LIMIT $2
      `;

      const results = await this.projectRepository.query(query, [
        cutoffDate,
        limit,
      ]);

      return results.map((row: any) => ({
        projectId: row.projectId,
        title: row.title,
        specialization: row.specialization,
        technologyStack: row.technologyStack || [],
        viewCount: parseInt(row.viewCount) || 0,
        bookmarkCount: parseInt(row.bookmarkCount) || 0,
        trendScore: parseFloat(row.trendScore) || 0,
      }));
    } catch (error) {
      this.logger.error('Failed to get trending projects:', error);
      throw error;
    }
  }

  /**
   * Get analytics for a specific supervisor
   * @param supervisorId The supervisor ID to analyze
   * @returns Promise<SupervisorAnalytics | null>
   */
  async getSupervisorAnalytics(
    supervisorId: string,
  ): Promise<SupervisorAnalytics | null> {
    try {
      const query = `
        SELECT 
          u.id as supervisor_id,
          u.first_name || ' ' || u.last_name as supervisor_name,
          COUNT(p.id) as total_projects,
          COALESCE(SUM(v.view_count), 0) as total_views,
          COALESCE(SUM(b.bookmark_count), 0) as total_bookmarks,
          CASE 
            WHEN COUNT(p.id) > 0 THEN COALESCE(SUM(v.view_count), 0)::float / COUNT(p.id)
            ELSE 0 
          END as average_views_per_project,
          CASE 
            WHEN COUNT(p.id) > 0 THEN COALESCE(SUM(b.bookmark_count), 0)::float / COUNT(p.id)
            ELSE 0 
          END as average_bookmarks_per_project
        FROM users u
        LEFT JOIN projects p ON u.id = p.supervisor_id AND p.approval_status = 'approved'
        LEFT JOIN (
          SELECT 
            project_id, 
            COUNT(*) as view_count
          FROM project_views 
          GROUP BY project_id
        ) v ON p.id = v.project_id
        LEFT JOIN (
          SELECT 
            project_id, 
            COUNT(*) as bookmark_count
          FROM project_bookmarks 
          GROUP BY project_id
        ) b ON p.id = b.project_id
        WHERE u.id = $1
        GROUP BY u.id, u.first_name, u.last_name
      `;

      const result = await this.projectRepository.query(query, [supervisorId]);

      if (!result || result.length === 0) {
        return null;
      }

      const analytics = result[0];

      // Get most popular project for this supervisor
      const mostPopularProject =
        await this.getMostPopularProjectForSupervisor(supervisorId);

      return {
        supervisorId: analytics.supervisor_id,
        supervisorName: analytics.supervisor_name,
        totalProjects: parseInt(analytics.total_projects) || 0,
        totalViews: parseInt(analytics.total_views) || 0,
        totalBookmarks: parseInt(analytics.total_bookmarks) || 0,
        averageViewsPerProject:
          parseFloat(analytics.average_views_per_project) || 0,
        averageBookmarksPerProject:
          parseFloat(analytics.average_bookmarks_per_project) || 0,
        mostPopularProject,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get supervisor analytics for ${supervisorId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get technology trends based on project popularity
   * @param limit Number of technologies to return (default: 20)
   * @returns Promise<TechnologyTrend[]>
   */
  async getTechnologyTrends(limit: number = 20): Promise<TechnologyTrend[]> {
    try {
      const query = `
        WITH technology_stats AS (
          SELECT 
            UNNEST(p.technology_stack) as technology,
            p.id as project_id
          FROM projects p
          WHERE p.approval_status = 'approved'
            AND p.technology_stack IS NOT NULL
            AND array_length(p.technology_stack, 1) > 0
        ),
        technology_metrics AS (
          SELECT 
            ts.technology,
            COUNT(DISTINCT ts.project_id) as project_count,
            COALESCE(SUM(v.view_count), 0) as total_views,
            COALESCE(SUM(b.bookmark_count), 0) as total_bookmarks
          FROM technology_stats ts
          LEFT JOIN (
            SELECT 
              project_id, 
              COUNT(*) as view_count
            FROM project_views 
            GROUP BY project_id
          ) v ON ts.project_id = v.project_id
          LEFT JOIN (
            SELECT 
              project_id, 
              COUNT(*) as bookmark_count
            FROM project_bookmarks 
            GROUP BY project_id
          ) b ON ts.project_id = b.project_id
          GROUP BY ts.technology
        )
        SELECT 
          technology,
          project_count,
          total_views,
          total_bookmarks,
          CASE 
            WHEN project_count > 0 THEN (total_views + total_bookmarks * 2.0) / project_count
            ELSE 0 
          END as average_popularity
        FROM technology_metrics
        WHERE project_count > 0
        ORDER BY average_popularity DESC, project_count DESC
        LIMIT $1
      `;

      const results = await this.projectRepository.query(query, [limit]);

      return results.map((row: any) => ({
        technology: row.technology,
        projectCount: parseInt(row.project_count) || 0,
        totalViews: parseInt(row.total_views) || 0,
        totalBookmarks: parseInt(row.total_bookmarks) || 0,
        averagePopularity: parseFloat(row.average_popularity) || 0,
      }));
    } catch (error) {
      this.logger.error('Failed to get technology trends:', error);
      throw error;
    }
  }

  /**
   * Get specialization trends based on project popularity
   * @returns Promise<SpecializationTrend[]>
   */
  async getSpecializationTrends(): Promise<SpecializationTrend[]> {
    try {
      const query = `
        SELECT 
          p.specialization,
          COUNT(p.id) as project_count,
          COALESCE(SUM(v.view_count), 0) as total_views,
          COALESCE(SUM(b.bookmark_count), 0) as total_bookmarks,
          CASE 
            WHEN COUNT(p.id) > 0 THEN (COALESCE(SUM(v.view_count), 0) + COALESCE(SUM(b.bookmark_count), 0) * 2.0) / COUNT(p.id)
            ELSE 0 
          END as average_popularity
        FROM projects p
        LEFT JOIN (
          SELECT 
            project_id, 
            COUNT(*) as view_count
          FROM project_views 
          GROUP BY project_id
        ) v ON p.id = v.project_id
        LEFT JOIN (
          SELECT 
            project_id, 
            COUNT(*) as bookmark_count
          FROM project_bookmarks 
          GROUP BY project_id
        ) b ON p.id = b.project_id
        WHERE p.approval_status = 'approved'
        GROUP BY p.specialization
        ORDER BY average_popularity DESC, project_count DESC
      `;

      const results = await this.projectRepository.query(query);

      return results.map((row: any) => ({
        specialization: row.specialization,
        projectCount: parseInt(row.project_count) || 0,
        totalViews: parseInt(row.total_views) || 0,
        totalBookmarks: parseInt(row.total_bookmarks) || 0,
        averagePopularity: parseFloat(row.average_popularity) || 0,
      }));
    } catch (error) {
      this.logger.error('Failed to get specialization trends:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive system analytics for admin dashboard
   * @returns Promise<any> - Complete system analytics
   */
  async getSystemAnalytics(): Promise<any> {
    try {
      const [
        statusStats,
        specializationTrends,
        technologyTrends,
        platformAnalytics,
        trendingProjects,
      ] = await Promise.all([
        this.getProjectStatusStatistics(),
        this.getSpecializationTrends(),
        this.getTechnologyTrends(10),
        this.getPlatformAnalytics(),
        this.getTrendingProjects(5),
      ]);

      // Get projects by year
      const projectsByYear = await this.getProjectsByYear();

      // Get supervisor metrics
      const supervisorMetrics = await this.getSupervisorMetrics();

      // Get recent activity
      const recentActivity = await this.getRecentActivity();

      return {
        totalProjects: platformAnalytics.totalProjects,
        projectsByStatus: statusStats,
        projectsBySpecialization: specializationTrends.reduce(
          (acc, trend) => {
            acc[trend.specialization] = trend.projectCount;
            return acc;
          },
          {} as Record<string, number>,
        ),
        projectsByYear,
        popularityMetrics: {
          totalViews: platformAnalytics.totalViews,
          totalBookmarks: platformAnalytics.totalBookmarks,
          averageViewsPerProject: platformAnalytics.averageViewsPerProject,
          averageBookmarksPerProject:
            platformAnalytics.averageBookmarksPerProject,
        },
        trendingTechnologies: technologyTrends.slice(0, 10).map((tech) => ({
          technology: tech.technology,
          count: tech.projectCount,
          trend:
            tech.averagePopularity > 5
              ? 'up'
              : tech.averagePopularity > 2
                ? 'stable'
                : 'down',
        })),
        supervisorMetrics,
        recentActivity,
      };
    } catch (error) {
      this.logger.error('Failed to get system analytics:', error);
      throw error;
    }
  }

  /**
   * Get overall platform analytics
   * @returns Promise<any> - Platform-wide statistics
   */
  async getPlatformAnalytics(): Promise<any> {
    try {
      const [
        totalProjects,
        totalViews,
        totalBookmarks,
        totalUniqueViewers,
        recentViews,
        recentBookmarks,
      ] = await Promise.all([
        this.projectRepository.count({
          where: { approvalStatus: ApprovalStatus.APPROVED },
        }),
        this.projectViewRepository.count(),
        this.projectBookmarkRepository.count(),
        this.getTotalUniqueViewers(),
        this.getRecentPlatformViews(7),
        this.getRecentPlatformBookmarks(7),
      ]);

      return {
        totalProjects,
        totalViews,
        totalBookmarks,
        totalUniqueViewers,
        recentViews,
        recentBookmarks,
        averageViewsPerProject:
          totalProjects > 0 ? totalViews / totalProjects : 0,
        averageBookmarksPerProject:
          totalProjects > 0 ? totalBookmarks / totalProjects : 0,
      };
    } catch (error) {
      this.logger.error('Failed to get platform analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate popularity score based on views, bookmarks, and unique viewers
   * @param viewCount Total view count
   * @param bookmarkCount Total bookmark count
   * @param uniqueViewerCount Unique viewer count
   * @returns number - Calculated popularity score
   */
  private calculatePopularityScore(
    viewCount: number,
    bookmarkCount: number,
    uniqueViewerCount: number,
  ): number {
    // Weighted formula: views (1x) + bookmarks (3x) + unique viewers (2x)
    return viewCount * 1.0 + bookmarkCount * 3.0 + uniqueViewerCount * 2.0;
  }

  /**
   * Get unique viewer count for a project
   * @param projectId The project ID
   * @returns Promise<number>
   */
  private async getUniqueViewerCount(projectId: string): Promise<number> {
    const result = await this.projectViewRepository
      .createQueryBuilder('view')
      .select('COUNT(DISTINCT view.viewerId)', 'count')
      .where('view.projectId = :projectId', { projectId })
      .andWhere('view.viewerId IS NOT NULL')
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  /**
   * Get recent view count for a project
   * @param projectId The project ID
   * @param days Number of days to look back
   * @returns Promise<number>
   */
  private async getRecentViewCount(
    projectId: string,
    days: number,
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return await this.projectViewRepository.count({
      where: {
        projectId,
        viewedAt: {
          $gte: cutoffDate,
        } as any,
      },
    });
  }

  /**
   * Get most popular project for a supervisor
   * @param supervisorId The supervisor ID
   * @returns Promise<any>
   */
  private async getMostPopularProjectForSupervisor(
    supervisorId: string,
  ): Promise<any> {
    const query = `
      SELECT 
        p.id,
        p.title,
        COALESCE(v.view_count, 0) as view_count,
        COALESCE(b.bookmark_count, 0) as bookmark_count,
        (COALESCE(v.view_count, 0) + COALESCE(b.bookmark_count, 0) * 2) as popularity_score
      FROM projects p
      LEFT JOIN (
        SELECT 
          project_id, 
          COUNT(*) as view_count
        FROM project_views 
        GROUP BY project_id
      ) v ON p.id = v.project_id
      LEFT JOIN (
        SELECT 
          project_id, 
          COUNT(*) as bookmark_count
        FROM project_bookmarks 
        GROUP BY project_id
      ) b ON p.id = b.project_id
      WHERE p.supervisor_id = $1 AND p.approval_status = 'approved'
      ORDER BY popularity_score DESC
      LIMIT 1
    `;

    const result = await this.projectRepository.query(query, [supervisorId]);

    if (!result || result.length === 0) {
      return null;
    }

    const project = result[0];
    return {
      id: project.id,
      title: project.title,
      viewCount: parseInt(project.view_count) || 0,
      bookmarkCount: parseInt(project.bookmark_count) || 0,
    };
  }

  /**
   * Get total unique viewers across the platform
   * @returns Promise<number>
   */
  private async getTotalUniqueViewers(): Promise<number> {
    const result = await this.projectViewRepository
      .createQueryBuilder('view')
      .select('COUNT(DISTINCT view.viewerId)', 'count')
      .where('view.viewerId IS NOT NULL')
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  /**
   * Get recent platform views
   * @param days Number of days to look back
   * @returns Promise<number>
   */
  private async getRecentPlatformViews(days: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return await this.projectViewRepository.count({
      where: {
        viewedAt: {
          $gte: cutoffDate,
        } as any,
      },
    });
  }

  /**
   * Get recent platform bookmarks
   * @param days Number of days to look back
   * @returns Promise<number>
   */
  private async getRecentPlatformBookmarks(days: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return await this.projectBookmarkRepository.count({
      where: {
        createdAt: {
          $gte: cutoffDate,
        } as any,
      },
    });
  }

  /**
   * Get project status statistics
   * @returns Promise<any>
   */
  private async getProjectStatusStatistics(): Promise<any> {
    const query = `
      SELECT 
        approval_status,
        COUNT(*) as count
      FROM projects
      GROUP BY approval_status
    `;

    const results = await this.projectRepository.query(query);

    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      archived: 0,
    };

    results.forEach((row: any) => {
      stats[row.approval_status as keyof typeof stats] =
        parseInt(row.count) || 0;
    });

    return stats;
  }

  /**
   * Get projects by year
   * @returns Promise<Record<string, number>>
   */
  private async getProjectsByYear(): Promise<Record<string, number>> {
    const query = `
      SELECT 
        year,
        COUNT(*) as count
      FROM projects
      WHERE approval_status = 'approved'
      GROUP BY year
      ORDER BY year DESC
    `;

    const results = await this.projectRepository.query(query);

    const projectsByYear: Record<string, number> = {};
    results.forEach((row: any) => {
      projectsByYear[row.year.toString()] = parseInt(row.count) || 0;
    });

    return projectsByYear;
  }

  /**
   * Get supervisor metrics
   * @returns Promise<any>
   */
  private async getSupervisorMetrics(): Promise<any> {
    const query = `
      SELECT 
        COUNT(DISTINCT u.id) as total_supervisors,
        COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN u.id END) as active_supervisors,
        CASE 
          WHEN COUNT(DISTINCT u.id) > 0 THEN COUNT(p.id)::float / COUNT(DISTINCT u.id)
          ELSE 0 
        END as average_projects_per_supervisor
      FROM users u
      LEFT JOIN projects p ON u.id = p.supervisor_id AND p.approval_status = 'approved'
      WHERE u.role = 'supervisor'
    `;

    const result = await this.projectRepository.query(query);

    if (!result || result.length === 0) {
      return {
        totalSupervisors: 0,
        activeSupervisors: 0,
        averageProjectsPerSupervisor: 0,
      };
    }

    const row = result[0];
    return {
      totalSupervisors: parseInt(row.total_supervisors) || 0,
      activeSupervisors: parseInt(row.active_supervisors) || 0,
      averageProjectsPerSupervisor:
        parseFloat(row.average_projects_per_supervisor) || 0,
    };
  }

  /**
   * Get recent activity metrics
   * @returns Promise<any>
   */
  private async getRecentActivity(): Promise<any> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [submitted, approved, rejected] = await Promise.all([
      this.projectRepository.count({
        where: {
          createdAt: {
            $gte: oneWeekAgo,
          } as any,
        },
      }),
      this.projectRepository.count({
        where: {
          approvalStatus: ApprovalStatus.APPROVED,
          approvedAt: {
            $gte: oneWeekAgo,
          } as any,
        },
      }),
      this.projectRepository.count({
        where: {
          approvalStatus: ApprovalStatus.REJECTED,
          updatedAt: {
            $gte: oneWeekAgo,
          } as any,
        },
      }),
    ]);

    return {
      projectsSubmittedThisWeek: submitted,
      projectsApprovedThisWeek: approved,
      projectsRejectedThisWeek: rejected,
    };
  }
}

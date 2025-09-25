import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Project } from '../entities/project.entity';
import { SearchProjectsDto } from '../dto/search/search-projects.dto';
import { ProjectSortBy } from '../common/enums/project-sort-by.enum';
import { ApprovalStatus } from '../common/enums/approval-status.enum';

@Injectable()
export class QueryOptimizationService {
  private readonly logger = new Logger(QueryOptimizationService.name);

  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  /**
   * Create optimized query builder for project search
   */
  createOptimizedSearchQuery(
    searchDto: SearchProjectsDto,
  ): SelectQueryBuilder<Project> {
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.supervisor', 'supervisor');

    // Always filter by approved status for public searches
    queryBuilder.where('project.approvalStatus = :status', {
      status: ApprovalStatus.APPROVED,
    });

    // Apply filters in order of selectivity (most selective first)
    this.applyFiltersOptimized(queryBuilder, searchDto);

    // Apply sorting with optimized indexes
    this.applySortingOptimized(queryBuilder, searchDto);

    // Apply pagination
    if (searchDto.limit) {
      queryBuilder.limit(searchDto.limit);
    }
    if (searchDto.offset) {
      queryBuilder.offset(searchDto.offset);
    }

    return queryBuilder;
  }

  /**
   * Apply filters in optimized order (most selective first)
   */
  private applyFiltersOptimized(
    queryBuilder: SelectQueryBuilder<Project>,
    searchDto: SearchProjectsDto,
  ): void {
    // 1. Year filter (usually most selective)
    if (searchDto.yearFrom || searchDto.yearTo) {
      if (searchDto.yearFrom && searchDto.yearTo) {
        queryBuilder.andWhere('project.year BETWEEN :yearFrom AND :yearTo', {
          yearFrom: searchDto.yearFrom,
          yearTo: searchDto.yearTo,
        });
      } else if (searchDto.yearFrom) {
        queryBuilder.andWhere('project.year >= :yearFrom', {
          yearFrom: searchDto.yearFrom,
        });
      } else if (searchDto.yearTo) {
        queryBuilder.andWhere('project.year <= :yearTo', {
          yearTo: searchDto.yearTo,
        });
      }
    }

    // 2. Specialization filter (moderately selective)
    if (searchDto.specializations && searchDto.specializations.length > 0) {
      queryBuilder.andWhere('project.specialization IN (:...specializations)', {
        specializations: searchDto.specializations,
      });
    }

    // 3. Difficulty level filter
    if (searchDto.difficultyLevels && searchDto.difficultyLevels.length > 0) {
      queryBuilder.andWhere(
        'project.difficultyLevel IN (:...difficultyLevels)',
        {
          difficultyLevels: searchDto.difficultyLevels,
        },
      );
    }

    // 4. Group project filter
    if (searchDto.isGroupProject !== undefined) {
      queryBuilder.andWhere('project.isGroupProject = :isGroupProject', {
        isGroupProject: searchDto.isGroupProject,
      });
    }

    // 5. Tag filter (uses GIN index)
    if (searchDto.tags && searchDto.tags.length > 0) {
      queryBuilder.andWhere('project.tags && :tags', {
        tags: searchDto.tags,
      });
    }

    // 6. Full-text search (most expensive, applied last)
    if (searchDto.query) {
      const sanitizedQuery = this.sanitizeSearchQuery(searchDto.query);
      queryBuilder.andWhere('project.searchVector @@ plainto_tsquery(:query)', {
        query: sanitizedQuery,
      });
    }
  }

  /**
   * Apply sorting with index-optimized queries
   */
  private applySortingOptimized(
    queryBuilder: SelectQueryBuilder<Project>,
    searchDto: SearchProjectsDto,
  ): void {
    const sortOrder =
      (searchDto.sortOrder?.toUpperCase() as 'ASC' | 'DESC') || 'DESC';

    switch (searchDto.sortBy) {
      case ProjectSortBy.RELEVANCE:
        if (searchDto.query) {
          // Use full-text search ranking
          queryBuilder
            .addSelect(
              'ts_rank(project.searchVector, plainto_tsquery(:query))',
              'rank',
            )
            .orderBy('rank', 'DESC')
            .addOrderBy('project.year', 'DESC')
            .addOrderBy('project.createdAt', 'DESC');
        } else {
          // Default to date sorting when no search query
          queryBuilder
            .orderBy('project.year', 'DESC')
            .addOrderBy('project.createdAt', 'DESC');
        }
        break;

      case ProjectSortBy.DATE:
        queryBuilder
          .orderBy('project.year', sortOrder)
          .addOrderBy('project.createdAt', sortOrder);
        break;

      case ProjectSortBy.TITLE:
        queryBuilder
          .orderBy('project.title', sortOrder)
          .addOrderBy('project.createdAt', 'DESC');
        break;

      case ProjectSortBy.POPULARITY:
        // Use subquery to calculate popularity score
        queryBuilder
          .leftJoin('project.views', 'views')
          .leftJoin('project.bookmarks', 'bookmarks')
          .addSelect(
            'COUNT(DISTINCT views.id) + COUNT(DISTINCT bookmarks.id) * 2',
            'popularity',
          )
          .groupBy('project.id')
          .addGroupBy('supervisor.id')
          .orderBy('popularity', 'DESC')
          .addOrderBy('project.createdAt', 'DESC');
        break;

      default:
        queryBuilder
          .orderBy('project.year', 'DESC')
          .addOrderBy('project.createdAt', 'DESC');
    }
  }

  /**
   * Sanitize search query to prevent injection
   */
  private sanitizeSearchQuery(query: string): string {
    // Remove special PostgreSQL full-text search characters that could cause issues
    return query
      .replace(/[&|!()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Create optimized query for popular projects
   */
  createPopularProjectsQuery(limit: number = 10): SelectQueryBuilder<Project> {
    return this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.supervisor', 'supervisor')
      .leftJoin(
        'project.views',
        'views',
        "views.viewedAt > NOW() - INTERVAL '30 days'",
      )
      .leftJoin('project.bookmarks', 'bookmarks')
      .where('project.approvalStatus = :status', {
        status: ApprovalStatus.APPROVED,
      })
      .addSelect(
        'COUNT(DISTINCT views.id) + COUNT(DISTINCT bookmarks.id) * 2',
        'popularity',
      )
      .groupBy('project.id')
      .addGroupBy('supervisor.id')
      .orderBy('popularity', 'DESC')
      .addOrderBy('project.createdAt', 'DESC')
      .limit(limit);
  }

  /**
   * Create optimized query for supervisor's projects
   */
  createSupervisorProjectsQuery(
    supervisorId: string,
  ): SelectQueryBuilder<Project> {
    return this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.supervisor', 'supervisor')
      .where('project.supervisorId = :supervisorId', { supervisorId })
      .orderBy('project.approvalStatus', 'ASC') // Pending first
      .addOrderBy('project.createdAt', 'DESC');
  }

  /**
   * Create optimized query for project analytics
   */
  createProjectAnalyticsQuery(projectId: string): SelectQueryBuilder<Project> {
    return this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.views', 'views')
      .leftJoinAndSelect('project.bookmarks', 'bookmarks')
      .where('project.id = :projectId', { projectId })
      .addSelect('COUNT(DISTINCT views.id)', 'viewCount')
      .addSelect('COUNT(DISTINCT bookmarks.id)', 'bookmarkCount')
      .groupBy('project.id');
  }

  /**
   * Analyze query performance and log slow queries
   */
  async analyzeQueryPerformance(
    queryBuilder: SelectQueryBuilder<Project>,
    operation: string,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Get the SQL query for logging
      const sql = queryBuilder.getSql();

      // Execute the query
      const result = await queryBuilder.getMany();

      const executionTime = Date.now() - startTime;

      // Log slow queries (> 1 second)
      if (executionTime > 1000) {
        this.logger.warn(
          `Slow query detected in ${operation}: ${executionTime}ms`,
        );
        this.logger.warn(`SQL: ${sql}`);
      } else if (executionTime > 500) {
        this.logger.debug(`Query ${operation} took ${executionTime}ms`);
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Query failed in ${operation} after ${executionTime}ms:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get database statistics for monitoring
   */
  async getDatabaseStats(): Promise<any> {
    try {
      const stats = await this.projectRepository.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE tablename = 'projects'
        ORDER BY n_distinct DESC
      `);

      const indexStats = await this.projectRepository.query(`
        SELECT 
          indexname,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE relname = 'projects'
        ORDER BY idx_tup_read DESC
      `);

      return {
        columnStats: stats,
        indexStats: indexStats,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Error getting database stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Update table statistics for better query planning
   */
  async updateTableStatistics(): Promise<void> {
    try {
      await this.projectRepository.query('ANALYZE projects');
      await this.projectRepository.query('ANALYZE project_views');
      await this.projectRepository.query('ANALYZE project_bookmarks');

      this.logger.log('Table statistics updated successfully');
    } catch (error) {
      this.logger.error('Error updating table statistics:', error);
      throw error;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Milestone } from '../entities/milestone.entity';
import { MilestoneNote } from '../entities/milestone-note.entity';
import { MilestoneReminder } from '../entities/milestone-reminder.entity';
import { MilestoneFiltersDto } from '../dto/milestone';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';
import { Priority } from '../common/enums/priority.enum';

export interface QueryOptimizationServiceInterface {
  buildOptimizedMilestoneQuery(
    studentId: string,
    filters?: MilestoneFiltersDto,
  ): SelectQueryBuilder<Milestone>;
  buildSupervisorReportingQuery(
    studentIds: string[],
    filters?: any,
  ): SelectQueryBuilder<Milestone>;
  buildAnalyticsQuery(
    studentId: string,
    periodDays?: number,
  ): SelectQueryBuilder<Milestone>;
  buildReminderProcessingQuery(
    daysAhead?: number,
  ): SelectQueryBuilder<Milestone>;
  getQueryExecutionPlan(query: SelectQueryBuilder<any>): Promise<any[]>;
  analyzeQueryPerformance(queryName: string, executionTime: number): void;
}

@Injectable()
export class MilestoneQueryOptimizationService
  implements QueryOptimizationServiceInterface
{
  private readonly logger = new Logger(MilestoneQueryOptimizationService.name);

  // Performance tracking
  private queryPerformanceStats = new Map<
    string,
    {
      totalExecutions: number;
      totalTime: number;
      averageTime: number;
      maxTime: number;
      minTime: number;
    }
  >();

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(MilestoneNote)
    private readonly milestoneNoteRepository: Repository<MilestoneNote>,
    @InjectRepository(MilestoneReminder)
    private readonly milestoneReminderRepository: Repository<MilestoneReminder>,
  ) {}

  buildOptimizedMilestoneQuery(
    studentId: string,
    filters: MilestoneFiltersDto = {},
  ): SelectQueryBuilder<Milestone> {
    this.logger.debug(
      `Building optimized milestone query for student ${studentId}`,
    );

    const queryBuilder = this.milestoneRepository
      .createQueryBuilder('milestone')
      .where('milestone.studentId = :studentId', { studentId });

    // Apply filters with optimized conditions
    this.applyOptimizedFilters(queryBuilder, filters);

    // Optimize joins based on what data is actually needed
    this.applyOptimizedJoins(queryBuilder, filters);

    // Apply optimized ordering
    this.applyOptimizedOrdering(queryBuilder, filters);

    return queryBuilder;
  }

  buildSupervisorReportingQuery(
    studentIds: string[],
    filters: any = {},
  ): SelectQueryBuilder<Milestone> {
    this.logger.debug(
      `Building supervisor reporting query for ${studentIds.length} students`,
    );

    const queryBuilder = this.milestoneRepository
      .createQueryBuilder('milestone')
      .where('milestone.studentId IN (:...studentIds)', { studentIds });

    // Use covering index for supervisor reporting
    queryBuilder.addSelect([
      'milestone.id',
      'milestone.title',
      'milestone.status',
      'milestone.priority',
      'milestone.dueDate',
      'milestone.completedAt',
      'milestone.estimatedHours',
      'milestone.actualHours',
      'milestone.updatedAt',
    ]);

    // Apply supervisor-specific filters
    if (filters.includeAtRisk) {
      queryBuilder.andWhere(
        '(milestone.status = :blocked OR (milestone.dueDate < CURRENT_DATE AND milestone.status NOT IN (:...completedStatuses)))',
        {
          blocked: MilestoneStatus.BLOCKED,
          completedStatuses: [
            MilestoneStatus.COMPLETED,
            MilestoneStatus.CANCELLED,
          ],
        },
      );
    }

    if (filters.priorityThreshold) {
      queryBuilder.andWhere('milestone.priority IN (:...priorities)', {
        priorities: [Priority.HIGH, Priority.CRITICAL],
      });
    }

    // Optimize for supervisor dashboard aggregations
    queryBuilder
      .orderBy('milestone.dueDate', 'ASC')
      .addOrderBy('milestone.priority', 'DESC');

    return queryBuilder;
  }

  buildAnalyticsQuery(
    studentId: string,
    periodDays: number = 90,
  ): SelectQueryBuilder<Milestone> {
    this.logger.debug(
      `Building analytics query for student ${studentId} over ${periodDays} days`,
    );

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const queryBuilder = this.milestoneRepository
      .createQueryBuilder('milestone')
      .where('milestone.studentId = :studentId', { studentId });

    // Use the analytics-optimized index
    queryBuilder.addSelect([
      'milestone.id',
      'milestone.status',
      'milestone.completedAt',
      'milestone.estimatedHours',
      'milestone.actualHours',
      'milestone.priority',
      'milestone.dueDate',
      'milestone.createdAt',
    ]);

    // Filter for analytics period
    queryBuilder.andWhere(
      '(milestone.completedAt >= :startDate OR milestone.createdAt >= :startDate OR milestone.status NOT IN (:...excludedStatuses))',
      {
        startDate: startDate.toISOString().split('T')[0],
        excludedStatuses: [MilestoneStatus.CANCELLED],
      },
    );

    // Order for velocity calculations
    queryBuilder
      .orderBy('milestone.completedAt', 'ASC', 'NULLS LAST')
      .addOrderBy('milestone.dueDate', 'ASC');

    return queryBuilder;
  }

  buildReminderProcessingQuery(
    daysAhead: number = 7,
  ): SelectQueryBuilder<Milestone> {
    this.logger.debug(
      `Building reminder processing query for ${daysAhead} days ahead`,
    );

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const queryBuilder = this.milestoneRepository
      .createQueryBuilder('milestone')
      .leftJoinAndSelect('milestone.reminders', 'reminder')
      .leftJoinAndSelect('milestone.student', 'student')
      .where('milestone.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [
          MilestoneStatus.COMPLETED,
          MilestoneStatus.CANCELLED,
        ],
      })
      .andWhere('milestone.dueDate <= :endDate', {
        endDate: endDate.toISOString().split('T')[0],
      });

    // Use the reminder processing index
    queryBuilder.andWhere('(reminder.id IS NULL OR reminder.sent = false)');

    // Order by urgency (overdue first, then by due date)
    queryBuilder
      .orderBy(
        'CASE WHEN milestone.dueDate < CURRENT_DATE THEN 0 ELSE 1 END',
        'ASC',
      )
      .addOrderBy('milestone.dueDate', 'ASC')
      .addOrderBy('milestone.priority', 'DESC');

    return queryBuilder;
  }

  async getQueryExecutionPlan(query: SelectQueryBuilder<any>): Promise<any[]> {
    try {
      const sql = query.getQuery();
      const parameters = query.getParameters();

      // Get the execution plan (PostgreSQL specific)
      const planQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
      const result = await query.connection.query(
        planQuery,
        Object.values(parameters),
      );

      return result[0]['QUERY PLAN'];
    } catch (error) {
      this.logger.error('Error getting query execution plan:', error);
      return [];
    }
  }

  analyzeQueryPerformance(queryName: string, executionTime: number): void {
    const stats = this.queryPerformanceStats.get(queryName) || {
      totalExecutions: 0,
      totalTime: 0,
      averageTime: 0,
      maxTime: 0,
      minTime: Infinity,
    };

    stats.totalExecutions++;
    stats.totalTime += executionTime;
    stats.averageTime = stats.totalTime / stats.totalExecutions;
    stats.maxTime = Math.max(stats.maxTime, executionTime);
    stats.minTime = Math.min(stats.minTime, executionTime);

    this.queryPerformanceStats.set(queryName, stats);

    // Log slow queries
    if (executionTime > 1000) {
      // More than 1 second
      this.logger.warn(
        `Slow query detected: ${queryName} took ${executionTime}ms`,
      );
    }

    // Log performance summary periodically
    if (stats.totalExecutions % 100 === 0) {
      this.logger.log(
        `Query performance for ${queryName}: avg=${stats.averageTime.toFixed(2)}ms, max=${stats.maxTime}ms, executions=${stats.totalExecutions}`,
      );
    }
  }

  // Get performance statistics for monitoring
  getPerformanceStats(): Map<string, any> {
    return new Map(this.queryPerformanceStats);
  }

  // Reset performance statistics
  resetPerformanceStats(): void {
    this.queryPerformanceStats.clear();
    this.logger.log('Query performance statistics reset');
  }

  // Private helper methods for query optimization

  private applyOptimizedFilters(
    queryBuilder: SelectQueryBuilder<Milestone>,
    filters: MilestoneFiltersDto,
  ): void {
    // Use indexed columns first for better performance

    if (filters.status) {
      queryBuilder.andWhere('milestone.status = :status', {
        status: filters.status,
      });
    }

    if (filters.priority) {
      queryBuilder.andWhere('milestone.priority = :priority', {
        priority: filters.priority,
      });
    }

    if (filters.projectId) {
      queryBuilder.andWhere('milestone.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }

    // Date range filters - use indexed due_date column
    if (filters.dueDateFrom) {
      queryBuilder.andWhere('milestone.dueDate >= :dueDateFrom', {
        dueDateFrom: filters.dueDateFrom,
      });
    }

    if (filters.dueDateTo) {
      queryBuilder.andWhere('milestone.dueDate <= :dueDateTo', {
        dueDateTo: filters.dueDateTo,
      });
    }

    // Overdue filter - use partial index
    if (filters.isOverdue !== undefined) {
      if (filters.isOverdue) {
        queryBuilder.andWhere(
          'milestone.dueDate < CURRENT_DATE AND milestone.status NOT IN (:...completedStatuses)',
          {
            completedStatuses: [
              MilestoneStatus.COMPLETED,
              MilestoneStatus.CANCELLED,
            ],
          },
        );
      } else {
        queryBuilder.andWhere(
          'milestone.dueDate >= CURRENT_DATE OR milestone.status IN (:...completedStatuses)',
          {
            completedStatuses: [
              MilestoneStatus.COMPLETED,
              MilestoneStatus.CANCELLED,
            ],
          },
        );
      }
    }

    // Text search - use full-text search index
    if (filters.search) {
      queryBuilder.andWhere(
        "to_tsvector('english', milestone.title || ' ' || milestone.description) @@ plainto_tsquery('english', :search)",
        { search: filters.search },
      );
    }
  }

  private applyOptimizedJoins(
    queryBuilder: SelectQueryBuilder<Milestone>,
    filters: MilestoneFiltersDto,
  ): void {
    // Only join tables when necessary to avoid unnecessary data loading

    const needsProject = filters.projectId || (filters as any).includeProject;
    const needsNotes = (filters as any).includeNotes;
    const needsReminders = (filters as any).includeReminders;

    if (needsProject) {
      queryBuilder.leftJoinAndSelect('milestone.project', 'project');
    }

    if (needsNotes) {
      queryBuilder
        .leftJoinAndSelect('milestone.notes', 'notes')
        .leftJoinAndSelect('notes.author', 'noteAuthor');
    }

    if (needsReminders) {
      queryBuilder.leftJoinAndSelect('milestone.reminders', 'reminders');
    }

    // Always include student for permission checks, but use efficient join
    queryBuilder
      .leftJoin('milestone.student', 'student')
      .addSelect(['student.id', 'student.email']);
  }

  private applyOptimizedOrdering(
    queryBuilder: SelectQueryBuilder<Milestone>,
    filters: MilestoneFiltersDto,
  ): void {
    // Use indexed columns for ordering when possible

    const sortBy = (filters as any).sortBy || 'dueDate';
    const sortOrder = (filters as any).sortOrder || 'ASC';

    switch (sortBy) {
      case 'dueDate':
        queryBuilder.orderBy('milestone.dueDate', sortOrder as 'ASC' | 'DESC');
        break;
      case 'priority':
        queryBuilder.orderBy('milestone.priority', sortOrder as 'ASC' | 'DESC');
        break;
      case 'status':
        queryBuilder.orderBy('milestone.status', sortOrder as 'ASC' | 'DESC');
        break;
      case 'createdAt':
        queryBuilder.orderBy(
          'milestone.createdAt',
          sortOrder as 'ASC' | 'DESC',
        );
        break;
      case 'updatedAt':
        queryBuilder.orderBy(
          'milestone.updatedAt',
          sortOrder as 'ASC' | 'DESC',
        );
        break;
      default:
        // Default to due date with priority as secondary sort
        queryBuilder
          .orderBy('milestone.dueDate', 'ASC')
          .addOrderBy('milestone.priority', 'DESC');
    }

    // Add secondary sort for consistent pagination
    if (sortBy !== 'id') {
      queryBuilder.addOrderBy('milestone.id', 'ASC');
    }
  }

  // Batch query optimization for bulk operations
  async executeBatchQuery<T extends Record<string, any>>(
    queryBuilder: SelectQueryBuilder<T>,
    batchSize: number = 1000,
  ): Promise<T[]> {
    const results: T[] = [];
    let offset = 0;
    let batch: T[];

    do {
      const batchQuery = queryBuilder.clone().skip(offset).take(batchSize);

      batch = await batchQuery.getMany();
      results.push(...batch);
      offset += batchSize;

      this.logger.debug(`Processed batch: ${offset} records`);
    } while (batch.length === batchSize);

    return results;
  }

  // Query result caching for expensive operations
  async executeWithCaching<T extends Record<string, any>>(
    queryBuilder: SelectQueryBuilder<T>,
    cacheKey: string,
    ttlSeconds: number = 300,
  ): Promise<T[]> {
    // This would integrate with the caching service
    // For now, just execute the query
    return queryBuilder.getMany();
  }
}

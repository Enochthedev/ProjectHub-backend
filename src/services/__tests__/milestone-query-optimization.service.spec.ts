import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { MilestoneQueryOptimizationService } from '../milestone-query-optimization.service';
import { Milestone } from '../../entities/milestone.entity';
import { MilestoneNote } from '../../entities/milestone-note.entity';
import { MilestoneReminder } from '../../entities/milestone-reminder.entity';
import { MilestoneFiltersDto } from '../../dto/milestone';
import { MilestoneStatus } from '../../common/enums/milestone-status.enum';
import { Priority } from '../../common/enums/priority.enum';

describe('MilestoneQueryOptimizationService', () => {
  let service: MilestoneQueryOptimizationService;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let milestoneNoteRepository: jest.Mocked<Repository<MilestoneNote>>;
  let milestoneReminderRepository: jest.Mocked<Repository<MilestoneReminder>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Milestone>>;

  beforeEach(async () => {
    // Create mock query builder
    mockQueryBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getQuery: jest.fn().mockReturnValue('SELECT * FROM milestones'),
      getParameters: jest.fn().mockReturnValue({}),
      connection: {
        query: jest.fn().mockResolvedValue([{ 'QUERY PLAN': [] }]),
      },
    } as any;

    const mockMilestoneRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const mockMilestoneNoteRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const mockMilestoneReminderRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneQueryOptimizationService,
        {
          provide: getRepositoryToken(Milestone),
          useValue: mockMilestoneRepository,
        },
        {
          provide: getRepositoryToken(MilestoneNote),
          useValue: mockMilestoneNoteRepository,
        },
        {
          provide: getRepositoryToken(MilestoneReminder),
          useValue: mockMilestoneReminderRepository,
        },
      ],
    }).compile();

    service = module.get<MilestoneQueryOptimizationService>(
      MilestoneQueryOptimizationService,
    );
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    milestoneNoteRepository = module.get(getRepositoryToken(MilestoneNote));
    milestoneReminderRepository = module.get(
      getRepositoryToken(MilestoneReminder),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildOptimizedMilestoneQuery', () => {
    it('should build basic query for student milestones', () => {
      const studentId = 'student-1';
      const result = service.buildOptimizedMilestoneQuery(studentId);

      expect(milestoneRepository.createQueryBuilder).toHaveBeenCalledWith(
        'milestone',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'milestone.studentId = :studentId',
        { studentId },
      );
    });

    it('should apply status filter', () => {
      const studentId = 'student-1';
      const filters: MilestoneFiltersDto = {
        status: MilestoneStatus.IN_PROGRESS,
      };

      service.buildOptimizedMilestoneQuery(studentId, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'milestone.status = :status',
        { status: MilestoneStatus.IN_PROGRESS },
      );
    });

    it('should apply priority filter', () => {
      const studentId = 'student-1';
      const filters: MilestoneFiltersDto = { priority: Priority.HIGH };

      service.buildOptimizedMilestoneQuery(studentId, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'milestone.priority = :priority',
        { priority: Priority.HIGH },
      );
    });

    it('should apply date range filters', () => {
      const studentId = 'student-1';
      const filters: MilestoneFiltersDto = {
        dueDateFrom: '2024-01-01',
        dueDateTo: '2024-12-31',
      };

      service.buildOptimizedMilestoneQuery(studentId, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'milestone.dueDate >= :dueDateFrom',
        { dueDateFrom: '2024-01-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'milestone.dueDate <= :dueDateTo',
        { dueDateTo: '2024-12-31' },
      );
    });

    it('should apply overdue filter', () => {
      const studentId = 'student-1';
      const filters: MilestoneFiltersDto = { isOverdue: true };

      service.buildOptimizedMilestoneQuery(studentId, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'milestone.dueDate < CURRENT_DATE AND milestone.status NOT IN (:...completedStatuses)',
        {
          completedStatuses: [
            MilestoneStatus.COMPLETED,
            MilestoneStatus.CANCELLED,
          ],
        },
      );
    });

    it('should apply text search filter', () => {
      const studentId = 'student-1';
      const filters: MilestoneFiltersDto = { search: 'test search' };

      service.buildOptimizedMilestoneQuery(studentId, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "to_tsvector('english', milestone.title || ' ' || milestone.description) @@ plainto_tsquery('english', :search)",
        { search: 'test search' },
      );
    });

    it('should apply default ordering', () => {
      const studentId = 'student-1';
      service.buildOptimizedMilestoneQuery(studentId);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'milestone.dueDate',
        'ASC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'milestone.priority',
        'DESC',
      );
    });
  });

  describe('buildSupervisorReportingQuery', () => {
    it('should build query for multiple students', () => {
      const studentIds = ['student-1', 'student-2'];
      service.buildSupervisorReportingQuery(studentIds);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'milestone.studentId IN (:...studentIds)',
        { studentIds },
      );
    });

    it('should include at-risk filter when specified', () => {
      const studentIds = ['student-1'];
      const filters = { includeAtRisk: true };

      service.buildSupervisorReportingQuery(studentIds, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(milestone.status = :blocked OR (milestone.dueDate < CURRENT_DATE AND milestone.status NOT IN (:...completedStatuses)))',
        {
          blocked: MilestoneStatus.BLOCKED,
          completedStatuses: [
            MilestoneStatus.COMPLETED,
            MilestoneStatus.CANCELLED,
          ],
        },
      );
    });

    it('should apply priority threshold filter', () => {
      const studentIds = ['student-1'];
      const filters = { priorityThreshold: true };

      service.buildSupervisorReportingQuery(studentIds, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'milestone.priority IN (:...priorities)',
        { priorities: [Priority.HIGH, Priority.CRITICAL] },
      );
    });
  });

  describe('buildAnalyticsQuery', () => {
    it('should build query for analytics with default period', () => {
      const studentId = 'student-1';
      service.buildAnalyticsQuery(studentId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'milestone.studentId = :studentId',
        { studentId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(milestone.completedAt >= :startDate OR milestone.createdAt >= :startDate OR milestone.status NOT IN (:...excludedStatuses))',
        expect.objectContaining({
          excludedStatuses: [MilestoneStatus.CANCELLED],
        }),
      );
    });

    it('should build query with custom period', () => {
      const studentId = 'student-1';
      const periodDays = 30;

      service.buildAnalyticsQuery(studentId, periodDays);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(milestone.completedAt >= :startDate OR milestone.createdAt >= :startDate OR milestone.status NOT IN (:...excludedStatuses))',
        expect.objectContaining({
          excludedStatuses: [MilestoneStatus.CANCELLED],
        }),
      );
    });

    it('should order by completion date for velocity calculations', () => {
      const studentId = 'student-1';
      service.buildAnalyticsQuery(studentId);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'milestone.completedAt',
        'ASC',
        'NULLS LAST',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'milestone.dueDate',
        'ASC',
      );
    });
  });

  describe('buildReminderProcessingQuery', () => {
    it('should build query for reminder processing with default days ahead', () => {
      service.buildReminderProcessingQuery();

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'milestone.reminders',
        'reminder',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'milestone.student',
        'student',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'milestone.status NOT IN (:...excludedStatuses)',
        {
          excludedStatuses: [
            MilestoneStatus.COMPLETED,
            MilestoneStatus.CANCELLED,
          ],
        },
      );
    });

    it('should build query with custom days ahead', () => {
      const daysAhead = 14;
      service.buildReminderProcessingQuery(daysAhead);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'milestone.dueDate <= :endDate',
        expect.objectContaining({ endDate: expect.any(String) }),
      );
    });

    it('should filter for unsent reminders', () => {
      service.buildReminderProcessingQuery();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(reminder.id IS NULL OR reminder.sent = false)',
      );
    });

    it('should order by urgency', () => {
      service.buildReminderProcessingQuery();

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'CASE WHEN milestone.dueDate < CURRENT_DATE THEN 0 ELSE 1 END',
        'ASC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'milestone.dueDate',
        'ASC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'milestone.priority',
        'DESC',
      );
    });
  });

  describe('getQueryExecutionPlan', () => {
    it('should return execution plan for query', async () => {
      const result = await service.getQueryExecutionPlan(mockQueryBuilder);

      expect(mockQueryBuilder.getQuery).toHaveBeenCalled();
      expect(mockQueryBuilder.getParameters).toHaveBeenCalled();
      expect(mockQueryBuilder.connection.query).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      mockQueryBuilder.connection.query.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.getQueryExecutionPlan(mockQueryBuilder);

      expect(result).toEqual([]);
    });
  });

  describe('analyzeQueryPerformance', () => {
    it('should track query performance statistics', () => {
      const queryName = 'test-query';
      const executionTime = 500;

      service.analyzeQueryPerformance(queryName, executionTime);

      const stats = service.getPerformanceStats();
      expect(stats.has(queryName)).toBe(true);

      const queryStats = stats.get(queryName);
      expect(queryStats.totalExecutions).toBe(1);
      expect(queryStats.totalTime).toBe(500);
      expect(queryStats.averageTime).toBe(500);
      expect(queryStats.maxTime).toBe(500);
      expect(queryStats.minTime).toBe(500);
    });

    it('should update statistics for multiple executions', () => {
      const queryName = 'test-query';

      service.analyzeQueryPerformance(queryName, 100);
      service.analyzeQueryPerformance(queryName, 200);
      service.analyzeQueryPerformance(queryName, 300);

      const stats = service.getPerformanceStats();
      const queryStats = stats.get(queryName);

      expect(queryStats.totalExecutions).toBe(3);
      expect(queryStats.totalTime).toBe(600);
      expect(queryStats.averageTime).toBe(200);
      expect(queryStats.maxTime).toBe(300);
      expect(queryStats.minTime).toBe(100);
    });

    it('should reset performance statistics', () => {
      service.analyzeQueryPerformance('test-query', 100);
      expect(service.getPerformanceStats().size).toBe(1);

      service.resetPerformanceStats();
      expect(service.getPerformanceStats().size).toBe(0);
    });
  });

  describe('executeBatchQuery', () => {
    it('should execute query in batches', async () => {
      const mockResults = [{ id: '1' }, { id: '2' }, { id: '3' }];

      mockQueryBuilder.getMany
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }])
        .mockResolvedValueOnce([{ id: '3' }])
        .mockResolvedValueOnce([]);

      const result = await service.executeBatchQuery(mockQueryBuilder, 2);

      expect(result).toHaveLength(3);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(2);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(2);
    });

    it('should handle empty results', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.executeBatchQuery(mockQueryBuilder, 100);

      expect(result).toEqual([]);
    });
  });

  describe('executeWithCaching', () => {
    it('should execute query (caching placeholder)', async () => {
      const mockResults = [{ id: '1' }];
      mockQueryBuilder.getMany.mockResolvedValue(mockResults);

      const result = await service.executeWithCaching(
        mockQueryBuilder,
        'test-key',
        300,
      );

      expect(result).toEqual(mockResults);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });
  });
});

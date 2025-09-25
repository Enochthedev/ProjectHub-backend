import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { QueryOptimizationService } from '../query-optimization.service';
import { Project } from '../../entities/project.entity';
import { SearchProjectsDto } from '../../dto/search/search-projects.dto';
import { DifficultyLevel } from '../../common/enums/difficulty-level.enum';
import { ProjectSortBy } from '../../common/enums/project-sort-by.enum';
import { ApprovalStatus } from '../../common/enums/approval-status.enum';

describe('QueryOptimizationService', () => {
  let service: QueryOptimizationService;
  let repository: Repository<Project>;
  let mockQueryBuilder: Partial<SelectQueryBuilder<Project>>;

  beforeEach(async () => {
    // Create a mock query builder
    mockQueryBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getSql: jest.fn().mockReturnValue('SELECT * FROM projects'),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
    };

    const mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      query: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryOptimizationService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<QueryOptimizationService>(QueryOptimizationService);
    repository = module.get<Repository<Project>>(getRepositoryToken(Project));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOptimizedSearchQuery', () => {
    it('should create basic query with approval status filter', () => {
      const searchDto: SearchProjectsDto = {};

      const result = service.createOptimizedSearchQuery(searchDto);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('project');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'project.supervisor',
        'supervisor',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'project.approvalStatus = :status',
        {
          status: ApprovalStatus.APPROVED,
        },
      );
      expect(result).toBe(mockQueryBuilder);
    });

    it('should apply year range filter', () => {
      const searchDto: SearchProjectsDto = {
        yearFrom: 2022,
        yearTo: 2024,
      };

      service.createOptimizedSearchQuery(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.year BETWEEN :yearFrom AND :yearTo',
        { yearFrom: 2022, yearTo: 2024 },
      );
    });

    it('should apply year from filter only', () => {
      const searchDto: SearchProjectsDto = {
        yearFrom: 2022,
      };

      service.createOptimizedSearchQuery(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.year >= :yearFrom',
        { yearFrom: 2022 },
      );
    });

    it('should apply year to filter only', () => {
      const searchDto: SearchProjectsDto = {
        yearTo: 2024,
      };

      service.createOptimizedSearchQuery(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.year <= :yearTo',
        { yearTo: 2024 },
      );
    });

    it('should apply specialization filter', () => {
      const searchDto: SearchProjectsDto = {
        specializations: ['AI', 'Web Development'],
      };

      service.createOptimizedSearchQuery(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.specialization IN (:...specializations)',
        { specializations: ['AI', 'Web Development'] },
      );
    });

    it('should apply difficulty level filter', () => {
      const searchDto: SearchProjectsDto = {
        difficultyLevels: [
          DifficultyLevel.INTERMEDIATE,
          DifficultyLevel.ADVANCED,
        ],
      };

      service.createOptimizedSearchQuery(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.difficultyLevel IN (:...difficultyLevels)',
        {
          difficultyLevels: [
            DifficultyLevel.INTERMEDIATE,
            DifficultyLevel.ADVANCED,
          ],
        },
      );
    });

    it('should apply group project filter', () => {
      const searchDto: SearchProjectsDto = {
        isGroupProject: true,
      };

      service.createOptimizedSearchQuery(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.isGroupProject = :isGroupProject',
        { isGroupProject: true },
      );
    });

    it('should apply tags filter', () => {
      const searchDto: SearchProjectsDto = {
        tags: ['python', 'machine-learning'],
      };

      service.createOptimizedSearchQuery(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.tags && :tags',
        { tags: ['python', 'machine-learning'] },
      );
    });

    it('should apply full-text search filter', () => {
      const searchDto: SearchProjectsDto = {
        query: 'machine learning project',
      };

      service.createOptimizedSearchQuery(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.searchVector @@ plainto_tsquery(:query)',
        { query: 'machine learning project' },
      );
    });

    it('should apply pagination', () => {
      const searchDto: SearchProjectsDto = {
        limit: 20,
        offset: 40,
      };

      service.createOptimizedSearchQuery(searchDto);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(40);
    });
  });

  describe('sorting optimization', () => {
    it('should apply relevance sorting with search query', () => {
      const searchDto: SearchProjectsDto = {
        query: 'test query',
        sortBy: ProjectSortBy.RELEVANCE,
      };

      service.createOptimizedSearchQuery(searchDto);

      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'ts_rank(project.searchVector, plainto_tsquery(:query))',
        'rank',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('rank', 'DESC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'project.year',
        'DESC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'project.createdAt',
        'DESC',
      );
    });

    it('should apply date sorting', () => {
      const searchDto: SearchProjectsDto = {
        sortBy: ProjectSortBy.DATE,
        sortOrder: 'asc' as any,
      };

      service.createOptimizedSearchQuery(searchDto);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'project.year',
        'ASC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'project.createdAt',
        'ASC',
      );
    });

    it('should apply title sorting', () => {
      const searchDto: SearchProjectsDto = {
        sortBy: ProjectSortBy.TITLE,
      };

      service.createOptimizedSearchQuery(searchDto);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'project.title',
        'DESC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'project.createdAt',
        'DESC',
      );
    });

    it('should apply popularity sorting', () => {
      const searchDto: SearchProjectsDto = {
        sortBy: ProjectSortBy.POPULARITY,
      };

      service.createOptimizedSearchQuery(searchDto);

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'project.views',
        'views',
      );
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'project.bookmarks',
        'bookmarks',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'COUNT(DISTINCT views.id) + COUNT(DISTINCT bookmarks.id) * 2',
        'popularity',
      );
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('project.id');
      expect(mockQueryBuilder.addGroupBy).toHaveBeenCalledWith('supervisor.id');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'popularity',
        'DESC',
      );
    });
  });

  describe('createPopularProjectsQuery', () => {
    it('should create optimized popular projects query', () => {
      const result = service.createPopularProjectsQuery(10);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('project');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'project.supervisor',
        'supervisor',
      );
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'project.views',
        'views',
        "views.viewedAt > NOW() - INTERVAL '30 days'",
      );
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'project.bookmarks',
        'bookmarks',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'project.approvalStatus = :status',
        {
          status: ApprovalStatus.APPROVED,
        },
      );
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(result).toBe(mockQueryBuilder);
    });
  });

  describe('createSupervisorProjectsQuery', () => {
    it('should create optimized supervisor projects query', () => {
      const supervisorId = 'supervisor-123';

      const result = service.createSupervisorProjectsQuery(supervisorId);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('project');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'project.supervisor',
        'supervisor',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'project.supervisorId = :supervisorId',
        {
          supervisorId,
        },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'project.approvalStatus',
        'ASC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'project.createdAt',
        'DESC',
      );
      expect(result).toBe(mockQueryBuilder);
    });
  });

  describe('createProjectAnalyticsQuery', () => {
    it('should create optimized project analytics query', () => {
      const projectId = 'project-123';

      const result = service.createProjectAnalyticsQuery(projectId);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('project');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'project.views',
        'views',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'project.bookmarks',
        'bookmarks',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'project.id = :projectId',
        { projectId },
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'COUNT(DISTINCT views.id)',
        'viewCount',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'COUNT(DISTINCT bookmarks.id)',
        'bookmarkCount',
      );
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('project.id');
      expect(result).toBe(mockQueryBuilder);
    });
  });

  describe('analyzeQueryPerformance', () => {
    it('should execute query and log performance', async () => {
      const mockProjects = [{ id: '1', title: 'Test Project' }];
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(mockProjects);

      const result = await service.analyzeQueryPerformance(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        'test operation',
      );

      expect(mockQueryBuilder.getSql).toHaveBeenCalled();
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(result).toEqual(mockProjects);
    });

    it('should handle query errors', async () => {
      const error = new Error('Database error');
      mockQueryBuilder.getMany = jest.fn().mockRejectedValue(error);

      await expect(
        service.analyzeQueryPerformance(
          mockQueryBuilder as SelectQueryBuilder<Project>,
          'test operation',
        ),
      ).rejects.toThrow('Database error');
    });
  });

  describe('getDatabaseStats', () => {
    it('should return database statistics', async () => {
      const mockStats = [
        { tablename: 'projects', attname: 'title', n_distinct: 100 },
      ];
      const mockIndexStats = [
        { indexname: 'idx_projects_title', idx_tup_read: 1000 },
      ];

      (repository.query as jest.Mock)
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockIndexStats);

      const result = await service.getDatabaseStats();

      expect(result).toEqual({
        columnStats: mockStats,
        indexStats: mockIndexStats,
        timestamp: expect.any(Date),
      });
    });

    it('should handle database stats errors', async () => {
      (repository.query as jest.Mock).mockRejectedValue(
        new Error('Stats error'),
      );

      const result = await service.getDatabaseStats();

      expect(result).toEqual({ error: 'Stats error' });
    });
  });

  describe('updateTableStatistics', () => {
    it('should update table statistics', async () => {
      (repository.query as jest.Mock).mockResolvedValue(undefined);

      await service.updateTableStatistics();

      expect(repository.query).toHaveBeenCalledWith('ANALYZE projects');
      expect(repository.query).toHaveBeenCalledWith('ANALYZE project_views');
      expect(repository.query).toHaveBeenCalledWith(
        'ANALYZE project_bookmarks',
      );
    });

    it('should handle update statistics errors', async () => {
      (repository.query as jest.Mock).mockRejectedValue(
        new Error('Update error'),
      );

      await expect(service.updateTableStatistics()).rejects.toThrow(
        'Update error',
      );
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should sanitize search query by removing special characters', () => {
      // Access private method for testing
      const sanitizeMethod = (service as any).sanitizeSearchQuery.bind(service);

      const result = sanitizeMethod(
        'test & query | with ! special () characters',
      );

      expect(result).toBe('test query with special characters');
    });

    it('should normalize whitespace', () => {
      const sanitizeMethod = (service as any).sanitizeSearchQuery.bind(service);

      const result = sanitizeMethod('test    multiple   spaces');

      expect(result).toBe('test multiple spaces');
    });
  });
});

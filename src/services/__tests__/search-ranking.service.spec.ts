import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SearchService } from '../search.service';
import { Project } from '../../entities/project.entity';
import { SearchProjectsDto } from '../../dto/search';
import {
  DifficultyLevel,
  ApprovalStatus,
  ProjectSortBy,
  SortOrder,
} from '../../common/enums';

describe('SearchService - Ranking and Highlighting', () => {
  let service: SearchService;
  let repository: jest.Mocked<Repository<Project>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Project>>;

  beforeEach(async () => {
    // Create mock query builder
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
      getRawMany: jest.fn(),
      getRawAndEntities: jest.fn(),
    } as any;

    // Create mock repository
    const mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    repository = module.get(getRepositoryToken(Project));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Search Result Ranking', () => {
    it('should use advanced ranking with ts_rank_cd and boost factors', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'machine learning',
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(1);
      queryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [
          {
            id: '1',
            title: 'Machine Learning Project',
            abstract: 'A project about ML',
            specialization: 'AI',
            difficultyLevel: DifficultyLevel.ADVANCED,
            year: 2024,
            tags: ['ml', 'ai'],
            technologyStack: ['Python'],
            isGroupProject: false,
            approvalStatus: ApprovalStatus.APPROVED,
            supervisor: {
              id: 'sup1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@test.com',
            },
            createdAt: new Date(),
            approvedAt: new Date(),
          },
        ],
        raw: [{ relevance_score: '0.8567' }],
      });

      const result = await service.searchProjects(searchDto);

      // Verify advanced ranking query is used
      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('ts_rank_cd'),
        'relevance_score',
      );
      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('CASE'),
        'relevance_score',
      );

      // Verify relevance score is included in results
      expect(result.projects[0].relevanceScore).toBe(0.8567);
    });

    it('should boost ranking for title matches', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'machine learning',
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(1);
      queryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [
          {
            id: '1',
            title: 'Machine Learning in Healthcare',
            abstract: 'A comprehensive study',
            specialization: 'AI',
            difficultyLevel: DifficultyLevel.ADVANCED,
            year: 2024,
            tags: ['healthcare', 'ai'],
            technologyStack: ['Python'],
            isGroupProject: false,
            approvalStatus: ApprovalStatus.APPROVED,
            supervisor: {
              id: 'sup1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@test.com',
            },
            createdAt: new Date(),
            approvedAt: new Date(),
          },
        ],
        raw: [{ relevance_score: '1.7134' }], // Higher score due to title match
      });

      await service.searchProjects(searchDto);

      // Verify the ranking query includes title boost (2.0 multiplier)
      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining(
          "WHEN project.title ILIKE '%' || :query || '%' THEN 2.0",
        ),
        'relevance_score',
      );
    });

    it('should boost ranking for abstract matches', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'machine learning',
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(1);
      queryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [
          {
            id: '1',
            title: 'Healthcare Analytics Project',
            abstract: 'Using machine learning for predictive analytics',
            specialization: 'AI',
            difficultyLevel: DifficultyLevel.ADVANCED,
            year: 2024,
            tags: ['healthcare', 'analytics'],
            technologyStack: ['Python'],
            isGroupProject: false,
            approvalStatus: ApprovalStatus.APPROVED,
            supervisor: {
              id: 'sup1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@test.com',
            },
            createdAt: new Date(),
            approvedAt: new Date(),
          },
        ],
        raw: [{ relevance_score: '1.2851' }], // Moderate score due to abstract match
      });

      await service.searchProjects(searchDto);

      // Verify the ranking query includes abstract boost (1.5 multiplier)
      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining(
          "WHEN project.abstract ILIKE '%' || :query || '%' THEN 1.5",
        ),
        'relevance_score',
      );
    });

    it('should sort results by relevance score in descending order', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'machine learning',
        sortBy: ProjectSortBy.RELEVANCE,
        sortOrder: SortOrder.DESC,
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(2);
      queryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [
          {
            id: '1',
            title: 'Machine Learning Project',
            abstract: 'High relevance project',
            supervisor: { id: 'sup1', firstName: 'John', lastName: 'Doe' },
          },
          {
            id: '2',
            title: 'Data Analysis Project',
            abstract: 'Lower relevance project with machine learning mention',
            supervisor: { id: 'sup2', firstName: 'Jane', lastName: 'Smith' },
          },
        ],
        raw: [{ relevance_score: '0.9567' }, { relevance_score: '0.3421' }],
      });

      const result = await service.searchProjects(searchDto);

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'relevance_score',
        'DESC',
      );
      expect(result.projects[0].relevanceScore).toBe(0.9567);
      expect(result.projects[1].relevanceScore).toBe(0.3421);
    });
  });

  describe('Search Term Highlighting', () => {
    it('should highlight search terms in title and abstract', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'machine learning',
        limit: 10,
        offset: 0,
      };

      const mockProject = {
        id: '1',
        title: 'Advanced Machine Learning Techniques',
        abstract:
          'This project explores machine learning algorithms and their applications in real-world scenarios.',
        specialization: 'AI',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2024,
        tags: ['ml', 'ai'],
        technologyStack: ['Python'],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisor: {
          id: 'sup1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
        },
        createdAt: new Date(),
        approvedAt: new Date(),
      };

      queryBuilder.getCount.mockResolvedValue(1);
      queryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [mockProject],
        raw: [{ relevance_score: '0.8567' }],
      });

      const result = await service.searchProjects(searchDto);

      expect(result.projects[0].highlightedTitle).toBe(
        'Advanced <mark>Machine</mark> <mark>Learning</mark> Techniques',
      );
      expect(result.projects[0].highlightedAbstract).toBe(
        'This project explores <mark>machine</mark> <mark>learning</mark> algorithms and their applications in real-world scenarios.',
      );
    });

    it('should handle case-insensitive highlighting', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'MACHINE learning',
        limit: 10,
        offset: 0,
      };

      const mockProject = {
        id: '1',
        title: 'machine Learning Project',
        abstract: 'Using Machine learning techniques',
        specialization: 'AI',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2024,
        tags: ['ml'],
        technologyStack: ['Python'],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisor: {
          id: 'sup1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
        },
        createdAt: new Date(),
        approvedAt: new Date(),
      };

      queryBuilder.getCount.mockResolvedValue(1);
      queryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [mockProject],
        raw: [{ relevance_score: '0.8567' }],
      });

      const result = await service.searchProjects(searchDto);

      expect(result.projects[0].highlightedTitle).toBe(
        '<mark>machine</mark> <mark>Learning</mark> Project',
      );
      expect(result.projects[0].highlightedAbstract).toBe(
        'Using <mark>Machine</mark> <mark>learning</mark> techniques',
      );
    });

    it('should use word boundaries for accurate highlighting', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'learn',
        limit: 10,
        offset: 0,
      };

      const mockProject = {
        id: '1',
        title: 'Learning Management System',
        abstract:
          'A system for learning and teaching, not for unlearning habits',
        specialization: 'Web Development',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2024,
        tags: ['education'],
        technologyStack: ['React'],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisor: {
          id: 'sup1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
        },
        createdAt: new Date(),
        approvedAt: new Date(),
      };

      queryBuilder.getCount.mockResolvedValue(1);
      queryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [mockProject],
        raw: [{ relevance_score: '0.5432' }],
      });

      const result = await service.searchProjects(searchDto);

      // Should not highlight partial matches like "unlearning"
      expect(result.projects[0].highlightedAbstract).toBe(
        'A system for learning and teaching, not for unlearning habits',
      );
    });

    it('should handle multiple search terms correctly', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'web development react',
        limit: 10,
        offset: 0,
      };

      const mockProject = {
        id: '1',
        title: 'Modern Web Development with React',
        abstract:
          'A comprehensive guide to web development using React framework for building interactive applications',
        specialization: 'Web Development',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2024,
        tags: ['web', 'react'],
        technologyStack: ['React', 'JavaScript'],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisor: {
          id: 'sup1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
        },
        createdAt: new Date(),
        approvedAt: new Date(),
      };

      queryBuilder.getCount.mockResolvedValue(1);
      queryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [mockProject],
        raw: [{ relevance_score: '0.7891' }],
      });

      const result = await service.searchProjects(searchDto);

      expect(result.projects[0].highlightedTitle).toBe(
        'Modern <mark>Web</mark> <mark>Development</mark> with <mark>React</mark>',
      );
      expect(result.projects[0].highlightedAbstract).toBe(
        'A comprehensive guide to <mark>web</mark> <mark>development</mark> using <mark>React</mark> framework for building interactive applications',
      );
    });

    it('should not highlight when no search query is provided', async () => {
      const searchDto: SearchProjectsDto = {
        limit: 10,
        offset: 0,
      };

      const mockProject = {
        id: '1',
        title: 'Machine Learning Project',
        abstract: 'A project about machine learning',
        specialization: 'AI',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2024,
        tags: ['ml'],
        technologyStack: ['Python'],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisor: {
          id: 'sup1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
        },
        createdAt: new Date(),
        approvedAt: new Date(),
      };

      queryBuilder.getCount.mockResolvedValue(1);
      queryBuilder.getMany.mockResolvedValue([mockProject]);

      const result = await service.searchProjects(searchDto);

      expect(result.projects[0].highlightedTitle).toBeUndefined();
      expect(result.projects[0].highlightedAbstract).toBeUndefined();
    });
  });

  describe('Pagination with Ranking', () => {
    it('should maintain consistent ranking across pages', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'machine learning',
        limit: 2,
        offset: 0,
        sortBy: ProjectSortBy.RELEVANCE,
        sortOrder: SortOrder.DESC,
      };

      queryBuilder.getCount.mockResolvedValue(5);
      queryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [
          { id: '1', title: 'Project 1', supervisor: { id: 'sup1' } },
          { id: '2', title: 'Project 2', supervisor: { id: 'sup2' } },
        ],
        raw: [{ relevance_score: '0.9567' }, { relevance_score: '0.8432' }],
      });

      const result = await service.searchProjects(searchDto);

      expect(result.total).toBe(5);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(false);
      expect(result.totalPages).toBe(3);
      expect(result.currentPage).toBe(1);

      // Verify secondary sort by ID for consistency
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('project.id', 'ASC');
    });

    it('should handle large result sets efficiently', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'project',
        limit: 50,
        offset: 100,
      };

      queryBuilder.getCount.mockResolvedValue(1000);
      queryBuilder.getRawAndEntities.mockResolvedValue({
        entities: Array(50)
          .fill(null)
          .map((_, i) => ({
            id: `${i + 101}`,
            title: `Project ${i + 101}`,
            supervisor: { id: `sup${i + 101}` },
          })),
        raw: Array(50)
          .fill(null)
          .map((_, i) => ({
            relevance_score: (0.9 - i * 0.01).toString(),
          })),
      });

      const result = await service.searchProjects(searchDto);

      expect(result.total).toBe(1000);
      expect(result.projects).toHaveLength(50);
      expect(result.currentPage).toBe(3); // (100 / 50) + 1
      expect(result.totalPages).toBe(20); // Math.ceil(1000 / 50)
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(true);

      // Verify pagination parameters
      expect(queryBuilder.limit).toHaveBeenCalledWith(50);
      expect(queryBuilder.offset).toHaveBeenCalledWith(100);
    });
  });
});

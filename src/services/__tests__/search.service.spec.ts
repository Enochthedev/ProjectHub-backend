import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { SearchService } from '../search.service';
import { Project } from '../../entities/project.entity';
import { SearchProjectsDto } from '../../dto/search';
import {
  DifficultyLevel,
  ApprovalStatus,
  ProjectSortBy,
  SortOrder,
} from '../../common/enums';

describe('SearchService', () => {
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

  describe('searchProjects', () => {
    it('should return paginated search results', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'machine learning',
        limit: 10,
        offset: 0,
        sortBy: ProjectSortBy.RELEVANCE,
        sortOrder: SortOrder.DESC,
      };

      const mockProjects = [
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
      ];

      queryBuilder.getCount.mockResolvedValue(1);
      queryBuilder.getMany.mockResolvedValue(mockProjects as any);

      const result = await service.searchProjects(searchDto);

      expect(result.projects).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "project.searchVector @@ plainto_tsquery('english', :query)",
        { query: 'machine learning' },
      );
    });

    it('should sanitize search query to prevent SQL injection', async () => {
      const maliciousQuery = "'; DROP TABLE projects; --";
      const searchDto: SearchProjectsDto = {
        query: maliciousQuery,
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      await service.searchProjects(searchDto);

      // Verify that the malicious characters were removed
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "project.searchVector @@ plainto_tsquery('english', :query)",
        { query: ' DROP TABLE projects --' }, // Sanitized query
      );
    });

    it('should apply specialization filters correctly', async () => {
      const searchDto: SearchProjectsDto = {
        specializations: ['AI & Machine Learning', 'Web Development'],
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      await service.searchProjects(searchDto);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'project.specialization IN (:...specializations)',
        { specializations: ['AI & Machine Learning', 'Web Development'] },
      );
    });

    it('should apply difficulty level filters correctly', async () => {
      const searchDto: SearchProjectsDto = {
        difficultyLevels: [
          DifficultyLevel.ADVANCED,
          DifficultyLevel.INTERMEDIATE,
        ],
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      await service.searchProjects(searchDto);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'project.difficultyLevel IN (:...difficultyLevels)',
        {
          difficultyLevels: [
            DifficultyLevel.ADVANCED,
            DifficultyLevel.INTERMEDIATE,
          ],
        },
      );
    });

    it('should apply year range filters correctly', async () => {
      const searchDto: SearchProjectsDto = {
        yearFrom: 2022,
        yearTo: 2024,
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      await service.searchProjects(searchDto);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'project.year >= :yearFrom',
        { yearFrom: 2022 },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'project.year <= :yearTo',
        { yearTo: 2024 },
      );
    });

    it('should apply tags filter correctly', async () => {
      const searchDto: SearchProjectsDto = {
        tags: ['machine-learning', 'python'],
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      await service.searchProjects(searchDto);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'project.tags && :tags',
        { tags: ['machine-learning', 'python'] },
      );
    });

    it('should apply group project filter correctly', async () => {
      const searchDto: SearchProjectsDto = {
        isGroupProject: true,
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      await service.searchProjects(searchDto);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'project.isGroupProject = :isGroupProject',
        { isGroupProject: true },
      );
    });

    it('should sort by relevance when search query is provided', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'machine learning',
        sortBy: ProjectSortBy.RELEVANCE,
        sortOrder: SortOrder.DESC,
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      await service.searchProjects(searchDto);

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'relevance_score',
        'DESC',
      );
    });

    it('should sort by date when no search query is provided', async () => {
      const searchDto: SearchProjectsDto = {
        sortBy: ProjectSortBy.RELEVANCE,
        sortOrder: SortOrder.DESC,
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      await service.searchProjects(searchDto);

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'project.approvedAt',
        'DESC',
      );
    });

    it('should handle empty search results gracefully', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'nonexistent project',
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      const result = await service.searchProjects(searchDto);

      expect(result.projects).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrevious).toBe(false);
    });

    it('should throw BadRequestException for invalid search parameters', async () => {
      const searchDto: SearchProjectsDto = {
        limit: -1, // Invalid limit
        offset: 0,
      };

      await expect(service.searchProjects(searchDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getProjectById', () => {
    it('should return project by valid ID', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const mockProject = {
        id: projectId,
        title: 'Test Project',
        approvalStatus: ApprovalStatus.APPROVED,
      };

      repository.findOne.mockResolvedValue(mockProject as any);

      const result = await service.getProjectById(projectId);

      expect(result).toEqual(mockProject);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: projectId, approvalStatus: ApprovalStatus.APPROVED },
        relations: ['supervisor'],
      });
    });

    it('should throw BadRequestException for invalid UUID format', async () => {
      const invalidId = 'invalid-uuid';

      await expect(service.getProjectById(invalidId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return null for non-existent project', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      repository.findOne.mockResolvedValue(null);

      const result = await service.getProjectById(projectId);

      expect(result).toBeNull();
    });
  });

  describe('getSuggestedTags', () => {
    it('should return suggested tags for valid partial input', async () => {
      const partial = 'mach';
      const mockTags = [{ tag: 'machine-learning' }, { tag: 'machine-vision' }];

      queryBuilder.getRawMany.mockResolvedValue(mockTags);

      const result = await service.getSuggestedTags(partial);

      expect(result).toEqual(['machine-learning', 'machine-vision']);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'EXISTS (SELECT 1 FROM unnest(project.tags) AS tag WHERE tag ILIKE :partial)',
        { partial: '%mach%' },
      );
    });

    it('should return empty array for short input', async () => {
      const result = await service.getSuggestedTags('a');
      expect(result).toEqual([]);
    });

    it('should sanitize input to prevent injection', async () => {
      const maliciousInput = "'; DROP TABLE projects; --";
      queryBuilder.getRawMany.mockResolvedValue([]);

      await service.getSuggestedTags(maliciousInput);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'EXISTS (SELECT 1 FROM unnest(project.tags) AS tag WHERE tag ILIKE :partial)',
        { partial: '% DROP TABLE projects --%' },
      );
    });
  });

  describe('getPopularProjects', () => {
    it('should return popular projects sorted by views and bookmarks', async () => {
      const mockResult = {
        entities: [
          {
            id: '1',
            title: 'Popular Project',
            supervisor: { id: 'sup1', firstName: 'John', lastName: 'Doe' },
          },
        ],
      };

      queryBuilder.getRawAndEntities.mockResolvedValue(mockResult as any);

      const result = await service.getPopularProjects(5);

      expect(result).toHaveLength(1);
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        '(COUNT(DISTINCT views.id) + COUNT(DISTINCT bookmarks.id) * 2)',
        'DESC',
      );
      expect(queryBuilder.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('Input Sanitization', () => {
    it('should remove dangerous characters from search queries', async () => {
      const dangerousQuery = '<script>alert("xss")</script>';
      const searchDto: SearchProjectsDto = {
        query: dangerousQuery,
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      await service.searchProjects(searchDto);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "project.searchVector @@ plainto_tsquery('english', :query)",
        { query: 'scriptalert("xss")/script' },
      );
    });

    it('should limit query length to prevent DoS attacks', async () => {
      const longQuery = 'a'.repeat(200);
      const searchDto: SearchProjectsDto = {
        query: longQuery,
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      await service.searchProjects(searchDto);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "project.searchVector @@ plainto_tsquery('english', :query)",
        { query: 'a'.repeat(100) }, // Truncated to 100 characters
      );
    });

    it('should normalize whitespace in search queries', async () => {
      const queryWithExtraSpaces = '  machine    learning  ';
      const searchDto: SearchProjectsDto = {
        query: queryWithExtraSpaces,
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      await service.searchProjects(searchDto);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "project.searchVector @@ plainto_tsquery('english', :query)",
        { query: 'machine learning' },
      );
    });
  });
});

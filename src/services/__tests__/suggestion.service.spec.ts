import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SuggestionService, SearchSuggestion } from '../suggestion.service';
import { Project } from '../../entities/project.entity';
import { SearchProjectsDto } from '../../dto/search/search-projects.dto';
import { FilterCriteria } from '../filter.service';
import { DifficultyLevel, ApprovalStatus } from '../../common/enums';

describe('SuggestionService', () => {
  let service: SuggestionService;
  let mockRepository: jest.Mocked<Repository<Project>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Project>>;

  beforeEach(async () => {
    mockQueryBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      getMany: jest.fn(),
      getCount: jest.fn(),
    } as any;

    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuggestionService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SuggestionService>(SuggestionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('clearAllFilters', () => {
    it('should return empty filter criteria', () => {
      const result = service.clearAllFilters();
      expect(result).toEqual({});
    });
  });

  describe('clearSpecificFilters', () => {
    it('should clear specified filter types', () => {
      const currentFilters: FilterCriteria = {
        specializations: ['Computer Science'],
        difficultyLevels: [DifficultyLevel.ADVANCED],
        yearFrom: 2022,
        tags: ['python'],
      };

      const result = service.clearSpecificFilters(currentFilters, [
        'specializations',
        'tags',
      ]);

      expect(result).toEqual({
        difficultyLevels: [DifficultyLevel.ADVANCED],
        yearFrom: 2022,
      });
    });

    it('should not modify original filters object', () => {
      const currentFilters: FilterCriteria = {
        specializations: ['Computer Science'],
        yearFrom: 2022,
      };

      service.clearSpecificFilters(currentFilters, ['specializations']);

      expect(currentFilters).toEqual({
        specializations: ['Computer Science'],
        yearFrom: 2022,
      });
    });
  });

  describe('getAlternativeSearchSuggestions', () => {
    it('should return suggestions for search with query', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'machine learning',
        specializations: ['Computer Science'],
      };

      // Mock query suggestions
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([{ title: 'Machine Learning Project' }]) // title suggestions
        .mockResolvedValueOnce([{ tag: 'ml', count: '5' }]); // tag suggestions

      // Mock filter suggestions (popular specializations)
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        { specialization: 'AI & ML', count: '10' },
      ]);

      // Mock related projects
      mockQueryBuilder.getMany.mockResolvedValueOnce([
        {
          id: '1',
          title: 'Related Project',
          supervisor: { id: '1', firstName: 'John', lastName: 'Doe' },
        } as any,
      ]);

      const result = await service.getAlternativeSearchSuggestions(searchDto);

      expect(result.suggestions).toBeDefined();
      expect(result.relatedProjects).toBeDefined();
      expect(result.popularFilters).toBeDefined();
      expect(result.popularFilters).toHaveLength(4); // Default popular combinations
    });

    it('should handle search without query', async () => {
      const searchDto: SearchProjectsDto = {
        specializations: ['Computer Science'],
      };

      // Mock popular specializations
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        { specialization: 'Web Development', count: '8' },
      ]);

      // Mock related projects
      mockQueryBuilder.getMany.mockResolvedValueOnce([]);

      const result = await service.getAlternativeSearchSuggestions(searchDto);

      expect(result.suggestions).toBeDefined();
      expect(result.relatedProjects).toEqual([]);
      expect(result.popularFilters).toHaveLength(4);
    });
  });

  describe('getSuggestedTags', () => {
    it('should return suggested tags for partial input', async () => {
      const mockResults = [
        { tag: 'machine-learning', count: '10' },
        { tag: 'machine-vision', count: '5' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockResults);

      const result = await service.getSuggestedTags('machine');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'tag',
        value: 'machine-learning',
        label: 'machine-learning',
        description: '10 projects',
        count: 10,
      });
    });

    it('should return empty array for short input', async () => {
      const result = await service.getSuggestedTags('a');
      expect(result).toEqual([]);
    });

    it('should filter out null tags', async () => {
      const mockResults = [
        { tag: 'python', count: '5' },
        { tag: null, count: '3' },
        { tag: 'javascript', count: '4' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockResults);

      const result = await service.getSuggestedTags('script');

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.value)).toEqual(['python', 'javascript']);
    });
  });

  describe('getSuggestedSpecializations', () => {
    it('should return popular specializations', async () => {
      const mockResults = [
        { specialization: 'Computer Science', count: '15' },
        { specialization: 'Software Engineering', count: '12' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockResults);

      const result = await service.getSuggestedSpecializations();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'specialization',
        value: 'Computer Science',
        label: 'Computer Science',
        description: '15 projects',
        count: 15,
      });
    });
  });

  describe('hasResults', () => {
    it('should return true when results exist', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'test',
        specializations: ['Computer Science'],
      };

      mockQueryBuilder.getCount.mockResolvedValue(5);

      const result = await service.hasResults(searchDto);

      expect(result).toBe(true);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "project.searchVector @@ plainto_tsquery('english', :query)",
        { query: 'test' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.specialization IN (:...specializations)',
        { specializations: ['Computer Science'] },
      );
    });

    it('should return false when no results exist', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'nonexistent',
      };

      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.hasResults(searchDto);

      expect(result).toBe(false);
    });

    it('should handle all filter types', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'test',
        specializations: ['CS'],
        difficultyLevels: [DifficultyLevel.ADVANCED],
        yearFrom: 2022,
        yearTo: 2024,
        tags: ['python'],
        isGroupProject: true,
      };

      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.hasResults(searchDto);

      expect(result).toBe(true);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(7); // 6 filters + approval status
    });
  });

  describe('input sanitization', () => {
    it('should sanitize malicious input in getSuggestedTags', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.getSuggestedTags('test<script>alert("xss")</script>');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'EXISTS (SELECT 1 FROM unnest(project.tags) AS tag WHERE tag ILIKE :partial)',
        { partial: '%testscriptalert(xss)/script%' },
      );
    });

    it('should handle empty and null inputs', async () => {
      const result1 = await service.getSuggestedTags('');
      const result2 = await service.getSuggestedTags(null as any);

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });
  });
});

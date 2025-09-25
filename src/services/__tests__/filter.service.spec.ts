import { Test, TestingModule } from '@nestjs/testing';
import { SelectQueryBuilder } from 'typeorm';
import { FilterService, FilterCriteria } from '../filter.service';
import { Project } from '../../entities/project.entity';
import { DifficultyLevel } from '../../common/enums/difficulty-level.enum';
import { SearchProjectsDto } from '../../dto/search/search-projects.dto';

describe('FilterService', () => {
  let service: FilterService;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Project>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FilterService],
    }).compile();

    service = module.get<FilterService>(FilterService);

    // Create mock query builder
    mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(10),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('applyFilters', () => {
    it('should apply specialization filter correctly', () => {
      const criteria: FilterCriteria = {
        specializations: ['Computer Science', 'Software Engineering'],
      };

      service.applyFilters(mockQueryBuilder, criteria);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.specialization IN (:...specializations)',
        { specializations: ['Computer Science', 'Software Engineering'] },
      );
    });

    it('should apply difficulty level filter correctly', () => {
      const criteria: FilterCriteria = {
        difficultyLevels: [
          DifficultyLevel.INTERMEDIATE,
          DifficultyLevel.ADVANCED,
        ],
      };

      service.applyFilters(mockQueryBuilder, criteria);

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

    it('should apply year range filters correctly', () => {
      const criteria: FilterCriteria = {
        yearFrom: 2022,
        yearTo: 2024,
      };

      service.applyFilters(mockQueryBuilder, criteria);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.year >= :yearFrom',
        { yearFrom: 2022 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.year <= :yearTo',
        { yearTo: 2024 },
      );
    });

    it('should apply tags filter with array contains operator', () => {
      const criteria: FilterCriteria = {
        tags: ['machine-learning', 'python'],
      };

      service.applyFilters(mockQueryBuilder, criteria);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.tags @> :tags',
        { tags: ['machine-learning', 'python'] },
      );
    });

    it('should apply technology stack filter with array overlap operator', () => {
      const criteria: FilterCriteria = {
        technologyStack: ['React', 'Node.js'],
      };

      service.applyFilters(mockQueryBuilder, criteria);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.technologyStack && :technologyStack',
        { technologyStack: ['React', 'Node.js'] },
      );
    });

    it('should apply group project filter correctly', () => {
      const criteria: FilterCriteria = {
        isGroupProject: true,
      };

      service.applyFilters(mockQueryBuilder, criteria);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.isGroupProject = :isGroupProject',
        { isGroupProject: true },
      );
    });

    it('should apply multiple filters with AND logic', () => {
      const criteria: FilterCriteria = {
        specializations: ['Computer Science'],
        difficultyLevels: [DifficultyLevel.ADVANCED],
        yearFrom: 2023,
        tags: ['ai'],
        isGroupProject: false,
      };

      service.applyFilters(mockQueryBuilder, criteria);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(5);
    });

    it('should handle empty arrays gracefully', () => {
      const criteria: FilterCriteria = {
        specializations: [],
        difficultyLevels: [],
        tags: [],
        technologyStack: [],
      };

      service.applyFilters(mockQueryBuilder, criteria);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should sanitize input strings', () => {
      const criteria: FilterCriteria = {
        specializations: ['Computer Science<script>alert("xss")</script>'],
        tags: ['tag"with\'quotes'],
      };

      service.applyFilters(mockQueryBuilder, criteria);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.specialization IN (:...specializations)',
        { specializations: ['Computer Sciencescriptalert(xss)/script'] },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.tags @> :tags',
        { tags: ['tagwithquotes'] },
      );
    });
  });

  describe('applySearchFilters', () => {
    it('should convert SearchProjectsDto to FilterCriteria and apply filters', () => {
      const searchDto: SearchProjectsDto = {
        specializations: ['Computer Science'],
        difficultyLevels: [DifficultyLevel.INTERMEDIATE],
        yearFrom: 2022,
        yearTo: 2024,
        tags: ['web-development'],
        isGroupProject: true,
      };

      service.applySearchFilters(mockQueryBuilder, searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(6);
    });
  });

  describe('hasActiveFilters', () => {
    it('should return true when filters are active', () => {
      const criteria: FilterCriteria = {
        specializations: ['Computer Science'],
      };

      expect(service.hasActiveFilters(criteria)).toBe(true);
    });

    it('should return false when no filters are active', () => {
      const criteria: FilterCriteria = {};

      expect(service.hasActiveFilters(criteria)).toBe(false);
    });

    it('should return true for boolean filter even when false', () => {
      const criteria: FilterCriteria = {
        isGroupProject: false,
      };

      expect(service.hasActiveFilters(criteria)).toBe(true);
    });
  });

  describe('clearFilters', () => {
    it('should return empty criteria object', () => {
      const result = service.clearFilters();

      expect(result).toEqual({});
    });
  });

  describe('combineFilters', () => {
    it('should combine multiple filter criteria', () => {
      const criteria1: FilterCriteria = {
        specializations: ['Computer Science'],
        yearFrom: 2022,
      };

      const criteria2: FilterCriteria = {
        specializations: ['Software Engineering'],
        difficultyLevels: [DifficultyLevel.ADVANCED],
        yearFrom: 2023, // Should use the more restrictive (higher) value
      };

      const result = service.combineFilters(criteria1, criteria2);

      expect(result).toEqual({
        specializations: ['Computer Science', 'Software Engineering'],
        difficultyLevels: [DifficultyLevel.ADVANCED],
        yearFrom: 2023, // More restrictive value
      });
    });

    it('should handle year range restrictions correctly', () => {
      const criteria1: FilterCriteria = {
        yearFrom: 2020,
        yearTo: 2024,
      };

      const criteria2: FilterCriteria = {
        yearFrom: 2022,
        yearTo: 2023,
      };

      const result = service.combineFilters(criteria1, criteria2);

      expect(result).toEqual({
        yearFrom: 2022, // Max of yearFrom values
        yearTo: 2023, // Min of yearTo values
      });
    });

    it('should combine arrays correctly', () => {
      const criteria1: FilterCriteria = {
        tags: ['web', 'frontend'],
        technologyStack: ['React'],
      };

      const criteria2: FilterCriteria = {
        tags: ['backend'],
        technologyStack: ['Node.js', 'Express'],
      };

      const result = service.combineFilters(criteria1, criteria2);

      expect(result).toEqual({
        tags: ['web', 'frontend', 'backend'],
        technologyStack: ['React', 'Node.js', 'Express'],
      });
    });
  });

  describe('getFilteredCount', () => {
    it('should clone query builder and apply filters to get count', async () => {
      const criteria: FilterCriteria = {
        specializations: ['Computer Science'],
      };

      const result = await service.getFilteredCount(mockQueryBuilder, criteria);

      expect(mockQueryBuilder.clone).toHaveBeenCalled();
      expect(result).toBe(10);
    });
  });
});

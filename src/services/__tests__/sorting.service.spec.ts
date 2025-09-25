import { Test, TestingModule } from '@nestjs/testing';
import { SelectQueryBuilder } from 'typeorm';
import { SortingService, SortCriteria } from '../sorting.service';
import { Project } from '../../entities/project.entity';
import {
  ProjectSortBy,
  SortOrder,
} from '../../common/enums/project-sort-by.enum';

describe('SortingService', () => {
  let service: SortingService;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Project>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SortingService],
    }).compile();

    service = module.get<SortingService>(SortingService);

    // Create mock query builder
    mockQueryBuilder = {
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('applySorting', () => {
    it('should sort by relevance when search query is present', () => {
      const criteria: SortCriteria = {
        sortBy: ProjectSortBy.RELEVANCE,
        sortOrder: SortOrder.DESC,
        hasSearchQuery: true,
      };

      service.applySorting(mockQueryBuilder, criteria);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'relevance_score',
        'DESC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'project.approvedAt',
        'DESC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'project.id',
        'ASC',
      );
    });

    it('should sort by date when relevance is requested but no search query', () => {
      const criteria: SortCriteria = {
        sortBy: ProjectSortBy.RELEVANCE,
        sortOrder: SortOrder.DESC,
        hasSearchQuery: false,
      };

      service.applySorting(mockQueryBuilder, criteria);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'project.approvedAt',
        'DESC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'project.id',
        'ASC',
      );
    });

    it('should sort by date correctly', () => {
      const criteria: SortCriteria = {
        sortBy: ProjectSortBy.DATE,
        sortOrder: SortOrder.ASC,
      };

      service.applySorting(mockQueryBuilder, criteria);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'project.approvedAt',
        'ASC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'project.createdAt',
        'ASC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'project.id',
        'ASC',
      );
    });

    it('should sort by title alphabetically', () => {
      const criteria: SortCriteria = {
        sortBy: ProjectSortBy.TITLE,
        sortOrder: SortOrder.ASC,
      };

      service.applySorting(mockQueryBuilder, criteria);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'LOWER(project.title)',
        'ASC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'project.approvedAt',
        'DESC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'project.id',
        'ASC',
      );
    });

    it('should sort by popularity with complex query', () => {
      const criteria: SortCriteria = {
        sortBy: ProjectSortBy.POPULARITY,
        sortOrder: SortOrder.DESC,
      };

      service.applySorting(mockQueryBuilder, criteria);

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'project.views',
        'popularity_views',
      );
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'project.bookmarks',
        'popularity_bookmarks',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'COUNT(DISTINCT popularity_views.id)',
        'view_count',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'COUNT(DISTINCT popularity_bookmarks.id)',
        'bookmark_count',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        '(COUNT(DISTINCT popularity_views.id) + COUNT(DISTINCT popularity_bookmarks.id) * 3)',
        'popularity_score',
      );
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('project.id');
      expect(mockQueryBuilder.addGroupBy).toHaveBeenCalledWith('supervisor.id');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'popularity_score',
        'DESC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'project.approvedAt',
        'DESC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'project.id',
        'ASC',
      );
    });

    it('should handle invalid sort criteria with default', () => {
      const criteria: SortCriteria = {
        sortBy: 'invalid' as ProjectSortBy,
        sortOrder: SortOrder.DESC,
      };

      service.applySorting(mockQueryBuilder, criteria);

      // Should default to date sorting
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'project.approvedAt',
        'DESC',
      );
    });
  });

  describe('applyCompositeSorting', () => {
    it('should apply primary and secondary sorting criteria', () => {
      const primaryCriteria: SortCriteria = {
        sortBy: ProjectSortBy.POPULARITY,
        sortOrder: SortOrder.DESC,
      };

      const secondaryCriteria: SortCriteria = {
        sortBy: ProjectSortBy.TITLE,
        sortOrder: SortOrder.ASC,
      };

      service.applyCompositeSorting(
        mockQueryBuilder,
        primaryCriteria,
        secondaryCriteria,
      );

      // Should apply popularity sorting first
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'popularity_score',
        'DESC',
      );
      // Should add title as secondary sort
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'LOWER(project.title)',
        'ASC',
      );
    });

    it('should not apply secondary sorting if same as primary', () => {
      const primaryCriteria: SortCriteria = {
        sortBy: ProjectSortBy.DATE,
        sortOrder: SortOrder.DESC,
      };

      const secondaryCriteria: SortCriteria = {
        sortBy: ProjectSortBy.DATE,
        sortOrder: SortOrder.ASC,
      };

      service.applyCompositeSorting(
        mockQueryBuilder,
        primaryCriteria,
        secondaryCriteria,
      );

      // Should only apply primary sorting
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'project.approvedAt',
        'DESC',
      );
      // Secondary sorting should not be applied since it's the same field
    });
  });

  describe('getSortingOptions', () => {
    it('should return all available sorting options', () => {
      const options = service.getSortingOptions();

      expect(options).toHaveLength(4);
      expect(options).toEqual([
        {
          value: ProjectSortBy.RELEVANCE,
          label: 'Relevance',
          description: 'Most relevant to search query (default for searches)',
        },
        {
          value: ProjectSortBy.DATE,
          label: 'Date',
          description: 'Most recently approved projects first',
        },
        {
          value: ProjectSortBy.TITLE,
          label: 'Title',
          description: 'Alphabetical order by project title',
        },
        {
          value: ProjectSortBy.POPULARITY,
          label: 'Popularity',
          description: 'Most viewed and bookmarked projects first',
        },
      ]);
    });
  });

  describe('getDefaultSortCriteria', () => {
    it('should return relevance for search queries', () => {
      const criteria = service.getDefaultSortCriteria(true);

      expect(criteria).toEqual({
        sortBy: ProjectSortBy.RELEVANCE,
        sortOrder: SortOrder.DESC,
        hasSearchQuery: true,
      });
    });

    it('should return date for non-search queries', () => {
      const criteria = service.getDefaultSortCriteria(false);

      expect(criteria).toEqual({
        sortBy: ProjectSortBy.DATE,
        sortOrder: SortOrder.DESC,
        hasSearchQuery: false,
      });
    });
  });

  describe('validateSortCriteria', () => {
    it('should validate and return valid criteria', () => {
      const input = {
        sortBy: ProjectSortBy.TITLE,
        sortOrder: SortOrder.ASC,
        hasSearchQuery: true,
      };

      const result = service.validateSortCriteria(input);

      expect(result).toEqual(input);
    });

    it('should use defaults for invalid criteria', () => {
      const input = {
        sortBy: 'invalid' as ProjectSortBy,
        sortOrder: 'invalid' as SortOrder,
      };

      const result = service.validateSortCriteria(input);

      expect(result).toEqual({
        sortBy: ProjectSortBy.DATE,
        sortOrder: SortOrder.DESC,
        hasSearchQuery: false,
      });
    });
  });

  describe('createSortCriteriaFromSearch', () => {
    it('should create criteria from search parameters', () => {
      const result = service.createSortCriteriaFromSearch(
        ProjectSortBy.TITLE,
        SortOrder.ASC,
        true,
      );

      expect(result).toEqual({
        sortBy: ProjectSortBy.TITLE,
        sortOrder: SortOrder.ASC,
        hasSearchQuery: true,
      });
    });

    it('should use defaults when parameters are not provided', () => {
      const result = service.createSortCriteriaFromSearch();

      expect(result).toEqual({
        sortBy: ProjectSortBy.DATE,
        sortOrder: SortOrder.DESC,
        hasSearchQuery: false,
      });
    });

    it('should default to relevance for search queries', () => {
      const result = service.createSortCriteriaFromSearch(
        undefined,
        undefined,
        true,
      );

      expect(result).toEqual({
        sortBy: ProjectSortBy.RELEVANCE,
        sortOrder: SortOrder.DESC,
        hasSearchQuery: true,
      });
    });
  });
});

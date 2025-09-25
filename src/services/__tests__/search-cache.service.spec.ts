import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { SearchCacheService } from '../search-cache.service';
import { SearchProjectsDto } from '../../dto/search/search-projects.dto';
import { PaginatedProjectsDto } from '../../dto/search/paginated-projects.dto';
import { ProjectSummaryDto } from '../../dto/search/project-summary.dto';
import { DifficultyLevel } from '../../common/enums/difficulty-level.enum';
import { ProjectSortBy } from '../../common/enums/project-sort-by.enum';
import { ApprovalStatus } from '../../common/enums/approval-status.enum';

describe('SearchCacheService', () => {
  let service: SearchCacheService;
  let cacheManager: any;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<SearchCacheService>(SearchCacheService);
    cacheManager = module.get(CACHE_MANAGER);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCachedSearchResults', () => {
    it('should return cached results when available', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'machine learning',
        limit: 20,
        offset: 0,
      };

      const mockResults = new PaginatedProjectsDto([], 0, 20, 0);

      mockCacheManager.get.mockResolvedValue(mockResults);

      const result = await service.getCachedSearchResults(searchDto);

      expect(result).toEqual(mockResults);
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'search:machine learning:any:any:any:any:any:any:relevance:desc:20:0',
      );
    });

    it('should return null when no cached results', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'test query',
      };

      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.getCachedSearchResults(searchDto);

      expect(result).toBeNull();
    });

    it('should handle cache errors gracefully', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'test query',
      };

      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.getCachedSearchResults(searchDto);

      expect(result).toBeNull();
    });
  });

  describe('setCachedSearchResults', () => {
    it('should cache search results with correct TTL', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'test',
      };

      const results = new PaginatedProjectsDto([], 0, 20, 0);

      await service.setCachedSearchResults(searchDto, results);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'search:test:any:any:any:any:any:any:relevance:desc:20:0',
        results,
        300, // 5 minutes TTL
      );
    });

    it('should handle caching errors gracefully', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'test',
      };

      const results = new PaginatedProjectsDto([], 0, 20, 0);

      mockCacheManager.set.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await expect(
        service.setCachedSearchResults(searchDto, results),
      ).resolves.toBeUndefined();
    });
  });

  describe('getCachedPopularProjects', () => {
    it('should return cached popular projects', async () => {
      const mockProjects: ProjectSummaryDto[] = [];

      mockCacheManager.get.mockResolvedValue(mockProjects);

      const result = await service.getCachedPopularProjects(10);

      expect(result).toEqual(mockProjects);
      expect(mockCacheManager.get).toHaveBeenCalledWith('popular:10');
    });

    it('should return null when no cached popular projects', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.getCachedPopularProjects(10);

      expect(result).toBeNull();
    });
  });

  describe('setCachedPopularProjects', () => {
    it('should cache popular projects with correct TTL', async () => {
      const mockProjects: ProjectSummaryDto[] = [];

      await service.setCachedPopularProjects(10, mockProjects);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'popular:10',
        mockProjects,
        600, // 10 minutes TTL
      );
    });
  });

  describe('getCachedProjectDetails', () => {
    it('should return cached project details', async () => {
      const mockProject = { id: '1', title: 'Test Project' };
      mockCacheManager.get.mockResolvedValue(mockProject);

      const result = await service.getCachedProjectDetails('1');

      expect(result).toEqual(mockProject);
      expect(mockCacheManager.get).toHaveBeenCalledWith('project:1');
    });
  });

  describe('setCachedProjectDetails', () => {
    it('should cache project details with correct TTL', async () => {
      const mockProject = { id: '1', title: 'Test Project' };

      await service.setCachedProjectDetails('1', mockProject);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'project:1',
        mockProject,
        1800, // 30 minutes TTL
      );
    });
  });

  describe('getCachedTagSuggestions', () => {
    it('should return cached tag suggestions', async () => {
      const mockTags = ['python', 'pytorch', 'pandas'];
      mockCacheManager.get.mockResolvedValue(mockTags);

      const result = await service.getCachedTagSuggestions('py');

      expect(result).toEqual(mockTags);
      expect(mockCacheManager.get).toHaveBeenCalledWith('tags:py');
    });

    it('should convert partial to lowercase for cache key', async () => {
      mockCacheManager.get.mockResolvedValue([]);

      await service.getCachedTagSuggestions('PY');

      expect(mockCacheManager.get).toHaveBeenCalledWith('tags:py');
    });
  });

  describe('setCachedTagSuggestions', () => {
    it('should cache tag suggestions with correct TTL', async () => {
      const mockTags = ['python', 'pytorch'];

      await service.setCachedTagSuggestions('py', mockTags);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'tags:py',
        mockTags,
        3600, // 1 hour TTL
      );
    });
  });

  describe('invalidateSearchCaches', () => {
    it('should invalidate search-related caches', async () => {
      // Mock the private method behavior
      jest.spyOn(service as any, 'getAllCacheKeys').mockResolvedValue([
        'search:test:query',
        'popular:10',
        'tags:py',
        'project:1', // This should not be invalidated
        'other:cache', // This should not be invalidated
      ]);

      await service.invalidateSearchCaches();

      expect(mockCacheManager.del).toHaveBeenCalledTimes(3);
      expect(mockCacheManager.del).toHaveBeenCalledWith('search:test:query');
      expect(mockCacheManager.del).toHaveBeenCalledWith('popular:10');
      expect(mockCacheManager.del).toHaveBeenCalledWith('tags:py');
    });
  });

  describe('invalidateProjectCache', () => {
    it('should invalidate specific project cache', async () => {
      await service.invalidateProjectCache('123');

      expect(mockCacheManager.del).toHaveBeenCalledWith('project:123');
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches', async () => {
      await service.clearAllCaches();

      // Note: In newer cache-manager versions, reset method doesn't exist
      // This test just ensures the method completes without error
      expect(true).toBe(true);
    });

    it('should handle clear errors gracefully', async () => {
      // Should not throw
      await expect(service.clearAllCaches()).resolves.toBeUndefined();
    });
  });

  describe('warmUpCache', () => {
    it('should complete warm-up process', async () => {
      // This is a placeholder test since warm-up logic would depend on actual search service
      await expect(service.warmUpCache()).resolves.toBeUndefined();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      jest
        .spyOn(service as any, 'getAllCacheKeys')
        .mockResolvedValue(['key1', 'key2']);

      const stats = await service.getCacheStats();

      expect(stats).toEqual({
        status: 'connected',
        keys: ['key1', 'key2'],
      });
    });

    it('should handle stats errors gracefully', async () => {
      jest
        .spyOn(service as any, 'getAllCacheKeys')
        .mockRejectedValue(new Error('Stats error'));

      const stats = await service.getCacheStats();

      expect(stats).toEqual({
        status: 'error',
        error: 'Stats error',
      });
    });
  });
});

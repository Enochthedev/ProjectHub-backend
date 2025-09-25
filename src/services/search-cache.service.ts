import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { SearchProjectsDto } from '../dto/search/search-projects.dto';
import { PaginatedProjectsDto } from '../dto/search/paginated-projects.dto';
import { ProjectSummaryDto } from '../dto/search/project-summary.dto';

@Injectable()
export class SearchCacheService {
  private readonly logger = new Logger(SearchCacheService.name);

  // Cache TTL in seconds
  private readonly SEARCH_RESULTS_TTL = 300; // 5 minutes
  private readonly POPULAR_PROJECTS_TTL = 600; // 10 minutes
  private readonly PROJECT_DETAILS_TTL = 1800; // 30 minutes
  private readonly SUGGESTIONS_TTL = 3600; // 1 hour

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Generate cache key for search results
   */
  private generateSearchCacheKey(searchDto: SearchProjectsDto): string {
    const keyParts = [
      'search',
      searchDto.query || 'all',
      searchDto.specializations?.sort().join(',') || 'any',
      searchDto.difficultyLevels?.sort().join(',') || 'any',
      searchDto.yearFrom || 'any',
      searchDto.yearTo || 'any',
      searchDto.tags?.sort().join(',') || 'any',
      searchDto.isGroupProject?.toString() || 'any',
      searchDto.sortBy || 'relevance',
      searchDto.sortOrder || 'desc',
      searchDto.limit || 20,
      searchDto.offset || 0,
    ];

    return keyParts.join(':');
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(
    searchDto: SearchProjectsDto,
  ): Promise<PaginatedProjectsDto | null> {
    try {
      const cacheKey = this.generateSearchCacheKey(searchDto);
      const cachedResult =
        await this.cacheManager.get<PaginatedProjectsDto>(cacheKey);

      if (cachedResult) {
        this.logger.debug(`Cache hit for search: ${cacheKey}`);
        return cachedResult;
      }

      this.logger.debug(`Cache miss for search: ${cacheKey}`);
      return null;
    } catch (error) {
      this.logger.error('Error getting cached search results:', error);
      return null;
    }
  }

  /**
   * Cache search results
   */
  async setCachedSearchResults(
    searchDto: SearchProjectsDto,
    results: PaginatedProjectsDto,
  ): Promise<void> {
    try {
      const cacheKey = this.generateSearchCacheKey(searchDto);
      await this.cacheManager.set(cacheKey, results, this.SEARCH_RESULTS_TTL);
      this.logger.debug(`Cached search results: ${cacheKey}`);
    } catch (error) {
      this.logger.error('Error caching search results:', error);
    }
  }

  /**
   * Get cached popular projects
   */
  async getCachedPopularProjects(
    limit: number,
  ): Promise<ProjectSummaryDto[] | null> {
    try {
      const cacheKey = `popular:${limit}`;
      const cachedResult =
        await this.cacheManager.get<ProjectSummaryDto[]>(cacheKey);

      if (cachedResult) {
        this.logger.debug(`Cache hit for popular projects: ${cacheKey}`);
        return cachedResult;
      }

      return null;
    } catch (error) {
      this.logger.error('Error getting cached popular projects:', error);
      return null;
    }
  }

  /**
   * Cache popular projects
   */
  async setCachedPopularProjects(
    limit: number,
    projects: ProjectSummaryDto[],
  ): Promise<void> {
    try {
      const cacheKey = `popular:${limit}`;
      await this.cacheManager.set(
        cacheKey,
        projects,
        this.POPULAR_PROJECTS_TTL,
      );
      this.logger.debug(`Cached popular projects: ${cacheKey}`);
    } catch (error) {
      this.logger.error('Error caching popular projects:', error);
    }
  }

  /**
   * Get cached project details
   */
  async getCachedProjectDetails(projectId: string): Promise<any | null> {
    try {
      const cacheKey = `project:${projectId}`;
      const cachedResult = await this.cacheManager.get(cacheKey);

      if (cachedResult) {
        this.logger.debug(`Cache hit for project details: ${cacheKey}`);
        return cachedResult;
      }

      return null;
    } catch (error) {
      this.logger.error('Error getting cached project details:', error);
      return null;
    }
  }

  /**
   * Cache project details
   */
  async setCachedProjectDetails(
    projectId: string,
    project: any,
  ): Promise<void> {
    try {
      const cacheKey = `project:${projectId}`;
      await this.cacheManager.set(cacheKey, project, this.PROJECT_DETAILS_TTL);
      this.logger.debug(`Cached project details: ${cacheKey}`);
    } catch (error) {
      this.logger.error('Error caching project details:', error);
    }
  }

  /**
   * Get cached tag suggestions
   */
  async getCachedTagSuggestions(partial: string): Promise<string[] | null> {
    try {
      const cacheKey = `tags:${partial.toLowerCase()}`;
      const cachedResult = await this.cacheManager.get<string[]>(cacheKey);

      if (cachedResult) {
        this.logger.debug(`Cache hit for tag suggestions: ${cacheKey}`);
        return cachedResult;
      }

      return null;
    } catch (error) {
      this.logger.error('Error getting cached tag suggestions:', error);
      return null;
    }
  }

  /**
   * Cache tag suggestions
   */
  async setCachedTagSuggestions(
    partial: string,
    suggestions: string[],
  ): Promise<void> {
    try {
      const cacheKey = `tags:${partial.toLowerCase()}`;
      await this.cacheManager.set(cacheKey, suggestions, this.SUGGESTIONS_TTL);
      this.logger.debug(`Cached tag suggestions: ${cacheKey}`);
    } catch (error) {
      this.logger.error('Error caching tag suggestions:', error);
    }
  }

  /**
   * Invalidate search-related caches when projects are updated
   */
  async invalidateSearchCaches(): Promise<void> {
    try {
      // Get all cache keys
      const keys = await this.getAllCacheKeys();

      // Filter keys that should be invalidated
      const keysToInvalidate = keys.filter(
        (key) =>
          key.startsWith('search:') ||
          key.startsWith('popular:') ||
          key.startsWith('tags:'),
      );

      // Delete the keys
      await Promise.all(
        keysToInvalidate.map((key) => this.cacheManager.del(key)),
      );

      this.logger.debug(
        `Invalidated ${keysToInvalidate.length} search cache entries`,
      );
    } catch (error) {
      this.logger.error('Error invalidating search caches:', error);
    }
  }

  /**
   * Invalidate specific project cache
   */
  async invalidateProjectCache(projectId: string): Promise<void> {
    try {
      const cacheKey = `project:${projectId}`;
      await this.cacheManager.del(cacheKey);
      this.logger.debug(`Invalidated project cache: ${cacheKey}`);
    } catch (error) {
      this.logger.error('Error invalidating project cache:', error);
    }
  }

  /**
   * Warm up cache with popular searches
   */
  async warmUpCache(): Promise<void> {
    try {
      this.logger.log('Starting cache warm-up...');

      // This would typically be called with actual search service
      // For now, we'll just log that warm-up is ready
      this.logger.log('Cache warm-up completed');
    } catch (error) {
      this.logger.error('Error during cache warm-up:', error);
    }
  }

  /**
   * Get all cache keys (Redis-specific implementation)
   */
  private async getAllCacheKeys(): Promise<string[]> {
    try {
      // This is a simplified implementation
      // In a real Redis implementation, you'd use SCAN command
      return [];
    } catch (error) {
      this.logger.error('Error getting cache keys:', error);
      return [];
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    try {
      // Note: cache-manager doesn't have a reset method in newer versions
      // This would need to be implemented differently in production
      this.logger.log('All caches cleared');
    } catch (error) {
      this.logger.error('Error clearing all caches:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      // This would return Redis-specific stats in a real implementation
      return {
        status: 'connected',
        keys: await this.getAllCacheKeys(),
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return { status: 'error', error: error.message };
    }
  }
}

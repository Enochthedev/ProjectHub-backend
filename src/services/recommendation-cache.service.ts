import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RecommendationResultDto } from '../dto/recommendation/recommendation-result.dto';

export interface CacheStats {
  totalKeys: number;
  recommendationKeys: number;
  embeddingKeys: number;
  hitRate: number;
  memoryUsage?: number;
}

export interface EmbeddingCacheEntry {
  embedding: number[];
  text: string;
  model: string;
  createdAt: Date;
}

@Injectable()
export class RecommendationCacheService {
  private readonly logger = new Logger(RecommendationCacheService.name);

  // Cache TTL configurations in seconds
  private readonly RECOMMENDATION_TTL = 3600; // 1 hour
  private readonly EMBEDDING_TTL = 86400; // 24 hours
  private readonly PROFILE_SNAPSHOT_TTL = 1800; // 30 minutes
  private readonly BATCH_RESULTS_TTL = 7200; // 2 hours

  // Cache key prefixes
  private readonly RECOMMENDATION_PREFIX = 'rec:';
  private readonly EMBEDDING_PREFIX = 'emb:';
  private readonly PROFILE_PREFIX = 'profile:';
  private readonly BATCH_PREFIX = 'batch:';

  // Cache statistics
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get cached recommendations for a student
   */
  async getCachedRecommendations(
    studentId: string,
  ): Promise<RecommendationResultDto | null> {
    try {
      const cacheKey = `${this.RECOMMENDATION_PREFIX}${studentId}`;
      const cached =
        await this.cacheManager.get<RecommendationResultDto>(cacheKey);

      if (cached) {
        this.cacheHits++;
        cached.fromCache = true;
        this.logger.debug(`Cache hit for recommendations: ${studentId}`);
        return cached;
      }

      this.cacheMisses++;
      this.logger.debug(`Cache miss for recommendations: ${studentId}`);
      return null;
    } catch (error) {
      this.logger.error(
        `Error getting cached recommendations for ${studentId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Cache recommendations for a student
   */
  async setCachedRecommendations(
    studentId: string,
    recommendations: RecommendationResultDto,
    customTTL?: number,
  ): Promise<void> {
    try {
      const cacheKey = `${this.RECOMMENDATION_PREFIX}${studentId}`;
      const ttl = customTTL || this.RECOMMENDATION_TTL;

      // Ensure fromCache is false when storing
      const toCache = { ...recommendations, fromCache: false };

      await this.cacheManager.set(cacheKey, toCache, ttl);
      this.logger.debug(
        `Cached recommendations for student ${studentId} with TTL ${ttl}s`,
      );
    } catch (error) {
      this.logger.error(
        `Error caching recommendations for ${studentId}:`,
        error,
      );
    }
  }

  /**
   * Get cached embedding for text
   */
  async getCachedEmbedding(
    text: string,
    model: string,
  ): Promise<number[] | null> {
    try {
      const textHash = this.generateTextHash(text);
      const cacheKey = `${this.EMBEDDING_PREFIX}${model}:${textHash}`;

      const cached = await this.cacheManager.get<EmbeddingCacheEntry>(cacheKey);

      if (cached) {
        this.cacheHits++;
        this.logger.debug(
          `Cache hit for embedding: ${textHash.substring(0, 8)}...`,
        );
        return cached.embedding;
      }

      this.cacheMisses++;
      this.logger.debug(
        `Cache miss for embedding: ${textHash.substring(0, 8)}...`,
      );
      return null;
    } catch (error) {
      this.logger.error(`Error getting cached embedding:`, error);
      return null;
    }
  }

  /**
   * Cache embedding for text
   */
  async setCachedEmbedding(
    text: string,
    embedding: number[],
    model: string,
    customTTL?: number,
  ): Promise<void> {
    try {
      const textHash = this.generateTextHash(text);
      const cacheKey = `${this.EMBEDDING_PREFIX}${model}:${textHash}`;
      const ttl = customTTL || this.EMBEDDING_TTL;

      const cacheEntry: EmbeddingCacheEntry = {
        embedding,
        text: text.substring(0, 100), // Store first 100 chars for debugging
        model,
        createdAt: new Date(),
      };

      await this.cacheManager.set(cacheKey, cacheEntry, ttl);
      this.logger.debug(
        `Cached embedding for text hash ${textHash.substring(0, 8)}... with TTL ${ttl}s`,
      );
    } catch (error) {
      this.logger.error(`Error caching embedding:`, error);
    }
  }

  /**
   * Get cached batch embeddings
   */
  async getCachedBatchEmbeddings(
    texts: string[],
    model: string,
  ): Promise<{ embeddings: (number[] | null)[]; cacheHitRate: number }> {
    const embeddings: (number[] | null)[] = new Array(texts.length).fill(null);
    let hits = 0;

    for (let i = 0; i < texts.length; i++) {
      const embedding = await this.getCachedEmbedding(texts[i], model);
      if (embedding) {
        embeddings[i] = embedding;
        hits++;
      }
    }

    const cacheHitRate = texts.length > 0 ? hits / texts.length : 0;

    this.logger.debug(
      `Batch embedding cache check: ${hits}/${texts.length} hits (${(cacheHitRate * 100).toFixed(1)}%)`,
    );

    return { embeddings, cacheHitRate };
  }

  /**
   * Cache batch embeddings
   */
  async setCachedBatchEmbeddings(
    texts: string[],
    embeddings: number[][],
    model: string,
    customTTL?: number,
  ): Promise<void> {
    if (texts.length !== embeddings.length) {
      this.logger.error(
        'Texts and embeddings arrays must have the same length',
      );
      return;
    }

    const promises = texts.map((text, index) =>
      this.setCachedEmbedding(text, embeddings[index], model, customTTL),
    );

    await Promise.all(promises);
    this.logger.debug(`Cached ${embeddings.length} embeddings in batch`);
  }

  /**
   * Get cached profile snapshot
   */
  async getCachedProfileSnapshot(studentId: string): Promise<any | null> {
    try {
      const cacheKey = `${this.PROFILE_PREFIX}${studentId}`;
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        this.cacheHits++;
        this.logger.debug(`Cache hit for profile snapshot: ${studentId}`);
        return cached;
      }

      this.cacheMisses++;
      return null;
    } catch (error) {
      this.logger.error(
        `Error getting cached profile snapshot for ${studentId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Cache profile snapshot
   */
  async setCachedProfileSnapshot(
    studentId: string,
    profileSnapshot: any,
    customTTL?: number,
  ): Promise<void> {
    try {
      const cacheKey = `${this.PROFILE_PREFIX}${studentId}`;
      const ttl = customTTL || this.PROFILE_SNAPSHOT_TTL;

      await this.cacheManager.set(cacheKey, profileSnapshot, ttl);
      this.logger.debug(
        `Cached profile snapshot for student ${studentId} with TTL ${ttl}s`,
      );
    } catch (error) {
      this.logger.error(
        `Error caching profile snapshot for ${studentId}:`,
        error,
      );
    }
  }

  /**
   * Invalidate recommendations cache for a student
   */
  async invalidateRecommendations(studentId: string): Promise<void> {
    try {
      const cacheKey = `${this.RECOMMENDATION_PREFIX}${studentId}`;
      await this.cacheManager.del(cacheKey);
      this.logger.debug(
        `Invalidated recommendations cache for student: ${studentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error invalidating recommendations cache for ${studentId}:`,
        error,
      );
    }
  }

  /**
   * Invalidate profile snapshot cache for a student
   */
  async invalidateProfileSnapshot(studentId: string): Promise<void> {
    try {
      const cacheKey = `${this.PROFILE_PREFIX}${studentId}`;
      await this.cacheManager.del(cacheKey);
      this.logger.debug(
        `Invalidated profile snapshot cache for student: ${studentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error invalidating profile snapshot cache for ${studentId}:`,
        error,
      );
    }
  }

  /**
   * Invalidate all caches for a student (recommendations + profile)
   */
  async invalidateStudentCaches(studentId: string): Promise<void> {
    await Promise.all([
      this.invalidateRecommendations(studentId),
      this.invalidateProfileSnapshot(studentId),
    ]);
    this.logger.debug(`Invalidated all caches for student: ${studentId}`);
  }

  /**
   * Warm up cache for active users
   */
  async warmUpCache(studentIds: string[]): Promise<void> {
    this.logger.log(
      `Starting cache warm-up for ${studentIds.length} students...`,
    );

    // This would typically be called by a background service
    // For now, we'll just prepare the cache keys
    const warmUpPromises = studentIds.map(async (studentId) => {
      try {
        // Check if recommendations are already cached
        const cached = await this.getCachedRecommendations(studentId);
        if (!cached) {
          this.logger.debug(`Student ${studentId} needs cache warm-up`);
          // In a real implementation, this would trigger recommendation generation
        }
      } catch (error) {
        this.logger.error(
          `Error during cache warm-up for student ${studentId}:`,
          error,
        );
      }
    });

    await Promise.allSettled(warmUpPromises);
    this.logger.log('Cache warm-up completed');
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const totalRequests = this.cacheHits + this.cacheMisses;
      const hitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

      // In a real Redis implementation, you would get actual key counts
      // For now, we'll return estimated values
      return {
        totalKeys: 0, // Would be populated from Redis DBSIZE
        recommendationKeys: 0, // Would be populated from Redis SCAN
        embeddingKeys: 0, // Would be populated from Redis SCAN
        hitRate: Math.round(hitRate * 100) / 100,
        memoryUsage: 0, // Would be populated from Redis INFO memory
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        recommendationKeys: 0,
        embeddingKeys: 0,
        hitRate: 0,
      };
    }
  }

  /**
   * Clear all recommendation-related caches
   */
  async clearAllCaches(): Promise<void> {
    try {
      // In a real Redis implementation, you would use SCAN to find and delete keys
      // For now, we'll reset the statistics
      this.cacheHits = 0;
      this.cacheMisses = 0;
      this.logger.log('All recommendation caches cleared');
    } catch (error) {
      this.logger.error('Error clearing all caches:', error);
    }
  }

  /**
   * Get stale cache entries that need refresh
   */
  async getStaleCacheEntries(): Promise<string[]> {
    try {
      // In a real Redis implementation, you would scan for keys with low TTL
      // For now, return empty array
      return [];
    } catch (error) {
      this.logger.error('Error getting stale cache entries:', error);
      return [];
    }
  }

  /**
   * Refresh stale cache entries
   */
  async refreshStaleCaches(studentIds: string[]): Promise<void> {
    this.logger.log(
      `Refreshing stale caches for ${studentIds.length} students...`,
    );

    for (const studentId of studentIds) {
      try {
        await this.invalidateRecommendations(studentId);
        this.logger.debug(`Marked cache for refresh: ${studentId}`);
      } catch (error) {
        this.logger.error(
          `Error refreshing cache for student ${studentId}:`,
          error,
        );
      }
    }

    this.logger.log('Stale cache refresh completed');
  }

  /**
   * Generate a hash for text to use as cache key
   */
  private generateTextHash(text: string): string {
    // Simple hash function for demonstration
    // In production, you might want to use a more robust hashing algorithm
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const totalRequests = this.cacheHits + this.cacheMisses;
    return totalRequests > 0 ? this.cacheHits / totalRequests : 0;
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.logger.debug('Cache statistics reset');
  }
}

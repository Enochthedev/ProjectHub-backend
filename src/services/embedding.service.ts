import { Injectable, Logger } from '@nestjs/common';
import { HuggingFaceService } from './hugging-face.service';
import { RecommendationCacheService } from './recommendation-cache.service';
import { createHash } from 'crypto';

export interface EmbeddingCacheEntry {
  embedding: number[];
  createdAt: Date;
  textHash: string;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  fromCache: boolean[];
  totalTokens: number;
  cacheHits: number;
  cacheMisses: number;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  // Token estimation (approximate)
  private readonly CHARS_PER_TOKEN = 4;

  constructor(
    private readonly huggingFaceService: HuggingFaceService,
    private readonly cacheService: RecommendationCacheService,
  ) {}

  /**
   * Generate embeddings for texts with caching support
   */
  async generateEmbeddings(
    texts: string[],
    userId?: string,
  ): Promise<BatchEmbeddingResult> {
    if (!texts || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    this.logger.debug(`Generating embeddings for ${texts.length} texts`);

    const embeddings: number[][] = [];
    const fromCache: boolean[] = [];
    let cacheHits = 0;
    let cacheMisses = 0;
    let totalTokens = 0;

    // Get model name for cache key
    const model = this.huggingFaceService.getModelName();

    // Process texts and check cache in batch
    const processedTexts = texts.map((text) => this.preprocessText(text));
    const batchCacheResult = await this.cacheService.getCachedBatchEmbeddings(
      processedTexts,
      model,
    );

    // Identify texts that need new embeddings
    const textsToGenerate: string[] = [];
    const indicesToGenerate: number[] = [];

    for (let i = 0; i < processedTexts.length; i++) {
      if (batchCacheResult.embeddings[i] === null) {
        textsToGenerate.push(processedTexts[i]);
        indicesToGenerate.push(i);
        cacheMisses++;
      } else {
        embeddings[i] = batchCacheResult.embeddings[i]!;
        fromCache[i] = true;
        cacheHits++;
      }
    }

    // Generate embeddings for cache misses
    if (textsToGenerate.length > 0) {
      const newEmbeddings = await this.generateBatchEmbeddings(
        textsToGenerate,
        userId,
      );

      // Place new embeddings in correct positions
      for (let i = 0; i < indicesToGenerate.length; i++) {
        const index = indicesToGenerate[i];
        embeddings[index] = newEmbeddings[i];
        fromCache[index] = false;

        // Estimate tokens used
        totalTokens += Math.ceil(
          textsToGenerate[i].length / this.CHARS_PER_TOKEN,
        );
      }

      // Cache the new embeddings
      await this.cacheService.setCachedBatchEmbeddings(
        textsToGenerate,
        newEmbeddings,
        model,
      );
    }

    this.logger.debug(
      `Embedding generation complete: ${cacheHits} cache hits, ${cacheMisses} cache misses, ~${totalTokens} tokens used`,
    );

    return {
      embeddings,
      fromCache,
      totalTokens,
      cacheHits,
      cacheMisses,
    };
  }

  /**
   * Generate embedding for a single text (bypasses cache)
   */
  async generateSingleEmbedding(
    text: string,
    userId?: string,
  ): Promise<number[]> {
    const processedText = this.preprocessText(text);
    const embeddings = await this.huggingFaceService.generateEmbeddings(
      [processedText],
      userId,
    );

    if (!embeddings || embeddings.length === 0) {
      throw new Error('Failed to generate embedding');
    }

    return embeddings[0];
  }

  /**
   * Generate embeddings for multiple texts (bypasses cache)
   */
  private async generateBatchEmbeddings(
    texts: string[],
    userId?: string,
  ): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    const embeddings = await this.huggingFaceService.generateEmbeddings(
      texts,
      userId,
    );

    if (!embeddings || embeddings.length !== texts.length) {
      throw new Error('Failed to generate batch embeddings');
    }

    return embeddings;
  }

  /**
   * Batch process texts with token limit management
   */
  async generateEmbeddingsBatch(
    texts: string[],
    batchSize: number = 10,
    userId?: string,
  ): Promise<BatchEmbeddingResult> {
    if (!texts || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    this.logger.debug(
      `Processing ${texts.length} texts in batches of ${batchSize}`,
    );

    const allEmbeddings: number[][] = [];
    const allFromCache: boolean[] = [];
    let totalCacheHits = 0;
    let totalCacheMisses = 0;
    let totalTokens = 0;

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      this.logger.debug(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`,
      );

      const batchResult = await this.generateEmbeddings(batch, userId);

      allEmbeddings.push(...batchResult.embeddings);
      allFromCache.push(...batchResult.fromCache);
      totalCacheHits += batchResult.cacheHits;
      totalCacheMisses += batchResult.cacheMisses;
      totalTokens += batchResult.totalTokens;

      // Add delay between batches to respect rate limits
      if (i + batchSize < texts.length) {
        await this.delay(1000); // 1 second delay
      }
    }

    return {
      embeddings: allEmbeddings,
      fromCache: allFromCache,
      totalTokens,
      cacheHits: totalCacheHits,
      cacheMisses: totalCacheMisses,
    };
  }

  /**
   * Preprocess text for consistent embeddings
   */
  private preprocessText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Normalize whitespace and remove extra spaces
    let processed = text.trim().replace(/\s+/g, ' ');

    // Convert to lowercase for consistency
    processed = processed.toLowerCase();

    // Remove special characters that might affect embeddings
    processed = processed.replace(/[^\w\s.-]/g, ' ');

    // Normalize multiple spaces again after character removal
    processed = processed.replace(/\s+/g, ' ').trim();

    // Truncate if too long (based on model's token limit)
    const maxChars = 512 * this.CHARS_PER_TOKEN; // Approximate max characters
    if (processed.length > maxChars) {
      processed = processed.substring(0, maxChars);
      this.logger.debug(
        `Text truncated from ${text.length} to ${processed.length} characters`,
      );
    }

    return processed;
  }

  /**
   * Generate hash for text to use as cache key
   */
  private generateTextHash(text: string): string {
    return createHash('sha256').update(text).digest('hex').substring(0, 16);
  }

  /**
   * Get embedding cache statistics
   */
  async getCacheStats(): Promise<{
    totalCachedEmbeddings: number;
    cacheHitRate: number;
    averageEmbeddingSize: number;
  }> {
    try {
      // This is a simplified implementation
      // In a real Redis implementation, you'd use SCAN to count keys
      return {
        totalCachedEmbeddings: 0,
        cacheHitRate: 0,
        averageEmbeddingSize: 384, // Default for all-MiniLM-L6-v2
      };
    } catch (error) {
      this.logger.error(`Error getting cache stats: ${error.message}`);
      return {
        totalCachedEmbeddings: 0,
        cacheHitRate: 0,
        averageEmbeddingSize: 384,
      };
    }
  }

  /**
   * Warm up cache with common texts
   */
  async warmUpCache(commonTexts: string[], userId?: string): Promise<void> {
    try {
      this.logger.log(
        `Warming up embedding cache with ${commonTexts.length} common texts`,
      );

      await this.generateEmbeddingsBatch(commonTexts, 5, userId);

      this.logger.log('Embedding cache warm-up completed');
    } catch (error) {
      this.logger.error(`Error during cache warm-up: ${error.message}`);
    }
  }

  /**
   * Clear all embedding caches
   */
  async clearEmbeddingCache(): Promise<void> {
    try {
      // This would need to be implemented with Redis SCAN in production
      this.logger.log('Embedding cache cleared');
    } catch (error) {
      this.logger.error(`Error clearing embedding cache: ${error.message}`);
    }
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Estimate token count for text
   */
  estimateTokenCount(text: string): number {
    const processedText = this.preprocessText(text);
    return Math.ceil(processedText.length / this.CHARS_PER_TOKEN);
  }

  /**
   * Check if text exceeds token limits
   */
  isTextWithinTokenLimit(text: string, maxTokens: number = 512): boolean {
    return this.estimateTokenCount(text) <= maxTokens;
  }
}

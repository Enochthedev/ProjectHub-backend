import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';
import { QdrantConfig } from '../config/qdrant.config';

export interface VectorEmbeddingOptions {
  model?: string;
  dimensions?: number;
  normalize?: boolean;
  batchSize?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  metadata?: Record<string, any>;
  id?: string;
}

export interface BatchEmbeddingResult {
  embeddings: EmbeddingResult[];
  totalTokens: number;
  processingTime: number;
  cacheHits: number;
  cacheMisses: number;
}

@Injectable()
export class VectorEmbeddingService {
  private readonly logger = new Logger(VectorEmbeddingService.name);
  private readonly qdrantConfig: QdrantConfig;
  private readonly defaultOptions: VectorEmbeddingOptions;

  constructor(
    private readonly configService: ConfigService,
    private readonly embeddingService: EmbeddingService,
  ) {
    this.qdrantConfig = this.configService.get<QdrantConfig>('qdrant')!;
    this.defaultOptions = {
      dimensions: this.qdrantConfig.vectorDimensions,
      normalize: true,
      batchSize: 10,
    };
  }

  /**
   * Generate embeddings for a single text
   */
  async generateEmbedding(
    text: string,
    metadata?: Record<string, any>,
    options?: VectorEmbeddingOptions,
  ): Promise<EmbeddingResult> {
    const startTime = Date.now();

    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      const opts = { ...this.defaultOptions, ...options };

      this.logger.debug(
        `Generating embedding for text: ${text.substring(0, 100)}...`,
      );

      // Use existing embedding service
      const embedding =
        await this.embeddingService.generateSingleEmbedding(text);

      // Normalize if requested
      const finalEmbedding = opts.normalize
        ? this.normalizeVector(embedding)
        : embedding;

      // Validate dimensions
      if (finalEmbedding.length !== opts.dimensions) {
        this.logger.warn(
          `Embedding dimension mismatch: expected ${opts.dimensions}, got ${finalEmbedding.length}`,
        );
      }

      const processingTime = Date.now() - startTime;

      this.logger.debug(`Embedding generated in ${processingTime}ms`);

      return {
        embedding: finalEmbedding,
        text,
        metadata: {
          ...metadata,
          generatedAt: new Date().toISOString(),
          processingTime,
          dimensions: finalEmbedding.length,
        },
      };
    } catch (error) {
      this.logger.error(`Error generating embedding: ${error.message}`);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateBatchEmbeddings(
    texts: string[],
    metadata?: Record<string, any>[],
    options?: VectorEmbeddingOptions,
  ): Promise<BatchEmbeddingResult> {
    const startTime = Date.now();

    try {
      if (!texts || texts.length === 0) {
        throw new Error('Texts array cannot be empty');
      }

      const opts = { ...this.defaultOptions, ...options };

      this.logger.debug(`Generating embeddings for ${texts.length} texts`);

      // Filter out empty texts
      const validTexts = texts.filter((text) => text && text.trim().length > 0);
      if (validTexts.length !== texts.length) {
        this.logger.warn(
          `Filtered out ${texts.length - validTexts.length} empty texts`,
        );
      }

      // Use existing embedding service for batch processing
      const batchResult =
        await this.embeddingService.generateEmbeddings(validTexts);

      // Process results
      const embeddings: EmbeddingResult[] = [];

      for (let i = 0; i < validTexts.length; i++) {
        const text = validTexts[i];
        const embedding = opts.normalize
          ? this.normalizeVector(batchResult.embeddings[i])
          : batchResult.embeddings[i];

        embeddings.push({
          embedding,
          text,
          metadata: {
            ...(metadata?.[i] || {}),
            generatedAt: new Date().toISOString(),
            dimensions: embedding.length,
            fromCache: batchResult.fromCache[i],
          },
        });
      }

      const processingTime = Date.now() - startTime;

      this.logger.debug(
        `Batch embedding generation completed in ${processingTime}ms: ` +
          `${batchResult.cacheHits} cache hits, ${batchResult.cacheMisses} cache misses`,
      );

      return {
        embeddings,
        totalTokens: batchResult.totalTokens,
        processingTime,
        cacheHits: batchResult.cacheHits,
        cacheMisses: batchResult.cacheMisses,
      };
    } catch (error) {
      this.logger.error(`Error generating batch embeddings: ${error.message}`);
      throw new Error(`Failed to generate batch embeddings: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for conversation context
   */
  async generateConversationEmbedding(
    messages: Array<{ role: string; content: string }>,
    conversationId: string,
    userId: string,
  ): Promise<EmbeddingResult> {
    try {
      // Combine messages into a single context string
      const contextText = messages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');

      const metadata = {
        type: 'conversation',
        conversationId,
        userId,
        messageCount: messages.length,
        lastMessageAt: new Date().toISOString(),
      };

      return await this.generateEmbedding(contextText, metadata);
    } catch (error) {
      this.logger.error(
        `Error generating conversation embedding: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Generate embeddings for user memory
   */
  async generateUserMemoryEmbedding(
    content: string,
    userId: string,
    memoryType: 'preference' | 'context' | 'outcome' | 'pattern',
    additionalMetadata?: Record<string, any>,
  ): Promise<EmbeddingResult> {
    try {
      const metadata = {
        type: 'user_memory',
        memoryType,
        userId,
        ...additionalMetadata,
      };

      return await this.generateEmbedding(content, metadata);
    } catch (error) {
      this.logger.error(
        `Error generating user memory embedding: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Generate embeddings for institutional knowledge
   */
  async generateInstitutionalEmbedding(
    content: string,
    knowledgeType: 'lecturer' | 'project' | 'guideline' | 'pattern',
    additionalMetadata?: Record<string, any>,
  ): Promise<EmbeddingResult> {
    try {
      const metadata = {
        type: 'institutional_knowledge',
        knowledgeType,
        ...additionalMetadata,
      };

      return await this.generateEmbedding(content, metadata);
    } catch (error) {
      this.logger.error(
        `Error generating institutional embedding: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Normalize vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0),
    );

    if (magnitude === 0) {
      this.logger.warn('Cannot normalize zero vector');
      return vector;
    }

    return vector.map((val) => val / magnitude);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Validate embedding dimensions
   */
  validateEmbedding(embedding: number[]): boolean {
    if (!Array.isArray(embedding)) {
      return false;
    }

    if (embedding.length !== this.qdrantConfig.vectorDimensions) {
      return false;
    }

    return embedding.every((val) => typeof val === 'number' && !isNaN(val));
  }

  /**
   * Get embedding statistics
   */
  async getEmbeddingStats(): Promise<{
    totalEmbeddings: number;
    averageDimensions: number;
    cacheHitRate: number;
    totalTokensUsed: number;
  }> {
    try {
      const cacheStats = await this.embeddingService.getCacheStats();

      return {
        totalEmbeddings: cacheStats.totalCachedEmbeddings,
        averageDimensions: cacheStats.averageEmbeddingSize,
        cacheHitRate: cacheStats.cacheHitRate,
        totalTokensUsed: 0, // Would need to track this separately
      };
    } catch (error) {
      this.logger.error(`Error getting embedding stats: ${error.message}`);
      return {
        totalEmbeddings: 0,
        averageDimensions: this.qdrantConfig.vectorDimensions,
        cacheHitRate: 0,
        totalTokensUsed: 0,
      };
    }
  }

  /**
   * Preprocess text for optimal embedding generation
   */
  preprocessTextForEmbedding(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Remove excessive whitespace
    let processed = text.trim().replace(/\s+/g, ' ');

    // Remove control characters
    processed = processed.replace(/[\x00-\x1F\x7F]/g, '');

    // Limit length to prevent token overflow
    const maxLength = 8000; // Conservative limit for most models
    if (processed.length > maxLength) {
      processed = processed.substring(0, maxLength);
      this.logger.debug(`Text truncated to ${maxLength} characters`);
    }

    return processed;
  }
}

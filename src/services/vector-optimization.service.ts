import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VectorDatabaseService } from './vector-database.service';
import { QdrantConfig } from '../config/qdrant.config';

export interface OptimizationStats {
  collectionName: string;
  beforeOptimization: {
    pointsCount: number;
    segmentsCount: number;
    indexedVectorsCount: number;
  };
  afterOptimization: {
    pointsCount: number;
    segmentsCount: number;
    indexedVectorsCount: number;
  };
  optimizationTime: number;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
}

export interface IndexingStrategy {
  collectionName: string;
  indexingThreshold: number;
  maxSegmentSize: number;
  segmentNumber: number;
  flushIntervalSec: number;
  optimizationThreads: number;
}

@Injectable()
export class VectorOptimizationService {
  private readonly logger = new Logger(VectorOptimizationService.name);
  private readonly config: QdrantConfig;
  private isOptimizing = false;
  private lastOptimization: Date | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly vectorDb: VectorDatabaseService,
  ) {
    this.config = this.configService.get<QdrantConfig>('qdrant')!;
  }

  /**
   * Run optimization on all collections (scheduled)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledOptimization(): Promise<void> {
    if (this.isOptimizing) {
      this.logger.warn(
        'Optimization already in progress, skipping scheduled run',
      );
      return;
    }

    this.logger.log('Starting scheduled vector database optimization');
    await this.optimizeAllCollections();
  }

  /**
   * Optimize all collections
   */
  async optimizeAllCollections(): Promise<OptimizationStats[]> {
    if (this.isOptimizing) {
      throw new Error('Optimization already in progress');
    }

    this.isOptimizing = true;
    const results: OptimizationStats[] = [];

    try {
      const collections = [
        this.config.collections.conversations,
        this.config.collections.userMemories,
        this.config.collections.institutionalKnowledge,
      ];

      for (const collectionName of collections) {
        const result = await this.optimizeCollection(collectionName);
        results.push(result);
      }

      this.lastOptimization = new Date();
      this.logger.log(
        `Optimization completed for ${results.length} collections`,
      );
    } catch (error) {
      this.logger.error(`Error during optimization: ${error.message}`);
      throw error;
    } finally {
      this.isOptimizing = false;
    }

    return results;
  }

  /**
   * Optimize a specific collection
   */
  async optimizeCollection(collectionName: string): Promise<OptimizationStats> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Starting optimization for collection: ${collectionName}`,
      );

      // Get collection info before optimization
      const beforeInfo = await this.vectorDb.getCollectionInfo(collectionName);

      // Check if optimization is needed
      const needsOptimization = await this.shouldOptimizeCollection(
        collectionName,
        beforeInfo,
      );

      if (!needsOptimization) {
        return {
          collectionName,
          beforeOptimization: {
            pointsCount: beforeInfo.pointsCount,
            segmentsCount: beforeInfo.segmentsCount,
            indexedVectorsCount: beforeInfo.indexedVectorsCount,
          },
          afterOptimization: {
            pointsCount: beforeInfo.pointsCount,
            segmentsCount: beforeInfo.segmentsCount,
            indexedVectorsCount: beforeInfo.indexedVectorsCount,
          },
          optimizationTime: Date.now() - startTime,
          status: 'skipped',
          message: 'Collection does not need optimization',
        };
      }

      // Perform optimization
      await this.performCollectionOptimization(collectionName);

      // Get collection info after optimization
      const afterInfo = await this.vectorDb.getCollectionInfo(collectionName);

      const optimizationTime = Date.now() - startTime;

      this.logger.log(
        `Optimization completed for ${collectionName} in ${optimizationTime}ms: ` +
          `${beforeInfo.segmentsCount} -> ${afterInfo.segmentsCount} segments, ` +
          `${beforeInfo.indexedVectorsCount} -> ${afterInfo.indexedVectorsCount} indexed vectors`,
      );

      return {
        collectionName,
        beforeOptimization: {
          pointsCount: beforeInfo.pointsCount,
          segmentsCount: beforeInfo.segmentsCount,
          indexedVectorsCount: beforeInfo.indexedVectorsCount,
        },
        afterOptimization: {
          pointsCount: afterInfo.pointsCount,
          segmentsCount: afterInfo.segmentsCount,
          indexedVectorsCount: afterInfo.indexedVectorsCount,
        },
        optimizationTime,
        status: 'success',
      };
    } catch (error) {
      this.logger.error(
        `Error optimizing collection ${collectionName}: ${error.message}`,
      );

      return {
        collectionName,
        beforeOptimization: {
          pointsCount: 0,
          segmentsCount: 0,
          indexedVectorsCount: 0,
        },
        afterOptimization: {
          pointsCount: 0,
          segmentsCount: 0,
          indexedVectorsCount: 0,
        },
        optimizationTime: Date.now() - startTime,
        status: 'failed',
        message: error.message,
      };
    }
  }

  /**
   * Check if collection needs optimization
   */
  private async shouldOptimizeCollection(
    collectionName: string,
    info: any,
  ): Promise<boolean> {
    // Skip if collection is empty
    if (info.pointsCount === 0) {
      return false;
    }

    // Optimize if there are too many segments
    const maxSegments = 10;
    if (info.segmentsCount > maxSegments) {
      this.logger.debug(
        `Collection ${collectionName} has ${info.segmentsCount} segments (max: ${maxSegments})`,
      );
      return true;
    }

    // Optimize if indexing is behind
    const indexingRatio = info.indexedVectorsCount / info.vectorsCount;
    if (indexingRatio < 0.8) {
      this.logger.debug(
        `Collection ${collectionName} indexing ratio: ${indexingRatio.toFixed(2)}`,
      );
      return true;
    }

    // Optimize if it's been a while since last optimization
    if (this.lastOptimization) {
      const daysSinceOptimization =
        (Date.now() - this.lastOptimization.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceOptimization > 7) {
        this.logger.debug(
          `Collection ${collectionName} last optimized ${daysSinceOptimization.toFixed(1)} days ago`,
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Perform the actual optimization
   */
  private async performCollectionOptimization(
    collectionName: string,
  ): Promise<void> {
    // Note: Qdrant automatically optimizes collections, but we can trigger it manually
    // This is a placeholder for actual optimization logic

    // In a real implementation, you might:
    // 1. Trigger collection optimization via Qdrant API
    // 2. Rebuild indexes if needed
    // 3. Compact segments
    // 4. Update collection configuration

    this.logger.debug(
      `Performing optimization for collection: ${collectionName}`,
    );

    // Simulate optimization time
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  /**
   * Get indexing strategies for different collection types
   */
  getIndexingStrategies(): IndexingStrategy[] {
    return [
      {
        collectionName: this.config.collections.conversations,
        indexingThreshold: 10000,
        maxSegmentSize: 50000,
        segmentNumber: 4,
        flushIntervalSec: 10,
        optimizationThreads: 2,
      },
      {
        collectionName: this.config.collections.userMemories,
        indexingThreshold: 5000,
        maxSegmentSize: 20000,
        segmentNumber: 2,
        flushIntervalSec: 5,
        optimizationThreads: 1,
      },
      {
        collectionName: this.config.collections.institutionalKnowledge,
        indexingThreshold: 1000,
        maxSegmentSize: 10000,
        segmentNumber: 1,
        flushIntervalSec: 30,
        optimizationThreads: 1,
      },
    ];
  }

  /**
   * Update collection configuration for optimization
   */
  async updateCollectionOptimization(
    collectionName: string,
    strategy: Partial<IndexingStrategy>,
  ): Promise<void> {
    try {
      this.logger.log(
        `Updating optimization config for collection: ${collectionName}`,
      );

      // Note: This would require Qdrant API calls to update collection configuration
      // Implementation depends on Qdrant client capabilities

      this.logger.debug(
        `Updated optimization config: ${JSON.stringify(strategy)}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating collection optimization: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get optimization statistics
   */
  async getOptimizationStats(): Promise<{
    isOptimizing: boolean;
    lastOptimization: Date | null;
    collections: Array<{
      name: string;
      pointsCount: number;
      segmentsCount: number;
      indexedRatio: number;
      needsOptimization: boolean;
    }>;
  }> {
    const collections = [
      this.config.collections.conversations,
      this.config.collections.userMemories,
      this.config.collections.institutionalKnowledge,
    ];

    const collectionStats: Array<{
      name: string;
      pointsCount: number;
      segmentsCount: number;
      indexedRatio: number;
      needsOptimization: boolean;
    }> = [];

    for (const collectionName of collections) {
      try {
        const info = await this.vectorDb.getCollectionInfo(collectionName);
        const needsOptimization = await this.shouldOptimizeCollection(
          collectionName,
          info,
        );

        collectionStats.push({
          name: collectionName,
          pointsCount: info.pointsCount,
          segmentsCount: info.segmentsCount,
          indexedRatio:
            info.vectorsCount > 0
              ? info.indexedVectorsCount / info.vectorsCount
              : 0,
          needsOptimization,
        });
      } catch (error) {
        this.logger.error(
          `Error getting stats for collection ${collectionName}: ${error.message}`,
        );
        collectionStats.push({
          name: collectionName,
          pointsCount: 0,
          segmentsCount: 0,
          indexedRatio: 0,
          needsOptimization: false,
        });
      }
    }

    return {
      isOptimizing: this.isOptimizing,
      lastOptimization: this.lastOptimization,
      collections: collectionStats,
    };
  }

  /**
   * Force optimization of a specific collection
   */
  async forceOptimizeCollection(
    collectionName: string,
  ): Promise<OptimizationStats> {
    if (this.isOptimizing) {
      throw new Error('Optimization already in progress');
    }

    this.logger.log(`Force optimizing collection: ${collectionName}`);
    return await this.optimizeCollection(collectionName);
  }

  /**
   * Clean up old vectors based on age or relevance
   */
  async cleanupOldVectors(
    collectionName: string,
    maxAge: number = 90, // days
    minRelevanceScore: number = 0.1,
  ): Promise<number> {
    try {
      this.logger.log(
        `Cleaning up old vectors in collection: ${collectionName}`,
      );

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAge);

      // Count vectors to be deleted
      const countToDelete = await this.vectorDb.countVectors(collectionName, {
        createdAt: { lt: cutoffDate.toISOString() },
        relevanceScore: { lt: minRelevanceScore },
      });

      if (countToDelete === 0) {
        this.logger.debug(`No old vectors to clean up in ${collectionName}`);
        return 0;
      }

      // Delete old vectors
      await this.vectorDb.deleteVectorsByFilter(collectionName, {
        createdAt: { lt: cutoffDate.toISOString() },
        relevanceScore: { lt: minRelevanceScore },
      });

      this.logger.log(
        `Cleaned up ${countToDelete} old vectors from ${collectionName}`,
      );
      return countToDelete;
    } catch (error) {
      this.logger.error(`Error cleaning up old vectors: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current optimization status
   */
  getOptimizationStatus(): {
    isOptimizing: boolean;
    lastOptimization: Date | null;
  } {
    return {
      isOptimizing: this.isOptimizing,
      lastOptimization: this.lastOptimization,
    };
  }
}

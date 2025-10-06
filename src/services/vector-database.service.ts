import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import * as uuid from 'uuid';
import { QdrantConfig } from '../config/qdrant.config';

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: Record<string, any>;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, any>;
  vector?: number[];
}

export interface SearchOptions {
  limit?: number;
  scoreThreshold?: number;
  filter?: Record<string, any>;
  withVector?: boolean;
  offset?: number;
}

export interface CollectionInfo {
  name: string;
  vectorsCount: number;
  indexedVectorsCount: number;
  pointsCount: number;
  segmentsCount: number;
  status: string;
}

@Injectable()
export class VectorDatabaseService implements OnModuleInit {
  private readonly logger = new Logger(VectorDatabaseService.name);
  private client: QdrantClient;
  private readonly config: QdrantConfig;
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<QdrantConfig>('qdrant')!;
  }

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Initialize Qdrant client and collections
   */
  private async initialize(): Promise<void> {
    try {
      this.logger.log('Initializing Qdrant client...');

      this.client = new QdrantClient({
        url: this.config.url,
        apiKey: this.config.apiKey,
        timeout: this.config.timeout,
      });

      // Test connection
      await this.testConnection();

      // Initialize collections
      await this.initializeCollections();

      this.isInitialized = true;
      this.logger.log('Qdrant client initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Qdrant client: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test connection to Qdrant
   */
  private async testConnection(): Promise<void> {
    try {
      // Simple health check by getting collections
      await this.client.getCollections();
      this.logger.debug('Qdrant connection test successful');
    } catch (error) {
      throw new Error(`Qdrant connection test failed: ${error.message}`);
    }
  }

  /**
   * Initialize required collections
   */
  private async initializeCollections(): Promise<void> {
    const collections = [
      this.config.collections.conversations,
      this.config.collections.userMemories,
      this.config.collections.institutionalKnowledge,
    ];

    for (const collectionName of collections) {
      await this.ensureCollection(collectionName);
    }
  }

  /**
   * Ensure collection exists, create if not
   */
  async ensureCollection(collectionName: string): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === collectionName,
      );

      if (!exists) {
        this.logger.log(`Creating collection: ${collectionName}`);

        await this.client.createCollection(collectionName, {
          vectors: {
            size: this.config.vectorDimensions,
            distance: this.config.distanceMetric,
          },
          optimizers_config: {
            default_segment_number: 2,
            max_segment_size: 20000,
            memmap_threshold: 50000,
            indexing_threshold: 20000,
            flush_interval_sec: 5,
            max_optimization_threads: 1,
          },
          replication_factor: 1,
          write_consistency_factor: 1,
        });

        this.logger.log(`Collection ${collectionName} created successfully`);
      } else {
        this.logger.debug(`Collection ${collectionName} already exists`);
      }
    } catch (error) {
      this.logger.error(
        `Error ensuring collection ${collectionName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Store a single vector point
   */
  async storeVector(
    collectionName: string,
    vector: number[],
    payload: Record<string, any>,
    id?: string,
  ): Promise<string> {
    this.ensureInitialized();

    try {
      const pointId = id || uuid.v4();

      await this.client.upsert(collectionName, {
        wait: true,
        points: [
          {
            id: pointId,
            vector,
            payload: {
              ...payload,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        ],
      });

      this.logger.debug(
        `Vector stored in ${collectionName} with ID: ${pointId}`,
      );
      return pointId;
    } catch (error) {
      this.logger.error(`Error storing vector: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store multiple vector points
   */
  async storeBatchVectors(
    collectionName: string,
    points: VectorPoint[],
  ): Promise<string[]> {
    this.ensureInitialized();

    try {
      const pointsWithTimestamps = points.map((point) => ({
        id: point.id || uuid.v4(),
        vector: point.vector,
        payload: {
          ...point.payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }));

      await this.client.upsert(collectionName, {
        wait: true,
        points: pointsWithTimestamps,
      });

      const ids = pointsWithTimestamps.map((p) => p.id);
      this.logger.debug(`${ids.length} vectors stored in ${collectionName}`);
      return ids;
    } catch (error) {
      this.logger.error(`Error storing batch vectors: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search for similar vectors
   */
  async searchSimilar(
    collectionName: string,
    queryVector: number[],
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    this.ensureInitialized();

    try {
      const {
        limit = 10,
        scoreThreshold = 0.0,
        filter,
        withVector = false,
        offset = 0,
      } = options;

      const searchResult = await this.client.search(collectionName, {
        vector: queryVector,
        limit,
        offset,
        score_threshold: scoreThreshold,
        with_payload: true,
        with_vector: withVector,
        filter: filter ? this.buildFilter(filter) : undefined,
      });

      const results: SearchResult[] = searchResult.map((result) => ({
        id: result.id.toString(),
        score: result.score,
        payload: result.payload || {},
        vector:
          withVector &&
          Array.isArray(result.vector) &&
          typeof result.vector[0] === 'number'
            ? (result.vector as number[])
            : undefined,
      }));

      this.logger.debug(
        `Found ${results.length} similar vectors in ${collectionName} ` +
          `(threshold: ${scoreThreshold}, limit: ${limit})`,
      );

      return results;
    } catch (error) {
      this.logger.error(`Error searching vectors: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get vector by ID
   */
  async getVector(
    collectionName: string,
    id: string,
    withVector: boolean = false,
  ): Promise<SearchResult | null> {
    this.ensureInitialized();

    try {
      const result = await this.client.retrieve(collectionName, {
        ids: [id],
        with_payload: true,
        with_vector: withVector,
      });

      if (result.length === 0) {
        return null;
      }

      const point = result[0];
      return {
        id: point.id.toString(),
        score: 1.0, // Perfect match
        payload: point.payload || {},
        vector:
          withVector &&
          Array.isArray(point.vector) &&
          typeof point.vector[0] === 'number'
            ? (point.vector as number[])
            : undefined,
      };
    } catch (error) {
      this.logger.error(`Error retrieving vector: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update vector payload
   */
  async updateVectorPayload(
    collectionName: string,
    id: string,
    payload: Record<string, any>,
  ): Promise<void> {
    this.ensureInitialized();

    try {
      await this.client.setPayload(collectionName, {
        wait: true,
        payload: {
          ...payload,
          updatedAt: new Date().toISOString(),
        },
        points: [id],
      });

      this.logger.debug(`Vector payload updated for ID: ${id}`);
    } catch (error) {
      this.logger.error(`Error updating vector payload: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete vector by ID
   */
  async deleteVector(collectionName: string, id: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.client.delete(collectionName, {
        wait: true,
        points: [id],
      });

      this.logger.debug(`Vector deleted with ID: ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting vector: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete vectors by filter
   */
  async deleteVectorsByFilter(
    collectionName: string,
    filter: Record<string, any>,
  ): Promise<void> {
    this.ensureInitialized();

    try {
      await this.client.delete(collectionName, {
        wait: true,
        filter: this.buildFilter(filter),
      });

      this.logger.debug(
        `Vectors deleted with filter: ${JSON.stringify(filter)}`,
      );
    } catch (error) {
      this.logger.error(`Error deleting vectors by filter: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get collection information
   */
  async getCollectionInfo(collectionName: string): Promise<CollectionInfo> {
    this.ensureInitialized();

    try {
      const info = await this.client.getCollection(collectionName);

      return {
        name: collectionName,
        vectorsCount: info.vectors_count || 0,
        indexedVectorsCount: info.indexed_vectors_count || 0,
        pointsCount: info.points_count || 0,
        segmentsCount: info.segments_count || 0,
        status: info.status || 'unknown',
      };
    } catch (error) {
      this.logger.error(`Error getting collection info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Count vectors in collection with optional filter
   */
  async countVectors(
    collectionName: string,
    filter?: Record<string, any>,
  ): Promise<number> {
    this.ensureInitialized();

    try {
      const result = await this.client.count(collectionName, {
        filter: filter ? this.buildFilter(filter) : undefined,
        exact: true,
      });

      return result.count;
    } catch (error) {
      this.logger.error(`Error counting vectors: ${error.message}`);
      throw error;
    }
  }

  /**
   * Scroll through vectors (pagination)
   */
  async scrollVectors(
    collectionName: string,
    options: {
      limit?: number;
      offset?: string;
      filter?: Record<string, any>;
      withVector?: boolean;
    } = {},
  ): Promise<{
    points: SearchResult[];
    nextOffset?: string;
  }> {
    this.ensureInitialized();

    try {
      const { limit = 100, offset, filter, withVector = false } = options;

      const result = await this.client.scroll(collectionName, {
        limit,
        offset,
        with_payload: true,
        with_vector: withVector,
        filter: filter ? this.buildFilter(filter) : undefined,
      });

      const points: SearchResult[] = result.points.map((point) => ({
        id: point.id.toString(),
        score: 1.0,
        payload: point.payload || {},
        vector:
          withVector &&
          Array.isArray(point.vector) &&
          typeof point.vector[0] === 'number'
            ? (point.vector as number[])
            : undefined,
      }));

      return {
        points,
        nextOffset:
          typeof result.next_page_offset === 'string'
            ? result.next_page_offset
            : undefined,
      };
    } catch (error) {
      this.logger.error(`Error scrolling vectors: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build Qdrant filter from simple key-value pairs
   */
  private buildFilter(filter: Record<string, any>): any {
    const conditions = Object.entries(filter).map(([key, value]) => {
      if (Array.isArray(value)) {
        return {
          key,
          match: {
            any: value,
          },
        };
      } else {
        return {
          key,
          match: {
            value,
          },
        };
      }
    });

    return conditions.length === 1 ? conditions[0] : { must: conditions };
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('VectorDatabaseService is not initialized');
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    collections: string[];
    totalVectors: number;
  }> {
    try {
      this.ensureInitialized();

      const collections = await this.client.getCollections();
      const collectionNames = collections.collections.map((c) => c.name);

      let totalVectors = 0;
      for (const name of collectionNames) {
        const info = await this.getCollectionInfo(name);
        totalVectors += info.pointsCount;
      }

      return {
        status: 'healthy',
        collections: collectionNames,
        totalVectors,
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        collections: [],
        totalVectors: 0,
      };
    }
  }
}

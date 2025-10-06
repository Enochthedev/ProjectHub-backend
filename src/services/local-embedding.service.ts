import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface LocalEmbeddingResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
}

@Injectable()
export class LocalEmbeddingService {
  private readonly logger = new Logger(LocalEmbeddingService.name);
  private readonly client: AxiosInstance;
  private readonly serviceUrl: string;
  private readonly enabled: boolean;
  private isHealthy = false;

  constructor(private readonly configService: ConfigService) {
    this.serviceUrl = this.configService.get<string>(
      'LOCAL_EMBEDDING_SERVICE_URL',
      'http://localhost:8001',
    );
    this.enabled = this.configService.get<boolean>(
      'USE_LOCAL_EMBEDDINGS',
      false,
    );

    this.client = axios.create({
      baseURL: this.serviceUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (this.enabled) {
      this.checkHealth();
      // Check health every 5 minutes
      setInterval(() => this.checkHealth(), 5 * 60 * 1000);
    }
  }

  /**
   * Check if the local embedding service is healthy
   */
  private async checkHealth(): Promise<void> {
    try {
      const response = await this.client.get('/health');
      this.isHealthy = response.data.status === 'healthy';
      if (this.isHealthy) {
        this.logger.log(
          `Local embedding service is healthy (model: ${response.data.model})`,
        );
      }
    } catch (error) {
      this.isHealthy = false;
      this.logger.warn(
        `Local embedding service health check failed: ${error.message}`,
      );
    }
  }

  /**
   * Check if local embeddings are available
   */
  isAvailable(): boolean {
    return this.enabled && this.isHealthy;
  }

  /**
   * Generate embeddings for a list of texts
   */
  async generateEmbeddings(
    texts: string[],
    normalize = true,
  ): Promise<number[][]> {
    if (!this.enabled) {
      throw new HttpException(
        'Local embedding service is not enabled',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!this.isHealthy) {
      throw new HttpException(
        'Local embedding service is not available',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!texts || texts.length === 0) {
      throw new HttpException('No texts provided', HttpStatus.BAD_REQUEST);
    }

    if (texts.length > 100) {
      throw new HttpException(
        'Maximum 100 texts per request',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const response = await this.client.post<LocalEmbeddingResponse>(
        '/embed',
        {
          texts,
          normalize,
        },
      );

      this.logger.debug(
        `Generated ${response.data.embeddings.length} embeddings using ${response.data.model}`,
      );

      return response.data.embeddings;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Local embedding service error: ${error.message}`,
          error.response?.data,
        );
        throw new HttpException(
          error.response?.data?.detail || 'Failed to generate embeddings',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw error;
    }
  }

  /**
   * Generate a single embedding
   */
  async generateEmbedding(text: string, normalize = true): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text], normalize);
    return embeddings[0];
  }

  /**
   * Generate embeddings in batches to handle large datasets
   */
  async generateEmbeddingsBatch(
    texts: string[],
    batchSize = 50,
    normalize = true,
  ): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await this.generateEmbeddings(batch, normalize);
      results.push(...batchEmbeddings);

      // Small delay between batches to avoid overwhelming the service
      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }
}

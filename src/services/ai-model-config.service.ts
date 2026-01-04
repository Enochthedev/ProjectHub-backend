import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIModelPricing } from '../entities/ai-model-pricing.entity';
import { AIModelPerformance } from '../entities/ai-model-performance.entity';
import { AIApiUsage } from '../entities/ai-api-usage.entity';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  costPerToken: number;
  maxTokens: number;
  averageLatency: number;
  qualityScore: number;
  isAvailable: boolean;
  capabilities: string[];
}

@Injectable()
export class AIModelConfigService {
  private readonly logger = new Logger(AIModelConfigService.name);
  private modelCache: Map<string, AIModelPricing> = new Map();
  private lastCacheUpdate: Date = new Date(0);
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  constructor(
    @InjectRepository(AIModelPricing)
    private readonly modelPricingRepo: Repository<AIModelPricing>,
    @InjectRepository(AIModelPerformance)
    private readonly modelPerformanceRepo: Repository<AIModelPerformance>,
    @InjectRepository(AIApiUsage)
    private readonly apiUsageRepo: Repository<AIApiUsage>,
  ) {
    this.refreshCache();
  }

  /**
   * Get model pricing from database with caching
   */
  async getModelPricing(modelId: string): Promise<AIModelPricing | null> {
    await this.ensureCacheValid();
    return this.modelCache.get(modelId) || null;
  }

  /**
   * Get all available models
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    await this.ensureCacheValid();

    const models: ModelInfo[] = [];
    for (const [, pricing] of this.modelCache) {
      if (pricing.isEnabledAndAvailable()) {
        // Get performance stats if available
        const performance = await this.getModelPerformance(pricing.modelId);

        models.push({
          id: pricing.modelId,
          name: pricing.name,
          provider: pricing.provider,
          costPerToken: Number(pricing.costPerToken),
          maxTokens: pricing.maxTokens,
          averageLatency: performance?.averageLatency
            ? Number(performance.averageLatency)
            : pricing.averageLatency,
          qualityScore: Number(pricing.qualityScore),
          isAvailable: pricing.isAvailable,
          capabilities: pricing.capabilities,
        });
      }
    }

    return models;
  }

  /**
   * Get or create model performance stats
   */
  async getModelPerformance(modelId: string): Promise<AIModelPerformance | null> {
    let performance = await this.modelPerformanceRepo.findOne({
      where: { modelId },
    });

    if (!performance) {
      // Create new performance record
      performance = this.modelPerformanceRepo.create({
        modelId,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        averageCost: 0,
        totalCost: 0,
        totalTokens: 0,
      });
      await this.modelPerformanceRepo.save(performance);
    }

    return performance;
  }

  /**
   * Record model usage and update performance stats
   */
  async recordModelUsage(
    modelId: string,
    latency: number,
    cost: number,
    tokens: number,
    success: boolean,
  ): Promise<void> {
    const performance = await this.getModelPerformance(modelId);
    if (!performance) return;

    if (success) {
      performance.recordSuccess(latency, cost, tokens);
    } else {
      performance.recordFailure();
    }

    await this.modelPerformanceRepo.save(performance);
  }

  /**
   * Get monthly budget usage for a user
   */
  async getMonthlyUsage(userId?: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const queryBuilder = this.apiUsageRepo
      .createQueryBuilder('usage')
      .select('SUM(usage.cost)', 'total')
      .where('usage.createdAt >= :startOfMonth', { startOfMonth })
      .andWhere('usage.success = :success', { success: true });

    if (userId) {
      queryBuilder.andWhere('usage.userId = :userId', { userId });
    }

    const result = await queryBuilder.getRawOne();
    return Number(result?.total || 0);
  }

  /**
   * Sync hardcoded models to database (for initial setup)
   */
  async syncModelsToDatabase(models: Partial<AIModelPricing>[]): Promise<void> {
    for (const modelData of models) {
      const existing = await this.modelPricingRepo.findOne({
        where: { modelId: modelData.modelId! },
      });

      if (existing) {
        // Update existing model
        Object.assign(existing, modelData);
        await this.modelPricingRepo.save(existing);
      } else {
        // Create new model
        const model = this.modelPricingRepo.create(modelData);
        await this.modelPricingRepo.save(model);
      }
    }

    this.logger.log(`Synced ${models.length} models to database`);
    await this.refreshCache();
  }

  /**
   * Refresh the model cache
   */
  private async refreshCache(): Promise<void> {
    try {
      const models = await this.modelPricingRepo.find({
        where: { isActive: true },
      });

      this.modelCache.clear();
      for (const model of models) {
        this.modelCache.set(model.modelId, model);
      }

      this.lastCacheUpdate = new Date();
      this.logger.debug(`Model cache refreshed with ${models.length} models`);
    } catch (error) {
      this.logger.error(`Failed to refresh model cache: ${error.message}`);
    }
  }

  /**
   * Ensure cache is valid, refresh if needed
   */
  private async ensureCacheValid(): Promise<void> {
    const cacheAge = Date.now() - this.lastCacheUpdate.getTime();
    if (cacheAge > this.CACHE_TTL_MS) {
      await this.refreshCache();
    }
  }

  /**
   * Update model availability
   */
  async updateModelAvailability(modelId: string, isAvailable: boolean): Promise<void> {
    const model = await this.modelPricingRepo.findOne({
      where: { modelId },
    });

    if (model) {
      model.isAvailable = isAvailable;
      await this.modelPricingRepo.save(model);
      await this.refreshCache();
      this.logger.log(`Model ${modelId} availability updated to: ${isAvailable}`);
    }
  }

  /**
   * Get all model performance stats
   */
  async getAllModelPerformance(): Promise<Map<string, AIModelPerformance>> {
    const performances = await this.modelPerformanceRepo.find();
    const map = new Map<string, AIModelPerformance>();
    for (const perf of performances) {
      map.set(perf.modelId, perf);
    }
    return map;
  }
}

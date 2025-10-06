import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { VectorDatabaseService } from '../services/vector-database.service';
import { VectorEmbeddingService } from '../services/vector-embedding.service';
import { VectorOptimizationService } from '../services/vector-optimization.service';
import { EmbeddingService } from '../services/embedding.service';
import { HuggingFaceService } from '../services/hugging-face.service';
import { LocalEmbeddingService } from '../services/local-embedding.service';
import { RecommendationCacheService } from '../services/recommendation-cache.service';
import { AIRateLimiterService } from '../services/ai-rate-limiter.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import qdrantConfig from '../config/qdrant.config';

@Module({
  imports: [
    ConfigModule.forFeature(qdrantConfig),
    ScheduleModule.forRoot(),
    CacheModule.register(),
  ],
  providers: [
    VectorDatabaseService,
    VectorEmbeddingService,
    VectorOptimizationService,
    EmbeddingService,
    HuggingFaceService,
    LocalEmbeddingService,
    RecommendationCacheService,
    AIRateLimiterService,
    CircuitBreakerService,
  ],
  exports: [
    VectorDatabaseService,
    VectorEmbeddingService,
    VectorOptimizationService,
  ],
})
export class VectorModule {}

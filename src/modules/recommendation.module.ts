import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Entities
import { Recommendation } from '../entities/recommendation.entity';
import { RecommendationFeedback } from '../entities/recommendation-feedback.entity';
import { AIApiUsage } from '../entities/ai-api-usage.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { ProjectView } from '../entities/project-view.entity';
import { ProjectBookmark } from '../entities/project-bookmark.entity';

// Services
import { RecommendationService } from '../services/recommendation.service';
import { FallbackRecommendationService } from '../services/fallback-recommendation.service';
import { HuggingFaceService } from '../services/hugging-face.service';
import { EmbeddingService } from '../services/embedding.service';
import { SimilarityService } from '../services/similarity.service';
import { TextProcessingService } from '../services/text-processing.service';
import { AIRateLimiterService } from '../services/ai-rate-limiter.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { RecommendationCacheService } from '../services/recommendation-cache.service';
import { RecommendationRefreshService } from '../services/recommendation-refresh.service';
import { BatchRecommendationService } from '../services/batch-recommendation.service';
import { FeedbackLearningService } from '../services/feedback-learning.service';
import { RecommendationAnalyticsService } from '../services/recommendation-analytics.service';
import { ExplanationService } from '../services/explanation.service';
import { ProgressiveLoadingService } from '../services/progressive-loading.service';

// Controllers
import { RecommendationController } from '../controllers/recommendation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Recommendation,
      RecommendationFeedback,
      AIApiUsage,
      User,
      Project,
      StudentProfile,
      ProjectView,
      ProjectBookmark,
    ]),
    CacheModule.register({
      ttl: 3600, // 1 hour default TTL
      max: 1000, // Maximum number of items in cache
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
  ],
  controllers: [RecommendationController],
  providers: [
    RecommendationService,
    FallbackRecommendationService,
    HuggingFaceService,
    EmbeddingService,
    SimilarityService,
    TextProcessingService,
    AIRateLimiterService,
    CircuitBreakerService,
    RecommendationCacheService,
    RecommendationRefreshService,
    BatchRecommendationService,
    FeedbackLearningService,
    RecommendationAnalyticsService,
    ExplanationService,
    ProgressiveLoadingService,
  ],
  exports: [
    RecommendationService,
    FallbackRecommendationService,
    HuggingFaceService,
    EmbeddingService,
    SimilarityService,
    RecommendationCacheService,
    RecommendationRefreshService,
    BatchRecommendationService,
    FeedbackLearningService,
    RecommendationAnalyticsService,
    ExplanationService,
    ProgressiveLoadingService,
  ],
})
export class RecommendationModule {}

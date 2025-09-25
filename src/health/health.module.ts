import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MonitoringService } from './monitoring.service';
import { AIHealthController } from '../controllers/ai-health.controller';
import { AIMonitoringService } from '../services/ai-monitoring.service';
import { AILoggingService } from '../services/ai-logging.service';
import { AIAlertingService } from '../services/ai-alerting.service';
import { HuggingFaceService } from '../services/hugging-face.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { AIRateLimiterService } from '../services/ai-rate-limiter.service';
import { AIApiUsage } from '../entities/ai-api-usage.entity';
import { Recommendation } from '../entities/recommendation.entity';
import { RecommendationFeedback } from '../entities/recommendation-feedback.entity';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule.forFeature([
      AIApiUsage,
      Recommendation,
      RecommendationFeedback,
    ]),
  ],
  controllers: [HealthController, AIHealthController],
  providers: [
    HealthService,
    MonitoringService,
    AIMonitoringService,
    AILoggingService,
    AIAlertingService,
    HuggingFaceService,
    CircuitBreakerService,
    AIRateLimiterService,
  ],
  exports: [
    MonitoringService,
    AIMonitoringService,
    AILoggingService,
    AIAlertingService,
  ],
})
export class HealthModule {}

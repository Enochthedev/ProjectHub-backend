import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

// Controllers
import { AIAssistantController } from '../controllers/ai-assistant.controller';

// Entities
import { Conversation } from '../entities/conversation.entity';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { KnowledgeBaseEntry } from '../entities/knowledge-base-entry.entity';
import { KnowledgeBaseVersion } from '../entities/knowledge-base-version.entity';
import { KnowledgeBaseApproval } from '../entities/knowledge-base-approval.entity';
import { AdminAuditLog } from '../entities/admin-audit-log.entity';
import { ResponseTemplate } from '../entities/response-template.entity';
import { MessageRating } from '../entities/message-rating.entity';
import { AIApiUsage } from '../entities/ai-api-usage.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { SupervisorProfile } from '../entities/supervisor-profile.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { Milestone } from '../entities/milestone.entity';

// Services
import { ConversationService } from '../services/conversation.service';
import { MessageManagementService } from '../services/message-management.service';
import { AIResponseGenerationService } from '../services/ai-response-generation.service';
import { KnowledgeBaseService } from '../services/knowledge-base.service';
import { ContextService } from '../services/context.service';
import { SupervisorAIMonitoringService } from '../services/supervisor-ai-monitoring.service';
import { AdminKnowledgeManagementService } from '../services/admin-knowledge-management.service';
import { HuggingFaceService } from '../services/hugging-face.service';
import { QueryProcessingService } from '../services/query-processing.service';
import { AIResponseValidatorService } from '../services/ai-response-validator.service';
import { FallbackRecommendationService } from '../services/fallback-recommendation.service';
import { TemplateManagementService } from '../services/template-management.service';
import { ConversationCacheService } from '../services/conversation-cache.service';
import { AIRateLimiterService } from '../services/ai-rate-limiter.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { ProjectContextIntegrationService } from '../services/project-context-integration.service';
import { MilestoneGuidanceService } from '../services/milestone-guidance.service';

// Additional services
import { AdminAuditService } from '../services/admin-audit.service';
import { EmbeddingService } from '../services/embedding.service';
import { SimilarityService } from '../services/similarity.service';
import { RecommendationCacheService } from '../services/recommendation-cache.service';

// Common services
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationMessage,
      KnowledgeBaseEntry,
      KnowledgeBaseVersion,
      KnowledgeBaseApproval,
      AdminAuditLog,
      ResponseTemplate,
      MessageRating,
      AIApiUsage,
      User,
      Project,
      SupervisorProfile,
      StudentProfile,
      Milestone,
    ]),
    ConfigModule,
    CacheModule.register({
      ttl: 1800, // 30 minutes
      max: 1000, // Maximum number of items in cache
    }),
    CommonModule,
  ],
  controllers: [AIAssistantController],
  providers: [
    // Core AI services
    ConversationService,
    MessageManagementService,
    AIResponseGenerationService,
    KnowledgeBaseService,
    ContextService,
    SupervisorAIMonitoringService,
    AdminKnowledgeManagementService,

    // AI processing services
    HuggingFaceService,
    QueryProcessingService,
    AIResponseValidatorService,
    FallbackRecommendationService,
    TemplateManagementService,

    // Infrastructure services
    ConversationCacheService,
    AIRateLimiterService,
    CircuitBreakerService,

    // Project and milestone integration services
    ProjectContextIntegrationService,
    MilestoneGuidanceService,

    // Additional required services
    AdminAuditService,
    EmbeddingService,
    SimilarityService,
    RecommendationCacheService,
  ],
  exports: [
    // Export services that might be used by other modules
    ConversationService,
    MessageManagementService,
    AIResponseGenerationService,
    KnowledgeBaseService,
    ContextService,
    SupervisorAIMonitoringService,
    HuggingFaceService,
    ProjectContextIntegrationService,
    MilestoneGuidanceService,
  ],
})
export class AIAssistantModule { }

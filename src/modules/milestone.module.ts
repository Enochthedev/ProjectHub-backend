import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MilestoneController } from '../controllers/milestone.controller';
import { MilestoneTemplateController } from '../controllers/milestone-template.controller';
import { SupervisorController } from '../controllers/supervisor.controller';
import { MilestoneService } from '../services/milestone.service';
import { MilestoneTemplateService } from '../services/milestone-template.service';
import { MilestoneTemplateApplicationService } from '../services/milestone-template-application.service';
import { MilestoneCacheService } from '../services/milestone-cache.service';
import { MilestoneCacheInvalidationService } from '../services/milestone-cache-invalidation.service';
import { MilestoneAnalyticsService } from '../services/milestone-analytics.service';
import { SupervisorReportingService } from '../services/supervisor-reporting.service';
import { SupervisorAvailabilityService } from '../services/supervisor-availability.service';
import { SupervisorAIInteractionService } from '../services/supervisor-ai-interaction.service';
import { SupervisorCommunicationService } from '../services/supervisor-communication.service';
import { MilestoneQueryOptimizationService } from '../services/milestone-query-optimization.service';
import { MilestoneAccessControlService } from '../services/milestone-access-control.service';
import { MilestoneInputSanitizationService } from '../services/milestone-input-sanitization.service';
import { MilestoneRateLimitingService } from '../services/milestone-rate-limiting.service';
import { Milestone } from '../entities/milestone.entity';
import { MilestoneNote } from '../entities/milestone-note.entity';
import { MilestoneReminder } from '../entities/milestone-reminder.entity';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { SupervisorAvailability } from '../entities/supervisor-availability.entity';
import { AIInteractionReview } from '../entities/ai-interaction-review.entity';
import { Conversation } from '../entities/conversation.entity';
import { CacheModule } from './cache.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Milestone,
      MilestoneNote,
      MilestoneReminder,
      MilestoneTemplate,
      User,
      Project,
      SupervisorAvailability,
      AIInteractionReview,
      Conversation,
    ]),
    CacheModule,
    CommonModule,
  ],
  controllers: [MilestoneController, MilestoneTemplateController, SupervisorController],
  providers: [
    MilestoneService,
    MilestoneTemplateService,
    MilestoneTemplateApplicationService,
    MilestoneCacheService,
    MilestoneCacheInvalidationService,
    MilestoneAnalyticsService,
    SupervisorReportingService,
    SupervisorAvailabilityService,
    SupervisorAIInteractionService,
    SupervisorCommunicationService,
    MilestoneQueryOptimizationService,
    MilestoneAccessControlService,
    MilestoneInputSanitizationService,
    MilestoneRateLimitingService,
  ],
  exports: [
    MilestoneService,
    MilestoneTemplateService,
    MilestoneTemplateApplicationService,
    MilestoneCacheService,
    MilestoneCacheInvalidationService,
    MilestoneAnalyticsService,
    SupervisorReportingService,
    SupervisorAvailabilityService,
    SupervisorAIInteractionService,
    SupervisorCommunicationService,
    MilestoneQueryOptimizationService,
  ],
})
export class MilestoneModule { }

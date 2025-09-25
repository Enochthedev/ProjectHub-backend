import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import {
  Milestone,
  MilestoneNote,
  MilestoneReminder,
  MilestoneTemplate,
  User,
  Project,
} from '@/entities';
import { MilestoneTimelineVisualizerService } from './milestone-timeline-visualizer.service';
import { ReminderTestingService } from './reminder-testing.service';
import { ProgressCalculationValidatorService } from './progress-calculation-validator.service';
import { MilestoneDataCleanupService } from './milestone-data-cleanup.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([
      Milestone,
      MilestoneNote,
      MilestoneReminder,
      MilestoneTemplate,
      User,
      Project,
    ]),
  ],
  providers: [
    MilestoneTimelineVisualizerService,
    ReminderTestingService,
    ProgressCalculationValidatorService,
    MilestoneDataCleanupService,
  ],
  exports: [
    MilestoneTimelineVisualizerService,
    ReminderTestingService,
    ProgressCalculationValidatorService,
    MilestoneDataCleanupService,
  ],
})
export class MilestoneDevUtilsModule {}

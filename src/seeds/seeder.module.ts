import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import {
  User,
  StudentProfile,
  SupervisorProfile,
  Project,
  ProjectBookmark,
  ProjectView,
  BookmarkCategory,
  MilestoneTemplate,
  Milestone,
  MilestoneNote,
  MilestoneReminder,
  KnowledgeBaseEntry,
  ResponseTemplate,
} from '@/entities';
import { SeederService } from './seeder.service';
import { MilestoneTemplateSeederService } from './milestone-template-seeder.service';
import { MilestoneSampleDataSeederService } from './milestone-sample-data-seeder.service';
import { MilestoneDataGeneratorService } from './milestone-data-generator.service';
import { AIAssistantKnowledgeSeederService } from './ai-assistant-knowledge-seeder.service';
import { KnowledgeContentValidatorService } from '../utils/knowledge-content-validator.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([
      User,
      StudentProfile,
      SupervisorProfile,
      Project,
      ProjectBookmark,
      ProjectView,
      BookmarkCategory,
      MilestoneTemplate,
      Milestone,
      MilestoneNote,
      MilestoneReminder,
      KnowledgeBaseEntry,
      ResponseTemplate,
    ]),
  ],
  providers: [
    SeederService,
    MilestoneTemplateSeederService,
    MilestoneSampleDataSeederService,
    MilestoneDataGeneratorService,
    AIAssistantKnowledgeSeederService,
    KnowledgeContentValidatorService,
  ],
  exports: [
    SeederService,
    MilestoneTemplateSeederService,
    MilestoneSampleDataSeederService,
    MilestoneDataGeneratorService,
    AIAssistantKnowledgeSeederService,
  ],
})
export class SeederModule {}

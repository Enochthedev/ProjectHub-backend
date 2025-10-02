import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import databaseConfig from '../config/database.config';
import jwtConfig from '../config/jwt.config';
import emailConfig from '../config/email.config';
import huggingFaceConfig from '../config/hugging-face.config';
import { validate } from '../config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [databaseConfig, jwtConfig, emailConfig, huggingFaceConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        if (!dbConfig) {
          throw new Error('Database configuration not found');
        }
        return dbConfig;
      },
      inject: [ConfigService],
    }),
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
export class SeederModule { }

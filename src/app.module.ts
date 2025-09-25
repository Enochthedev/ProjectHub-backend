import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { ProjectModule } from './modules/project.module';
import { BookmarkModule } from './modules/bookmark.module';
import { RecommendationModule } from './modules/recommendation.module';
import { MilestoneModule } from './modules/milestone.module';
import { AIAssistantModule } from './modules/ai-assistant.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { validate } from './config/env.validation';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import emailConfig from './config/email.config';
import huggingFaceConfig from './config/hugging-face.config';

@Module({
  imports: [
    // Environment configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [databaseConfig, jwtConfig, emailConfig, huggingFaceConfig],
    }),

    // Database configuration
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

    // Rate limiting configuration
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: (configService.get('THROTTLE_TTL') || 60) * 1000, // Convert to milliseconds
          limit: configService.get('THROTTLE_LIMIT') || 10,
        },
      ],
      inject: [ConfigService],
    }),

    // Common module (shared services)
    CommonModule,

    // Authentication module
    AuthModule,

    // Users module
    UsersModule,

    // Health and monitoring module
    HealthModule,

    // Project and search module
    ProjectModule,

    // Bookmark module
    BookmarkModule,

    // AI Recommendations module
    RecommendationModule,

    // Milestone tracking module
    MilestoneModule,

    // AI Assistant module
    AIAssistantModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*'); // Apply to all routes
  }
}

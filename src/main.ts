import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters';
import { CustomValidationPipe } from './common/pipes/validation.pipe';
import { getSecurityConfig } from './config/security.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable dependency injection for class-validator
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  const configService = app.get(ConfigService);
  const securityConfig = getSecurityConfig(configService);

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: [
            "'self'",
            configService.get<string>('FRONTEND_URL', 'http://localhost:3000'),
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Enhanced CORS configuration
  app.enableCors(securityConfig.cors);

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe with custom error formatting
  app.useGlobalPipes(new CustomValidationPipe());

  // Swagger/OpenAPI configuration
  const config = new DocumentBuilder()
    .setTitle('FYP Platform API')
    .setDescription(
      'Final Year Project Selection & Guidance Platform API Documentation\n\n' +
      'This API provides comprehensive functionality for managing Final Year Projects including:\n' +
      '- Project repository with advanced search and filtering\n' +
      '- User authentication and profile management\n' +
      '- AI-powered Q&A assistant for academic guidance\n' +
      '- Intelligent recommendations and milestone tracking\n' +
      '- Bookmark and favorites system\n' +
      '- Administrative project approval workflow\n' +
      '- Analytics and reporting capabilities\n\n' +
      'All endpoints requiring authentication use JWT Bearer tokens.',
    )
    .setVersion('1.2.0')
    .setContact(
      'FYP Platform Support',
      'https://fyp-platform.example.com/support',
      'support@fyp-platform.example.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3001', 'Development Server')
    .addServer('https://api.fyp-platform.example.com', 'Production Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token (without "Bearer " prefix)',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Users', 'User profile management endpoints')
    .addTag('Admin', 'Administrative endpoints for user management')
    .addTag('projects', 'Project search, browsing, and discovery endpoints')
    .addTag(
      'project-management',
      'Project creation and management for supervisors',
    )
    .addTag('admin-projects', 'Administrative project approval and management')
    .addTag('bookmarks', 'Student bookmark and favorites management')
    .addTag(
      'AI Assistant',
      'Intelligent Q&A assistant for FYP guidance and support',
    )
    .addTag(
      'AI Assistant - Conversations',
      'Conversation management and message history',
    )
    .addTag(
      'AI Assistant - Knowledge Base',
      'Knowledge base search and content management',
    )
    .addTag('AI Assistant - Monitoring', 'Supervisor monitoring and analytics')
    .addTag(
      'AI Assistant - Admin',
      'Administrative knowledge base and template management',
    )
    .addTag('Milestones', 'Project milestone tracking and management')
    .addTag('Recommendations', 'AI-powered project recommendations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'FYP Platform API Documentation',
  });

  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(
    `API Documentation available at: http://localhost:${port}/api/docs`,
  );
  logger.log(
    `Environment: ${configService.get<string>('NODE_ENV', 'development')}`,
  );
}
void bootstrap();

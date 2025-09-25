import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
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
} from '@/entities';
import { TestDataUtil } from '../utils/test-data.util';
import { Repository } from 'typeorm';

class PerformanceDataGeneratorModule {
  static imports = [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [
          User,
          StudentProfile,
          SupervisorProfile,
          Project,
          ProjectBookmark,
          ProjectView,
          BookmarkCategory,
        ],
        synchronize: false,
        logging: false,
      }),
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
    ]),
  ];
}

async function generatePerformanceData() {
  const logger = new Logger('PerformanceDataGenerator');

  try {
    const app = await NestFactory.create(PerformanceDataGeneratorModule);

    // Get repositories
    const userRepository = app.get<Repository<User>>('UserRepository');
    const studentProfileRepository = app.get<Repository<StudentProfile>>(
      'StudentProfileRepository',
    );
    const supervisorProfileRepository = app.get<Repository<SupervisorProfile>>(
      'SupervisorProfileRepository',
    );
    const projectRepository = app.get<Repository<Project>>('ProjectRepository');
    const projectBookmarkRepository = app.get<Repository<ProjectBookmark>>(
      'ProjectBookmarkRepository',
    );
    const projectViewRepository = app.get<Repository<ProjectView>>(
      'ProjectViewRepository',
    );
    const bookmarkCategoryRepository = app.get<Repository<BookmarkCategory>>(
      'BookmarkCategoryRepository',
    );
    const dataSource = app.get('DataSource');

    const testDataUtil = new TestDataUtil(
      dataSource,
      userRepository,
      studentProfileRepository,
      supervisorProfileRepository,
      projectRepository,
      projectBookmarkRepository,
      projectViewRepository,
      bookmarkCategoryRepository,
    );

    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'small':
        logger.log('Generating small dataset for basic performance testing...');
        await testDataUtil.seedPerformanceTestData({
          projectCount: 100,
          userCount: 50,
          viewsPerProject: 20,
          bookmarksPerUser: 5,
        });
        logger.log('Small dataset generated successfully');
        break;

      case 'medium':
        logger.log(
          'Generating medium dataset for moderate performance testing...',
        );
        await testDataUtil.seedPerformanceTestData({
          projectCount: 500,
          userCount: 200,
          viewsPerProject: 50,
          bookmarksPerUser: 10,
        });
        logger.log('Medium dataset generated successfully');
        break;

      case 'large':
        logger.log('Generating large dataset for stress testing...');
        await testDataUtil.seedPerformanceTestData({
          projectCount: 2000,
          userCount: 500,
          viewsPerProject: 100,
          bookmarksPerUser: 15,
        });
        logger.log('Large dataset generated successfully');
        break;

      case 'xlarge':
        logger.log(
          'Generating extra large dataset for extreme stress testing...',
        );
        await testDataUtil.seedPerformanceTestData({
          projectCount: 5000,
          userCount: 1000,
          viewsPerProject: 200,
          bookmarksPerUser: 20,
        });
        logger.log('Extra large dataset generated successfully');
        break;

      case 'custom': {
        const projectCount = parseInt(args[1]) || 1000;
        const userCount = parseInt(args[2]) || 100;
        const viewsPerProject = parseInt(args[3]) || 50;
        const bookmarksPerUser = parseInt(args[4]) || 10;

        logger.log(
          `Generating custom dataset: ${projectCount} projects, ${userCount} users...`,
        );
        await testDataUtil.seedPerformanceTestData({
          projectCount,
          userCount,
          viewsPerProject,
          bookmarksPerUser,
        });
        logger.log('Custom dataset generated successfully');
        break;
      }

      case 'cleanup':
        logger.log('Cleaning up all test data...');
        await testDataUtil.cleanupAllTestData();
        logger.log('Cleanup completed successfully');
        break;

      case 'stats':
        logger.log('Getting database statistics...');
        const stats = await testDataUtil.getDatabaseStats();
        logger.log('Database Statistics:');
        logger.log(`  Users: ${stats.users}`);
        logger.log(`  Projects: ${stats.projects}`);
        logger.log(`  Bookmarks: ${stats.bookmarks}`);
        logger.log(`  Views: ${stats.views}`);
        logger.log(`  Categories: ${stats.categories}`);
        break;

      case 'reset':
        logger.log('Resetting database to clean state...');
        await testDataUtil.resetToCleanState();
        logger.log('Database reset completed successfully');
        break;

      default:
        logger.error('Invalid command. Available commands:');
        logger.log(
          '  small    - Generate small dataset (100 projects, 50 users)',
        );
        logger.log(
          '  medium   - Generate medium dataset (500 projects, 200 users)',
        );
        logger.log(
          '  large    - Generate large dataset (2000 projects, 500 users)',
        );
        logger.log(
          '  xlarge   - Generate extra large dataset (5000 projects, 1000 users)',
        );
        logger.log(
          '  custom <projects> <users> <views> <bookmarks> - Generate custom dataset',
        );
        logger.log('  cleanup  - Remove all test data');
        logger.log('  stats    - Show database statistics');
        logger.log('  reset    - Reset database to clean state');
        logger.log('');
        logger.log('Examples:');
        logger.log('  npm run test:data small');
        logger.log('  npm run test:data custom 1000 100 50 10');
        logger.log('  npm run test:data cleanup');
        process.exit(1);
    }

    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('Performance data generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  void generatePerformanceData();
}

export { generatePerformanceData };

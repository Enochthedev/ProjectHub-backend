import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository, DataSource } from 'typeorm';
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

async function runPerformanceTests() {
  const logger = new Logger('PerformanceTest');

  try {
    // Create a minimal NestJS application for performance testing
    const app = await NestFactory.create({
      module: class PerformanceTestModule {
        static imports = [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env.performance', // Use separate performance test environment
          }),
          TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
              type: 'postgres',
              host: configService.get('DATABASE_HOST', 'localhost'),
              port: configService.get('DATABASE_PORT', 5432),
              username: configService.get('DATABASE_USERNAME'),
              password: configService.get('DATABASE_PASSWORD'),
              database: configService.get('DATABASE_NAME', 'fyp_performance'),
              entities: [
                User,
                StudentProfile,
                SupervisorProfile,
                Project,
                ProjectBookmark,
                ProjectView,
                BookmarkCategory,
              ],
              synchronize: true, // Auto-create tables
              logging: false,
            }),
            inject: [ConfigService],
          }),
        ];
      },
    });

    const dataSource = app.get(DataSource);

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

    // Check command line arguments
    const args = process.argv.slice(2);
    const testType = args[0] || 'realistic';

    logger.log(`Running performance test: ${testType}`);

    switch (testType) {
      case 'minimal':
        await testDataUtil.seedPerformanceTestData({
          projectCount: 50,
          userCount: 20,
          viewsPerProject: 10,
          bookmarksPerUser: 3,
        });
        await runPerformanceMetrics(testDataUtil, 'minimal');
        break;

      case 'realistic':
        await testDataUtil.seedPerformanceTestData({
          projectCount: 500,
          userCount: 100,
          viewsPerProject: 50,
          bookmarksPerUser: 8,
        });
        await runPerformanceMetrics(testDataUtil, 'realistic');
        break;

      case 'stress':
        await testDataUtil.seedPerformanceTestData({
          projectCount: 2000,
          userCount: 500,
          viewsPerProject: 100,
          bookmarksPerUser: 15,
        });
        await runPerformanceMetrics(testDataUtil, 'stress');
        break;

      case 'benchmark':
        await runBenchmarkTests(testDataUtil);
        break;

      default:
        logger.error(
          'Invalid test type. Use: minimal, realistic, stress, or benchmark',
        );
        process.exit(1);
    }

    await app.close();
    logger.log('Performance test completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Performance test failed:', error);
    process.exit(1);
  }
}

async function runBenchmarkTests(testDataUtil: TestDataUtil) {
  const logger = new Logger('Benchmark');

  const testCases = [
    { projectCount: 50, userCount: 20, name: 'Small' },
    { projectCount: 200, userCount: 50, name: 'Medium' },
    { projectCount: 500, userCount: 100, name: 'Large' },
    { projectCount: 1000, userCount: 200, name: 'XLarge' },
    { projectCount: 2000, userCount: 500, name: 'Stress' },
  ];

  logger.log('Running benchmark tests...');

  for (const testCase of testCases) {
    logger.log(
      `\nBenchmarking ${testCase.name}: ${testCase.projectCount} projects, ${testCase.userCount} users`,
    );

    const startTime = Date.now();

    await testDataUtil.cleanupAllTestData();

    const seedStartTime = Date.now();
    await testDataUtil.seedPerformanceTestData({
      projectCount: testCase.projectCount,
      userCount: testCase.userCount,
      viewsPerProject: 50,
      bookmarksPerUser: 10,
    });
    const seedEndTime = Date.now();

    const stats = await testDataUtil.getDatabaseStats();
    const totalTime = Date.now() - startTime;
    const seedTime = seedEndTime - seedStartTime;

    const metrics = {
      testCase: testCase.name,
      totalTime: `${totalTime}ms`,
      seedTime: `${seedTime}ms`,
      recordsPerSecond: Math.round(
        (stats.users + stats.projects + stats.bookmarks + stats.views) /
          (seedTime / 1000),
      ),
      finalStats: stats,
    };

    logger.log(`Results: ${JSON.stringify(metrics, null, 2)}`);
  }
}

async function runPerformanceMetrics(
  testDataUtil: TestDataUtil,
  testType: string,
) {
  const logger = new Logger('PerformanceMetrics');

  logger.log(`\nGathering performance metrics for ${testType} test...`);

  const stats = await testDataUtil.getDatabaseStats();

  logger.log('Database Statistics:');
  logger.log(`  Users: ${stats.users}`);
  logger.log(`  Projects: ${stats.projects}`);
  logger.log(`  Bookmarks: ${stats.bookmarks}`);
  logger.log(`  Views: ${stats.views}`);
  logger.log(`  Categories: ${stats.categories}`);
  logger.log(
    `  Total Records: ${stats.users + stats.projects + stats.bookmarks + stats.views + stats.categories}`,
  );
}

// Run the performance tests
void runPerformanceTests();

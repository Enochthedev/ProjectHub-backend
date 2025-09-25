import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SeederModule } from './seeder.module';
import { SeederService } from './seeder.service';

async function bootstrap() {
  const logger = new Logger('DatabaseSeeder');

  try {
    // Create a NestJS application context for seeding
    const app = await NestFactory.createApplicationContext(SeederModule);

    const seederService = app.get(SeederService);

    // Check command line arguments
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'seed':
        logger.log('Starting database seeding...');
        await seederService.seedAll();
        logger.log('Database seeding completed successfully');
        break;

      case 'rollback':
        logger.log('Starting database rollback...');
        await seederService.rollback();
        logger.log('Database rollback completed successfully');
        break;

      case 'projects':
        logger.log('Starting project-only seeding...');
        await seederService.seedProjectsOnly();
        logger.log('Project-only seeding completed successfully');
        break;

      case 'cleanup':
        logger.log('Starting test data cleanup...');
        await seederService.cleanupTestData();
        logger.log('Test data cleanup completed successfully');
        break;

      default:
        logger.error(
          'Invalid command. Use "seed", "rollback", "projects", or "cleanup"',
        );
        logger.log('Commands:');
        logger.log(
          '  seed     - Seed all data (users, projects, bookmarks, views)',
        );
        logger.log('  rollback - Remove all seeded data');
        logger.log('  projects - Seed only projects (requires existing users)');
        logger.log('  cleanup  - Remove only project-related test data');
        process.exit(1);
    }

    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('Seeding operation failed:', error);
    process.exit(1);
  }
}

bootstrap();

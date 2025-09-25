#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SeederModule } from './seeder.module';
import { MilestoneTemplateSeederService } from './milestone-template-seeder.service';
import { MilestoneSampleDataSeederService } from './milestone-sample-data-seeder.service';
import { MilestoneDataGeneratorService } from './milestone-data-generator.service';

async function bootstrap() {
  const logger = new Logger('MilestoneSeeder');

  try {
    const app = await NestFactory.createApplicationContext(SeederModule);

    const templateSeeder = app.get(MilestoneTemplateSeederService);
    const sampleDataSeeder = app.get(MilestoneSampleDataSeederService);
    const dataGenerator = app.get(MilestoneDataGeneratorService);

    const command = process.argv[2];

    switch (command) {
      case 'templates':
        logger.log('Seeding milestone templates...');
        await templateSeeder.seedMilestoneTemplates();
        break;

      case 'sample-data':
        logger.log('Seeding sample milestone data...');
        await sampleDataSeeder.seedSampleMilestones();
        await sampleDataSeeder.seedBlockedMilestoneExample();
        await sampleDataSeeder.seedOverdueMilestoneExample();
        break;

      case 'load-test':
        logger.log('Generating load test data...');
        await dataGenerator.generateLoadTestScenario();
        break;

      case 'stress-test':
        logger.log('Generating stress test data...');
        await dataGenerator.generateStressTestScenario();
        break;

      case 'cleanup':
        logger.log('Cleaning up test data...');
        await dataGenerator.cleanupTestData();
        break;

      case 'all':
        logger.log('Running complete milestone seeding...');
        await templateSeeder.seedMilestoneTemplates();
        await sampleDataSeeder.seedSampleMilestones();
        await sampleDataSeeder.seedBlockedMilestoneExample();
        await sampleDataSeeder.seedOverdueMilestoneExample();
        break;

      default:
        logger.log('Available commands:');
        logger.log('  templates    - Seed milestone templates');
        logger.log('  sample-data  - Seed sample milestone data');
        logger.log('  load-test    - Generate load test data');
        logger.log('  stress-test  - Generate stress test data');
        logger.log('  cleanup      - Clean up test data');
        logger.log('  all          - Run complete seeding');
        process.exit(1);
    }

    logger.log('Milestone seeding completed successfully');
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('Milestone seeding failed:', error);
    process.exit(1);
  }
}

bootstrap();

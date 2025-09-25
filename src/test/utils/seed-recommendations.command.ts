#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { RecommendationSeederService } from './recommendation-seeder.service';

interface SeedOptions {
  size?: 'small' | 'medium' | 'large';
  scenarios?: boolean;
  diverse?: boolean;
  performance?: boolean;
  clean?: boolean;
}

async function parseArgs(): Promise<SeedOptions> {
  const args = process.argv.slice(2);
  const options: SeedOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--size':
        options.size = args[++i] as 'small' | 'medium' | 'large';
        break;
      case '--scenarios':
        options.scenarios = true;
        break;
      case '--diverse':
        options.diverse = true;
        break;
      case '--performance':
        options.performance = true;
        break;
      case '--clean':
        options.clean = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Recommendation Test Data Seeder

Usage: npm run seed:recommendations [options]

Options:
  --size <size>     Size of performance data (small|medium|large)
  --scenarios       Include realistic test scenarios
  --diverse         Include diverse student and project profiles
  --performance     Include performance test data
  --clean           Clean existing test data only
  --help           Show this help message

Examples:
  npm run seed:recommendations --scenarios --diverse
  npm run seed:recommendations --performance --size medium
  npm run seed:recommendations --clean
  npm run seed:recommendations --scenarios --diverse --performance --size small
`);
}

async function main(): Promise<void> {
  try {
    const options = await parseArgs();

    console.log('🚀 Starting Recommendation Test Data Seeder...');
    console.log('Options:', options);

    const app = await NestFactory.createApplicationContext(AppModule);
    const seederService = app.get(RecommendationSeederService);

    if (options.clean) {
      console.log('🧹 Cleaning existing test data...');
      await seederService['cleanupExistingTestData']();
      console.log('✅ Test data cleaned successfully!');
      await app.close();
      return;
    }

    const seedOptions = {
      includeRealisticScenarios: options.scenarios || false,
      includeDiverseProfiles: options.diverse || false,
      includePerformanceData: options.performance || false,
      performanceDataSize: options.size || 'medium',
    };

    console.log('📊 Seeding recommendation test data...');
    const startTime = Date.now();

    await seederService.seedRecommendationData(seedOptions);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(
      `✅ Recommendation test data seeded successfully in ${duration.toFixed(2)}s!`,
    );

    await app.close();
  } catch (error) {
    console.error('❌ Error seeding recommendation test data:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}

export { main as seedRecommendations };

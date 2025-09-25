#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MilestoneDevUtilsModule } from './milestone-dev-utils.module';
import { MilestoneTimelineVisualizerService } from './milestone-timeline-visualizer.service';
import { ReminderTestingService } from './reminder-testing.service';
import { ProgressCalculationValidatorService } from './progress-calculation-validator.service';
import { MilestoneDataCleanupService } from './milestone-data-cleanup.service';

async function bootstrap() {
  const logger = new Logger('MilestoneDevCLI');

  try {
    const app = await NestFactory.createApplicationContext(
      MilestoneDevUtilsModule,
    );

    const timelineVisualizer = app.get(MilestoneTimelineVisualizerService);
    const reminderTester = app.get(ReminderTestingService);
    const progressValidator = app.get(ProgressCalculationValidatorService);
    const dataCleanup = app.get(MilestoneDataCleanupService);

    const command = process.argv[2];
    const subCommand = process.argv[3];
    const options = parseCommandLineOptions(process.argv.slice(4));

    switch (command) {
      case 'visualize':
        await handleVisualizationCommands(
          timelineVisualizer,
          subCommand,
          options,
          logger,
        );
        break;

      case 'test':
        await handleTestingCommands(
          reminderTester,
          subCommand,
          options,
          logger,
        );
        break;

      case 'validate':
        await handleValidationCommands(
          progressValidator,
          subCommand,
          options,
          logger,
        );
        break;

      case 'cleanup':
        await handleCleanupCommands(dataCleanup, subCommand, options, logger);
        break;

      case 'help':
      default:
        showHelp();
        break;
    }

    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('CLI execution failed:', error);
    process.exit(1);
  }
}

async function handleVisualizationCommands(
  visualizer: MilestoneTimelineVisualizerService,
  subCommand: string,
  options: any,
  logger: Logger,
) {
  switch (subCommand) {
    case 'timeline':
      logger.log('Generating timeline visualization...');
      const visualization =
        await visualizer.generateTimelineVisualization(options);
      console.log(visualization.timeline);
      console.log('\nSummary:', visualization.summary);
      break;

    case 'student':
      if (!options.studentId) {
        logger.error('Student ID is required for student visualization');
        return;
      }
      logger.log(
        `Generating student progress report for: ${options.studentId}`,
      );
      const report = await visualizer.generateStudentProgressReport(
        options.studentId,
      );
      console.log(report);
      break;

    case 'export':
      if (!options.file) {
        logger.error('Output file path is required for export');
        return;
      }
      logger.log(`Exporting timeline to: ${options.file}`);
      await visualizer.exportTimelineToFile(options, options.file);
      break;

    case 'debug':
      logger.log('Running milestone debugging analysis...');
      const issues = await visualizer.debugMilestoneIssues();
      console.log('Milestone Issues:');
      issues.forEach((issue) => console.log(`• ${issue}`));
      break;

    default:
      logger.error(`Unknown visualization command: ${subCommand}`);
      break;
  }
}

async function handleTestingCommands(
  tester: ReminderTestingService,
  subCommand: string,
  options: any,
  logger: Logger,
) {
  switch (subCommand) {
    case 'reminders':
      logger.log('Running reminder test suite...');
      const testSuite = await tester.runReminderTestSuite();
      console.log(
        `Test Results: ${testSuite.summary.passed}/${testSuite.summary.totalTests} passed`,
      );
      testSuite.results.forEach((result) => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.message}`);
      });
      break;

    case 'report':
      logger.log('Generating reminder test report...');
      const report = await tester.generateReminderTestReport();
      if (options.file) {
        const fs = require('fs');
        fs.writeFileSync(options.file, report);
        logger.log(`Report saved to: ${options.file}`);
      } else {
        console.log(report);
      }
      break;

    case 'cleanup':
      logger.log('Cleaning up test data...');
      await tester.cleanupTestData();
      logger.log('Test data cleanup completed');
      break;

    default:
      logger.error(`Unknown testing command: ${subCommand}`);
      break;
  }
}

async function handleValidationCommands(
  validator: ProgressCalculationValidatorService,
  subCommand: string,
  options: any,
  logger: Logger,
) {
  switch (subCommand) {
    case 'progress':
      if (!options.studentId) {
        logger.error('Student ID is required for progress validation');
        return;
      }
      logger.log(
        `Validating progress calculations for student: ${options.studentId}`,
      );
      const validation = await validator.validateStudentProgress(
        options.studentId,
      );
      console.log(
        `Validation completed with ${validation.validationResults.length} checks`,
      );

      const failedValidations = validation.validationResults.filter(
        (v) => !v.isValid,
      );
      if (failedValidations.length > 0) {
        console.log(`❌ ${failedValidations.length} validation(s) failed`);
        failedValidations.forEach((v) => {
          console.log(`  • ${v.issues.join(', ')}`);
        });
      } else {
        console.log('✅ All validations passed');
      }
      break;

    case 'report':
      if (!options.studentId) {
        logger.error('Student ID is required for validation report');
        return;
      }
      logger.log(
        `Generating validation report for student: ${options.studentId}`,
      );
      const report = await validator.generateProgressValidationReport(
        options.studentId,
      );

      if (options.file) {
        const fs = require('fs');
        fs.writeFileSync(options.file, report);
        logger.log(`Report saved to: ${options.file}`);
      } else {
        console.log(report);
      }
      break;

    default:
      logger.error(`Unknown validation command: ${subCommand}`);
      break;
  }
}

async function handleCleanupCommands(
  cleanup: MilestoneDataCleanupService,
  subCommand: string,
  options: any,
  logger: Logger,
) {
  switch (subCommand) {
    case 'preview':
      logger.log('Generating cleanup preview...');
      const report = await cleanup.generateCleanupReport(options);
      console.log(report);
      break;

    case 'execute':
      logger.log('Executing data cleanup...');
      const result = await cleanup.cleanupMilestoneData({
        ...options,
        dryRun: false,
      });
      console.log('Cleanup Results:');
      console.log(`• Milestones deleted: ${result.milestonesDeleted}`);
      console.log(`• Notes deleted: ${result.notesDeleted}`);
      console.log(`• Reminders deleted: ${result.remindersDeleted}`);
      console.log(`• Templates deleted: ${result.templatesDeleted}`);
      console.log(`• Users deleted: ${result.usersDeleted}`);
      console.log(`• Execution time: ${result.executionTime}ms`);

      if (result.errors.length > 0) {
        console.log('Errors:');
        result.errors.forEach((error) => console.log(`  ❌ ${error}`));
      }
      break;

    case 'reset':
      logger.log('Resetting milestone system...');
      const resetResult = await cleanup.resetMilestoneSystem(options);
      console.log('Reset completed:', resetResult);
      break;

    case 'integrity':
      logger.log('Validating data integrity...');
      const issues = await cleanup.validateDataIntegrity();
      console.log('Data Integrity Issues:');
      issues.forEach((issue) => console.log(`• ${issue}`));
      break;

    case 'optimize':
      logger.log('Optimizing database...');
      await cleanup.optimizeMilestoneDatabase();
      logger.log('Database optimization completed');
      break;

    default:
      logger.error(`Unknown cleanup command: ${subCommand}`);
      break;
  }
}

function parseCommandLineOptions(args: string[]): any {
  const options: any = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];

    if (key && value) {
      // Convert string values to appropriate types
      if (value === 'true') {
        options[key] = true;
      } else if (value === 'false') {
        options[key] = false;
      } else if (!isNaN(Number(value))) {
        options[key] = Number(value);
      } else {
        options[key] = value;
      }
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Milestone Development Utilities CLI

Usage: npm run milestone-dev-cli <command> <subcommand> [options]

Commands:

  visualize timeline [options]     Generate timeline visualization
    --studentId <id>              Filter by student ID
    --projectId <id>              Filter by project ID
    --includeCompleted <bool>     Include completed milestones

  visualize student --studentId <id>  Generate student progress report

  visualize export --file <path> [options]  Export timeline to file

  visualize debug                  Debug milestone issues

  test reminders                   Run reminder system tests

  test report [--file <path>]      Generate test report

  test cleanup                     Clean up test data

  validate progress --studentId <id>  Validate progress calculations

  validate report --studentId <id> [--file <path>]  Generate validation report

  cleanup preview [options]        Preview cleanup operations
    --olderThanDays <days>        Clean items older than X days
    --includeTestData <bool>      Include test data in cleanup
    --includeCompleted <bool>     Include completed milestones

  cleanup execute [options]        Execute cleanup operations

  cleanup reset [options]          Reset milestone system
    --resetMilestones <bool>      Reset all milestones
    --resetTemplates <bool>       Reset all templates
    --resetTestUsers <bool>       Reset test users

  cleanup integrity               Validate data integrity

  cleanup optimize                Optimize database

Examples:

  npm run milestone-dev-cli visualize timeline --studentId abc123 --includeCompleted true
  npm run milestone-dev-cli test reminders
  npm run milestone-dev-cli validate progress --studentId abc123
  npm run milestone-dev-cli cleanup preview --olderThanDays 30 --includeTestData true
  npm run milestone-dev-cli cleanup execute --includeTestData true
`);
}

bootstrap();

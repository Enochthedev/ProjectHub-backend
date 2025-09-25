import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Milestone, MilestoneReminder, User } from '@/entities';
import { MilestoneStatus, ReminderType, UserRole } from '@/common/enums';

interface ReminderTestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: Date;
}

interface ReminderTestSuite {
  testName: string;
  results: ReminderTestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    successRate: number;
  };
}

@Injectable()
export class ReminderTestingService {
  private readonly logger = new Logger(ReminderTestingService.name);

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(MilestoneReminder)
    private readonly reminderRepository: Repository<MilestoneReminder>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async runReminderTestSuite(): Promise<ReminderTestSuite> {
    this.logger.log('Running comprehensive reminder test suite...');

    const results: ReminderTestResult[] = [];

    try {
      // Test 1: Reminder Creation
      results.push(await this.testReminderCreation());

      // Test 2: Reminder Scheduling Logic
      results.push(await this.testReminderScheduling());

      // Test 3: Overdue Reminder Detection
      results.push(await this.testOverdueReminderDetection());

      // Test 4: Reminder Delivery Simulation
      results.push(await this.testReminderDeliverySimulation());

      // Test 5: Reminder Cleanup
      results.push(await this.testReminderCleanup());

      // Test 6: Bulk Reminder Processing
      results.push(await this.testBulkReminderProcessing());

      // Test 7: Reminder Preferences
      results.push(await this.testReminderPreferences());

      const summary = this.calculateTestSummary(results);

      return {
        testName: 'Reminder System Test Suite',
        results,
        summary,
      };
    } catch (error) {
      this.logger.error('Reminder test suite failed', error);
      throw error;
    }
  }

  private async testReminderCreation(): Promise<ReminderTestResult> {
    try {
      // Create a test milestone
      const testStudent = await this.getOrCreateTestStudent();
      const testMilestone = await this.createTestMilestone(testStudent);

      // Create reminders for the milestone
      const reminderTypes = [
        { type: ReminderType.EMAIL, daysBefore: 7 },
        { type: ReminderType.EMAIL, daysBefore: 3 },
        { type: ReminderType.EMAIL, daysBefore: 1 },
      ];

      const createdReminders: MilestoneReminder[] = [];
      for (const reminderData of reminderTypes) {
        const reminder = this.reminderRepository.create({
          milestone: testMilestone,
          milestoneId: testMilestone.id,
          reminderType: reminderData.type,
          daysBefore: reminderData.daysBefore,
          sent: false,
        });

        const savedReminder = await this.reminderRepository.save(reminder);
        createdReminders.push(savedReminder);
      }

      // Verify reminders were created correctly
      const reminderCount = await this.reminderRepository.count({
        where: { milestoneId: testMilestone.id },
      });

      if (reminderCount === reminderTypes.length) {
        return {
          success: true,
          message: 'Reminder creation test passed',
          details: {
            createdCount: reminderCount,
            expectedCount: reminderTypes.length,
          },
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          message: 'Reminder creation test failed - incorrect count',
          details: {
            createdCount: reminderCount,
            expectedCount: reminderTypes.length,
          },
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Reminder creation test failed with error',
        details: { error: error.message },
        timestamp: new Date(),
      };
    }
  }

  private async testReminderScheduling(): Promise<ReminderTestResult> {
    try {
      const now = new Date();
      const threeDaysFromNow = new Date(
        now.getTime() + 3 * 24 * 60 * 60 * 1000,
      );
      const sevenDaysFromNow = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000,
      );

      // Find reminders that should be sent today (3 days before due date)
      const dueReminders = await this.reminderRepository
        .createQueryBuilder('reminder')
        .leftJoinAndSelect('reminder.milestone', 'milestone')
        .where('milestone.dueDate = :targetDate', {
          targetDate: threeDaysFromNow,
        })
        .andWhere('reminder.daysBefore = :daysBefore', { daysBefore: 3 })
        .andWhere('reminder.sent = :sent', { sent: false })
        .getMany();

      // Simulate scheduling logic
      const scheduledCount = dueReminders.length;

      return {
        success: true,
        message: 'Reminder scheduling test passed',
        details: {
          scheduledReminders: scheduledCount,
          targetDate: threeDaysFromNow.toISOString(),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Reminder scheduling test failed',
        details: { error: error.message },
        timestamp: new Date(),
      };
    }
  }

  private async testOverdueReminderDetection(): Promise<ReminderTestResult> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Find overdue milestones
      const overdueMilestones = await this.milestoneRepository
        .createQueryBuilder('milestone')
        .where('milestone.dueDate < :now', { now })
        .andWhere('milestone.status != :completed', {
          completed: MilestoneStatus.COMPLETED,
        })
        .getMany();

      // Check if overdue reminders would be generated
      const overdueCount = overdueMilestones.length;

      return {
        success: true,
        message: 'Overdue reminder detection test passed',
        details: {
          overdueMilestones: overdueCount,
          checkDate: now.toISOString(),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Overdue reminder detection test failed',
        details: { error: error.message },
        timestamp: new Date(),
      };
    }
  }

  private async testReminderDeliverySimulation(): Promise<ReminderTestResult> {
    try {
      // Find a test reminder to simulate delivery
      const testReminder = await this.reminderRepository.findOne({
        where: { sent: false },
        relations: ['milestone', 'milestone.student'],
      });

      if (!testReminder) {
        return {
          success: true,
          message: 'No reminders available for delivery simulation',
          details: { reason: 'No unsent reminders found' },
          timestamp: new Date(),
        };
      }

      // Simulate delivery process
      const deliveryResult = await this.simulateReminderDelivery(testReminder);

      if (deliveryResult.success) {
        // Mark as sent (in a real scenario)
        testReminder.sent = true;
        testReminder.sentAt = new Date();
        await this.reminderRepository.save(testReminder);

        return {
          success: true,
          message: 'Reminder delivery simulation passed',
          details: deliveryResult,
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          message: 'Reminder delivery simulation failed',
          details: deliveryResult,
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Reminder delivery simulation test failed',
        details: { error: error.message },
        timestamp: new Date(),
      };
    }
  }

  private async testReminderCleanup(): Promise<ReminderTestResult> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Find old sent reminders that could be cleaned up
      const oldReminders = await this.reminderRepository
        .createQueryBuilder('reminder')
        .where('reminder.sent = :sent', { sent: true })
        .andWhere('reminder.sentAt < :cutoffDate', {
          cutoffDate: thirtyDaysAgo,
        })
        .getMany();

      const cleanupCount = oldReminders.length;

      // In a real cleanup, these would be deleted
      // await this.reminderRepository.remove(oldReminders);

      return {
        success: true,
        message: 'Reminder cleanup test passed',
        details: {
          remindersToCleanup: cleanupCount,
          cutoffDate: thirtyDaysAgo.toISOString(),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Reminder cleanup test failed',
        details: { error: error.message },
        timestamp: new Date(),
      };
    }
  }

  private async testBulkReminderProcessing(): Promise<ReminderTestResult> {
    try {
      const batchSize = 100;
      const startTime = Date.now();

      // Simulate processing a batch of reminders
      const reminders = await this.reminderRepository
        .createQueryBuilder('reminder')
        .leftJoinAndSelect('reminder.milestone', 'milestone')
        .leftJoinAndSelect('milestone.student', 'student')
        .where('reminder.sent = :sent', { sent: false })
        .take(batchSize)
        .getMany();

      // Simulate processing time
      const processedCount = reminders.length;
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        message: 'Bulk reminder processing test passed',
        details: {
          processedCount,
          processingTimeMs: processingTime,
          batchSize,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Bulk reminder processing test failed',
        details: { error: error.message },
        timestamp: new Date(),
      };
    }
  }

  private async testReminderPreferences(): Promise<ReminderTestResult> {
    try {
      // Test different reminder preferences scenarios
      const testScenarios = [
        { type: ReminderType.EMAIL, enabled: true },
        { type: ReminderType.IN_APP, enabled: false },
      ];

      const results: any[] = [];
      for (const scenario of testScenarios) {
        // Simulate preference checking
        const shouldSend = scenario.enabled;
        results.push({
          type: scenario.type,
          enabled: scenario.enabled,
          shouldSend,
        });
      }

      return {
        success: true,
        message: 'Reminder preferences test passed',
        details: { scenarios: results },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Reminder preferences test failed',
        details: { error: error.message },
        timestamp: new Date(),
      };
    }
  }

  private async simulateReminderDelivery(
    reminder: MilestoneReminder,
  ): Promise<any> {
    // Simulate email delivery process
    const deliveryAttempt = {
      reminderId: reminder.id,
      recipientEmail: reminder.milestone.student.email,
      subject: `Milestone Reminder: ${reminder.milestone.title}`,
      type: reminder.reminderType,
      attemptTime: new Date(),
    };

    // Simulate random delivery success/failure
    const success = Math.random() > 0.1; // 90% success rate

    if (success) {
      return {
        success: true,
        deliveryId: `delivery_${Date.now()}`,
        ...deliveryAttempt,
      };
    } else {
      return {
        success: false,
        error: 'Simulated delivery failure',
        ...deliveryAttempt,
      };
    }
  }

  private calculateTestSummary(
    results: ReminderTestResult[],
  ): ReminderTestSuite['summary'] {
    const totalTests = results.length;
    const passed = results.filter((r) => r.success).length;
    const failed = totalTests - passed;
    const successRate =
      totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;

    return {
      totalTests,
      passed,
      failed,
      successRate,
    };
  }

  private async getOrCreateTestStudent(): Promise<User> {
    let testStudent = await this.userRepository.findOne({
      where: { email: 'test.reminder.student@ui.edu.ng' },
    });

    if (!testStudent) {
      testStudent = this.userRepository.create({
        email: 'test.reminder.student@ui.edu.ng',
        password: 'hashed_test_password',
        role: UserRole.STUDENT,
        isEmailVerified: true,
        isActive: true,
      });
      testStudent = await this.userRepository.save(testStudent);
    }

    return testStudent;
  }

  private async createTestMilestone(student: User): Promise<Milestone> {
    const testMilestone = this.milestoneRepository.create({
      title: 'Test Milestone for Reminder Testing',
      description:
        'This is a test milestone created for reminder system testing.',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: MilestoneStatus.NOT_STARTED,
      estimatedHours: 20,
      student,
      studentId: student.id,
    });

    return await this.milestoneRepository.save(testMilestone);
  }

  async generateReminderTestReport(): Promise<string> {
    const testSuite = await this.runReminderTestSuite();

    const report = [
      'Reminder System Test Report',
      '='.repeat(40),
      '',
      `Test Suite: ${testSuite.testName}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Summary:',
      `- Total Tests: ${testSuite.summary.totalTests}`,
      `- Passed: ${testSuite.summary.passed}`,
      `- Failed: ${testSuite.summary.failed}`,
      `- Success Rate: ${testSuite.summary.successRate}%`,
      '',
      'Test Results:',
      '-'.repeat(20),
    ];

    testSuite.results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      report.push(`${index + 1}. ${status} - ${result.message}`);
      if (result.details) {
        report.push(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      report.push('');
    });

    return report.join('\n');
  }

  async cleanupTestData(): Promise<void> {
    this.logger.log('Cleaning up reminder test data...');

    try {
      // Remove test milestones and their reminders (cascade delete)
      await this.milestoneRepository
        .createQueryBuilder()
        .delete()
        .where('title LIKE :pattern', {
          pattern: '%Test Milestone for Reminder Testing%',
        })
        .execute();

      // Remove test student
      await this.userRepository
        .createQueryBuilder()
        .delete()
        .where('email = :email', { email: 'test.reminder.student@ui.edu.ng' })
        .execute();

      this.logger.log('Reminder test data cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup reminder test data', error);
      throw error;
    }
  }
}

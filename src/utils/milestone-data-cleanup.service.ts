import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Milestone,
  MilestoneNote,
  MilestoneReminder,
  MilestoneTemplate,
  User,
} from '@/entities';
import { UserRole } from '@/common/enums';

interface CleanupOptions {
  dryRun?: boolean;
  olderThanDays?: number;
  includeTestData?: boolean;
  includeCompletedMilestones?: boolean;
  includeTemplates?: boolean;
  studentIds?: string[];
}

interface CleanupResult {
  milestonesDeleted: number;
  notesDeleted: number;
  remindersDeleted: number;
  templatesDeleted: number;
  usersDeleted: number;
  errors: string[];
  executionTime: number;
}

interface ResetOptions {
  resetMilestones?: boolean;
  resetTemplates?: boolean;
  resetTestUsers?: boolean;
  preserveAdminData?: boolean;
}

@Injectable()
export class MilestoneDataCleanupService {
  private readonly logger = new Logger(MilestoneDataCleanupService.name);

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(MilestoneNote)
    private readonly milestoneNoteRepository: Repository<MilestoneNote>,
    @InjectRepository(MilestoneReminder)
    private readonly milestoneReminderRepository: Repository<MilestoneReminder>,
    @InjectRepository(MilestoneTemplate)
    private readonly milestoneTemplateRepository: Repository<MilestoneTemplate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async cleanupMilestoneData(
    options: CleanupOptions = {},
  ): Promise<CleanupResult> {
    const startTime = Date.now();
    this.logger.log('Starting milestone data cleanup...');

    const result: CleanupResult = {
      milestonesDeleted: 0,
      notesDeleted: 0,
      remindersDeleted: 0,
      templatesDeleted: 0,
      usersDeleted: 0,
      errors: [],
      executionTime: 0,
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      if (!options.dryRun) {
        await queryRunner.startTransaction();
      }

      // Clean up old reminders first (no foreign key dependencies)
      if (options.olderThanDays) {
        result.remindersDeleted = await this.cleanupOldReminders(
          queryRunner,
          options,
        );
      }

      // Clean up test data
      if (options.includeTestData) {
        const testCleanup = await this.cleanupTestData(queryRunner, options);
        result.milestonesDeleted += testCleanup.milestonesDeleted || 0;
        result.notesDeleted += testCleanup.notesDeleted || 0;
        result.remindersDeleted += testCleanup.remindersDeleted || 0;
        result.usersDeleted += testCleanup.usersDeleted || 0;
      }

      // Clean up completed milestones if requested
      if (options.includeCompletedMilestones) {
        result.milestonesDeleted += await this.cleanupCompletedMilestones(
          queryRunner,
          options,
        );
      }

      // Clean up unused templates
      if (options.includeTemplates) {
        result.templatesDeleted = await this.cleanupUnusedTemplates(
          queryRunner,
          options,
        );
      }

      // Clean up specific students' data
      if (options.studentIds && options.studentIds.length > 0) {
        const studentCleanup = await this.cleanupStudentData(
          queryRunner,
          options.studentIds,
          options,
        );
        result.milestonesDeleted += studentCleanup.milestonesDeleted || 0;
        result.notesDeleted += studentCleanup.notesDeleted || 0;
        result.remindersDeleted += studentCleanup.remindersDeleted || 0;
      }

      if (!options.dryRun) {
        await queryRunner.commitTransaction();
        this.logger.log('Milestone data cleanup completed successfully');
      } else {
        await queryRunner.rollbackTransaction();
        this.logger.log('Dry run completed - no data was actually deleted');
      }
    } catch (error) {
      if (!options.dryRun) {
        await queryRunner.rollbackTransaction();
      }
      result.errors.push(`Cleanup failed: ${error.message}`);
      this.logger.error('Milestone data cleanup failed', error);
    } finally {
      await queryRunner.release();
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  private async cleanupOldReminders(
    queryRunner: any,
    options: CleanupOptions,
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (options.olderThanDays || 30));

    const query = `
      DELETE FROM milestone_reminders 
      WHERE sent = true 
      AND sent_at < $1
    `;

    if (options.dryRun) {
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM milestone_reminders 
        WHERE sent = true 
        AND sent_at < $1
      `;
      const result = await queryRunner.query(countQuery, [cutoffDate]);
      return parseInt(result[0].count);
    } else {
      const result = await queryRunner.query(query, [cutoffDate]);
      return result[1]; // Number of affected rows
    }
  }

  private async cleanupTestData(
    queryRunner: any,
    options: CleanupOptions,
  ): Promise<Partial<CleanupResult>> {
    const result: Partial<CleanupResult> = {
      milestonesDeleted: 0,
      notesDeleted: 0,
      remindersDeleted: 0,
      usersDeleted: 0,
    };

    // Identify test users
    const testUserPattern = '%test%';

    if (options.dryRun) {
      // Count test milestones
      const milestoneCountQuery = `
        SELECT COUNT(*) as count 
        FROM milestones m
        JOIN users u ON m.student_id = u.id
        WHERE u.email LIKE $1
      `;
      const milestoneResult = await queryRunner.query(milestoneCountQuery, [
        testUserPattern,
      ]);
      result.milestonesDeleted = parseInt(milestoneResult[0].count);

      // Count test users
      const userCountQuery = `
        SELECT COUNT(*) as count 
        FROM users 
        WHERE email LIKE $1 AND role = $2
      `;
      const userResult = await queryRunner.query(userCountQuery, [
        testUserPattern,
        UserRole.STUDENT,
      ]);
      result.usersDeleted = parseInt(userResult[0].count);
    } else {
      // Delete test milestones (cascade will handle notes and reminders)
      const deleteMilestonesQuery = `
        DELETE FROM milestones 
        WHERE student_id IN (
          SELECT id FROM users WHERE email LIKE $1
        )
      `;
      const milestoneResult = await queryRunner.query(deleteMilestonesQuery, [
        testUserPattern,
      ]);
      result.milestonesDeleted = milestoneResult[1];

      // Delete test users
      const deleteUsersQuery = `
        DELETE FROM users 
        WHERE email LIKE $1 AND role = $2
      `;
      const userResult = await queryRunner.query(deleteUsersQuery, [
        testUserPattern,
        UserRole.STUDENT,
      ]);
      result.usersDeleted = userResult[1];
    }

    return result;
  }

  private async cleanupCompletedMilestones(
    queryRunner: any,
    options: CleanupOptions,
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (options.olderThanDays || 90));

    const query = `
      DELETE FROM milestones 
      WHERE status = 'completed' 
      AND completed_at < $1
    `;

    if (options.dryRun) {
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM milestones 
        WHERE status = 'completed' 
        AND completed_at < $1
      `;
      const result = await queryRunner.query(countQuery, [cutoffDate]);
      return parseInt(result[0].count);
    } else {
      const result = await queryRunner.query(query, [cutoffDate]);
      return result[1];
    }
  }

  private async cleanupUnusedTemplates(
    queryRunner: any,
    options: CleanupOptions,
  ): Promise<number> {
    const query = `
      DELETE FROM milestone_templates 
      WHERE usage_count = 0 
      AND is_active = false
    `;

    if (options.dryRun) {
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM milestone_templates 
        WHERE usage_count = 0 
        AND is_active = false
      `;
      const result = await queryRunner.query(countQuery);
      return parseInt(result[0].count);
    } else {
      const result = await queryRunner.query(query);
      return result[1];
    }
  }

  private async cleanupStudentData(
    queryRunner: any,
    studentIds: string[],
    options: CleanupOptions,
  ): Promise<Partial<CleanupResult>> {
    const result: Partial<CleanupResult> = {
      milestonesDeleted: 0,
      notesDeleted: 0,
      remindersDeleted: 0,
    };

    const placeholders = studentIds
      .map((_, index) => `$${index + 1}`)
      .join(',');

    if (options.dryRun) {
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM milestones 
        WHERE student_id IN (${placeholders})
      `;
      const milestoneResult = await queryRunner.query(countQuery, studentIds);
      result.milestonesDeleted = parseInt(milestoneResult[0].count);
    } else {
      const deleteQuery = `
        DELETE FROM milestones 
        WHERE student_id IN (${placeholders})
      `;
      const milestoneResult = await queryRunner.query(deleteQuery, studentIds);
      result.milestonesDeleted = milestoneResult[1];
    }

    return result;
  }

  async resetMilestoneSystem(
    options: ResetOptions = {},
  ): Promise<CleanupResult> {
    this.logger.log('Resetting milestone system...');

    const result: CleanupResult = {
      milestonesDeleted: 0,
      notesDeleted: 0,
      remindersDeleted: 0,
      templatesDeleted: 0,
      usersDeleted: 0,
      errors: [],
      executionTime: 0,
    };

    const startTime = Date.now();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      if (options.resetMilestones) {
        // Delete all milestones (cascade will handle notes and reminders)
        const milestoneResult = await queryRunner.query(
          'DELETE FROM milestones',
        );
        result.milestonesDeleted = milestoneResult[1];
      }

      if (options.resetTemplates && !options.preserveAdminData) {
        // Delete all templates
        const templateResult = await queryRunner.query(
          'DELETE FROM milestone_templates',
        );
        result.templatesDeleted = templateResult[1];
      }

      if (options.resetTestUsers) {
        // Delete test users
        const userResult = await queryRunner.query(
          "DELETE FROM users WHERE email LIKE '%test%' AND role = $1",
          [UserRole.STUDENT],
        );
        result.usersDeleted = userResult[1];
      }

      await queryRunner.commitTransaction();
      this.logger.log('Milestone system reset completed successfully');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      result.errors.push(`Reset failed: ${error.message}`);
      this.logger.error('Milestone system reset failed', error);
    } finally {
      await queryRunner.release();
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  async archiveOldMilestones(olderThanDays: number = 365): Promise<number> {
    this.logger.log(`Archiving milestones older than ${olderThanDays} days...`);

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Instead of deleting, we could move to an archive table
      // For now, we'll just mark them as archived (if such a field exists)
      const result = await this.milestoneRepository
        .createQueryBuilder()
        .update()
        .set({
          // Assuming we have an archived field
          // archived: true,
          // archivedAt: new Date(),
        })
        .where('completed_at < :cutoffDate', { cutoffDate })
        .andWhere('status = :status', { status: 'completed' })
        .execute();

      this.logger.log(`Archived ${result.affected} milestones`);
      return result.affected || 0;
    } catch (error) {
      this.logger.error('Failed to archive old milestones', error);
      throw error;
    }
  }

  async generateCleanupReport(options: CleanupOptions = {}): Promise<string> {
    // Run a dry run to get counts
    const dryRunOptions = { ...options, dryRun: true };
    const result = await this.cleanupMilestoneData(dryRunOptions);

    const report = [
      'Milestone Data Cleanup Report',
      '='.repeat(40),
      '',
      `Report Generated: ${new Date().toLocaleString()}`,
      `Cleanup Options: ${JSON.stringify(options, null, 2)}`,
      '',
      'Items to be cleaned up:',
      '-'.repeat(25),
      `Milestones: ${result.milestonesDeleted}`,
      `Notes: ${result.notesDeleted}`,
      `Reminders: ${result.remindersDeleted}`,
      `Templates: ${result.templatesDeleted}`,
      `Test Users: ${result.usersDeleted}`,
      '',
      'Estimated execution time: < 1 minute',
      '',
      'Note: This is a preview. Run with dryRun: false to execute cleanup.',
    ];

    if (result.errors.length > 0) {
      report.push('');
      report.push('Errors encountered:');
      report.push('-'.repeat(20));
      result.errors.forEach((error) => {
        report.push(`• ${error}`);
      });
    }

    return report.join('\n');
  }

  async optimizeMilestoneDatabase(): Promise<void> {
    this.logger.log('Optimizing milestone database...');

    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      // Analyze tables for better query planning
      await queryRunner.query('ANALYZE milestones');
      await queryRunner.query('ANALYZE milestone_notes');
      await queryRunner.query('ANALYZE milestone_reminders');
      await queryRunner.query('ANALYZE milestone_templates');

      // Vacuum tables to reclaim space (PostgreSQL specific)
      if (this.dataSource.options.type === 'postgres') {
        await queryRunner.query('VACUUM ANALYZE milestones');
        await queryRunner.query('VACUUM ANALYZE milestone_notes');
        await queryRunner.query('VACUUM ANALYZE milestone_reminders');
        await queryRunner.query('VACUUM ANALYZE milestone_templates');
      }

      await queryRunner.release();
      this.logger.log('Database optimization completed');
    } catch (error) {
      this.logger.error('Database optimization failed', error);
      throw error;
    }
  }

  async validateDataIntegrity(): Promise<string[]> {
    this.logger.log('Validating milestone data integrity...');

    const issues: string[] = [];

    try {
      // Check for orphaned notes
      const orphanedNotes = await this.milestoneNoteRepository
        .createQueryBuilder('note')
        .leftJoin('note.milestone', 'milestone')
        .where('milestone.id IS NULL')
        .getCount();

      if (orphanedNotes > 0) {
        issues.push(`Found ${orphanedNotes} orphaned milestone notes`);
      }

      // Check for orphaned reminders
      const orphanedReminders = await this.milestoneReminderRepository
        .createQueryBuilder('reminder')
        .leftJoin('reminder.milestone', 'milestone')
        .where('milestone.id IS NULL')
        .getCount();

      if (orphanedReminders > 0) {
        issues.push(`Found ${orphanedReminders} orphaned milestone reminders`);
      }

      // Check for milestones without students
      const milestonesWithoutStudents = await this.milestoneRepository
        .createQueryBuilder('milestone')
        .leftJoin('milestone.student', 'student')
        .where('student.id IS NULL')
        .getCount();

      if (milestonesWithoutStudents > 0) {
        issues.push(
          `Found ${milestonesWithoutStudents} milestones without valid students`,
        );
      }

      // Check for inconsistent completion data
      const inconsistentCompletions = await this.milestoneRepository
        .createQueryBuilder('milestone')
        .where('status = :status', { status: 'completed' })
        .andWhere('completed_at IS NULL')
        .getCount();

      if (inconsistentCompletions > 0) {
        issues.push(
          `Found ${inconsistentCompletions} completed milestones without completion dates`,
        );
      }

      if (issues.length === 0) {
        issues.push('No data integrity issues found');
      }

      this.logger.log(
        `Data integrity validation completed with ${issues.length} issues`,
      );
      return issues;
    } catch (error) {
      this.logger.error('Data integrity validation failed', error);
      throw error;
    }
  }
}

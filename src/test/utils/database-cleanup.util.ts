import { DataSource } from 'typeorm';
import { User, StudentProfile, SupervisorProfile } from '../../entities';
import { Logger } from '@nestjs/common';

export class DatabaseCleanupUtil {
  private static readonly logger = new Logger(DatabaseCleanupUtil.name);

  /**
   * Clean all test data from the database
   */
  static async cleanAll(dataSource: DataSource): Promise<void> {
    this.logger.log('Starting database cleanup...');

    try {
      await dataSource.transaction(async (manager) => {
        // Delete in correct order to respect foreign key constraints
        await manager.delete(StudentProfile, {});
        await manager.delete(SupervisorProfile, {});
        await manager.delete(User, {});
      });

      this.logger.log('Database cleanup completed successfully');
    } catch (error) {
      this.logger.error('Database cleanup failed', error);
      throw error;
    }
  }

  /**
   * Clean only test users (identified by email pattern)
   */
  static async cleanTestUsers(dataSource: DataSource): Promise<void> {
    this.logger.log('Cleaning test users...');

    try {
      const userRepository = dataSource.getRepository(User);

      // Delete users with test email patterns
      const testEmailPatterns = [
        '%test%@ui.edu.ng',
        '%student%@ui.edu.ng',
        '%supervisor%@ui.edu.ng',
        '%admin%@ui.edu.ng',
      ];

      for (const pattern of testEmailPatterns) {
        const testUsers = await userRepository
          .createQueryBuilder('user')
          .where('user.email LIKE :pattern', { pattern })
          .getMany();

        if (testUsers.length > 0) {
          await userRepository.remove(testUsers);
          this.logger.log(
            `Removed ${testUsers.length} test users matching pattern: ${pattern}`,
          );
        }
      }

      this.logger.log('Test users cleanup completed');
    } catch (error) {
      this.logger.error('Test users cleanup failed', error);
      throw error;
    }
  }

  /**
   * Clean users by specific emails
   */
  static async cleanUsersByEmails(
    dataSource: DataSource,
    emails: string[],
  ): Promise<void> {
    this.logger.log(`Cleaning users by emails: ${emails.join(', ')}`);

    try {
      const userRepository = dataSource.getRepository(User);

      for (const email of emails) {
        const user = await userRepository.findOne({
          where: { email },
          relations: ['studentProfile', 'supervisorProfile'],
        });

        if (user) {
          await userRepository.remove(user);
          this.logger.log(`Removed user: ${email}`);
        }
      }

      this.logger.log('Email-based cleanup completed');
    } catch (error) {
      this.logger.error('Email-based cleanup failed', error);
      throw error;
    }
  }

  /**
   * Reset auto-increment sequences (useful for consistent test IDs)
   */
  static async resetSequences(dataSource: DataSource): Promise<void> {
    this.logger.log('Resetting database sequences...');

    try {
      // Note: This is PostgreSQL specific
      await dataSource.query(
        'ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1',
      );
      await dataSource.query(
        'ALTER SEQUENCE IF EXISTS student_profiles_id_seq RESTART WITH 1',
      );
      await dataSource.query(
        'ALTER SEQUENCE IF EXISTS supervisor_profiles_id_seq RESTART WITH 1',
      );

      this.logger.log('Database sequences reset completed');
    } catch (error) {
      this.logger.error('Database sequences reset failed', error);
      throw error;
    }
  }

  /**
   * Truncate all tables (use with caution - removes ALL data)
   */
  static async truncateAll(dataSource: DataSource): Promise<void> {
    this.logger.warn('TRUNCATING ALL TABLES - This will remove ALL data!');

    try {
      await dataSource.transaction(async (manager) => {
        // Disable foreign key checks temporarily
        await manager.query('SET FOREIGN_KEY_CHECKS = 0');

        // Truncate tables
        await manager.query('TRUNCATE TABLE student_profiles CASCADE');
        await manager.query('TRUNCATE TABLE supervisor_profiles CASCADE');
        await manager.query('TRUNCATE TABLE users CASCADE');

        // Re-enable foreign key checks
        await manager.query('SET FOREIGN_KEY_CHECKS = 1');
      });

      this.logger.log('All tables truncated successfully');
    } catch (error) {
      this.logger.error('Table truncation failed', error);
      throw error;
    }
  }

  /**
   * Get database statistics for monitoring
   */
  static async getDatabaseStats(dataSource: DataSource): Promise<{
    users: number;
    students: number;
    supervisors: number;
  }> {
    try {
      const userRepository = dataSource.getRepository(User);
      const studentRepository = dataSource.getRepository(StudentProfile);
      const supervisorRepository = dataSource.getRepository(SupervisorProfile);

      const [users, students, supervisors] = await Promise.all([
        userRepository.count(),
        studentRepository.count(),
        supervisorRepository.count(),
      ]);

      return { users, students, supervisors };
    } catch (error) {
      this.logger.error('Failed to get database stats', error);
      throw error;
    }
  }

  /**
   * Verify database is clean (useful for test setup verification)
   */
  static async verifyCleanState(dataSource: DataSource): Promise<boolean> {
    try {
      const stats = await this.getDatabaseStats(dataSource);
      const isEmpty =
        stats.users === 0 && stats.students === 0 && stats.supervisors === 0;

      if (isEmpty) {
        this.logger.log('Database is in clean state');
      } else {
        this.logger.warn(`Database is not clean: ${JSON.stringify(stats)}`);
      }

      return isEmpty;
    } catch (error) {
      this.logger.error('Failed to verify clean state', error);
      return false;
    }
  }
}

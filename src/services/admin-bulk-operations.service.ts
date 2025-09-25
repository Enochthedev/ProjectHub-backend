import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { User } from '../entities/user.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { SupervisorProfile } from '../entities/supervisor-profile.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { PasswordService } from '../auth/services/password.service';
import { EmailService } from '../auth/services/email.service';
import { AdminAuditService } from '../auth/services/admin-audit.service';
import csv from 'csv-parser';
import * as csvWriter from 'csv-writer';
import { Readable } from 'stream';

export interface BulkImportUserDto {
  email: string;
  role: UserRole;
  name?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  // Role-specific fields
  skills?: string[];
  interests?: string[];
  preferredSpecializations?: string[];
  currentYear?: number;
  gpa?: number;
  specializations?: string[];
  maxStudents?: number;
  officeLocation?: string;
  phoneNumber?: string;
}

export interface BulkImportResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
  createdUsers: string[];
  skippedUsers: string[];
}

export interface BulkExportOptions {
  role?: UserRole;
  isActive?: boolean;
  isEmailVerified?: boolean;
  includeProfiles?: boolean;
  format?: 'csv' | 'json';
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface UserMigrationOptions {
  fromRole?: UserRole;
  toRole?: UserRole;
  preserveProfiles?: boolean;
  dryRun?: boolean;
  batchSize?: number;
}

export interface MigrationResult {
  totalUsers: number;
  migratedCount: number;
  failureCount: number;
  errors: Array<{
    userId: string;
    email: string;
    error: string;
  }>;
  dryRun: boolean;
}

export interface CleanupOptions {
  inactiveForDays?: number;
  unverifiedForDays?: number;
  deleteProfiles?: boolean;
  dryRun?: boolean;
  batchSize?: number;
}

export interface CleanupResult {
  totalCandidates: number;
  deletedCount: number;
  failureCount: number;
  errors: Array<{
    userId: string;
    email: string;
    error: string;
  }>;
  dryRun: boolean;
}

/**
 * Admin Bulk Operations Service
 *
 * Provides comprehensive bulk operations for user management including:
 * - Bulk user import from CSV/JSON with validation
 * - Bulk user export with filtering and formatting options
 * - User data migration between roles with transaction safety
 * - Data cleanup tools for inactive/unverified users
 * - Comprehensive error handling and reporting
 */
@Injectable()
export class AdminBulkOperationsService {
  private readonly logger = new Logger(AdminBulkOperationsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
    @InjectRepository(SupervisorProfile)
    private readonly supervisorProfileRepository: Repository<SupervisorProfile>,
    private readonly dataSource: DataSource,
    private readonly passwordService: PasswordService,
    private readonly emailService: EmailService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  /**
   * Import users from CSV data with transaction safety
   */
  async importUsersFromCsv(
    csvData: string,
    adminId: string,
    sendWelcomeEmails: boolean = false,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
      createdUsers: [],
      skippedUsers: [],
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const users = await this.parseCsvData(csvData);
      result.totalProcessed = users.length;

      for (let i = 0; i < users.length; i++) {
        const userData = users[i];
        const rowNumber = i + 2; // +2 because CSV starts at row 1 and we skip header

        try {
          // Validate required fields
          if (!userData.email || !userData.role) {
            throw new Error('Email and role are required fields');
          }

          // Check if user already exists
          const existingUser = await queryRunner.manager.findOne(User, {
            where: { email: userData.email },
          });

          if (existingUser) {
            result.skippedUsers.push(userData.email);
            continue;
          }

          // Create user with transaction
          const user = await this.createUserWithTransaction(
            queryRunner,
            userData,
            sendWelcomeEmails,
          );

          result.createdUsers.push(user.id);
          result.successCount++;
        } catch (error) {
          result.errors.push({
            row: rowNumber,
            email: userData.email || 'Unknown',
            error: error.message || 'Unknown error occurred',
          });
          result.failureCount++;
        }
      }

      await queryRunner.commitTransaction();

      // Log bulk operation
      await this.adminAuditService.logBulkOperation({
        adminId,
        action: 'bulk_import_users',
        resourceType: 'user',
        affectedCount: result.successCount,
        metadata: {
          totalProcessed: result.totalProcessed,
          successCount: result.successCount,
          failureCount: result.failureCount,
          sendWelcomeEmails,
        },
        ipAddress,
        userAgent,
      });

      this.logger.log(
        `Bulk import completed: ${result.successCount} created, ${result.failureCount} failed, ${result.skippedUsers.length} skipped by admin ${adminId}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Bulk import failed:', error);
      throw new InternalServerErrorException('Bulk import operation failed');
    } finally {
      await queryRunner.release();
    }

    return result;
  }

  /**
   * Export users to CSV format with filtering
   */
  async exportUsersToCSV(options: BulkExportOptions = {}): Promise<string> {
    const {
      role,
      isActive,
      isEmailVerified,
      includeProfiles = true,
      createdAfter,
      createdBefore,
    } = options;

    // Build query with filters
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.studentProfile', 'studentProfile')
      .leftJoinAndSelect('user.supervisorProfile', 'supervisorProfile');

    if (role !== undefined) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    if (isEmailVerified !== undefined) {
      queryBuilder.andWhere('user.isEmailVerified = :isEmailVerified', {
        isEmailVerified,
      });
    }

    if (createdAfter) {
      queryBuilder.andWhere('user.createdAt >= :createdAfter', {
        createdAfter,
      });
    }

    if (createdBefore) {
      queryBuilder.andWhere('user.createdAt <= :createdBefore', {
        createdBefore,
      });
    }

    queryBuilder.orderBy('user.createdAt', 'DESC');

    const users = await queryBuilder.getMany();

    // Convert to CSV format
    const csvData = this.convertUsersToCSV(users, includeProfiles);

    this.logger.log(`Exported ${users.length} users to CSV`);

    return csvData;
  }

  /**
   * Export users to JSON format with filtering
   */
  async exportUsersToJSON(options: BulkExportOptions = {}): Promise<any[]> {
    const {
      role,
      isActive,
      isEmailVerified,
      includeProfiles = true,
      createdAfter,
      createdBefore,
    } = options;

    // Build query with filters
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.studentProfile', 'studentProfile')
      .leftJoinAndSelect('user.supervisorProfile', 'supervisorProfile');

    if (role !== undefined) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    if (isEmailVerified !== undefined) {
      queryBuilder.andWhere('user.isEmailVerified = :isEmailVerified', {
        isEmailVerified,
      });
    }

    if (createdAfter) {
      queryBuilder.andWhere('user.createdAt >= :createdAfter', {
        createdAfter,
      });
    }

    if (createdBefore) {
      queryBuilder.andWhere('user.createdAt <= :createdBefore', {
        createdBefore,
      });
    }

    queryBuilder.orderBy('user.createdAt', 'DESC');

    const users = await queryBuilder.getMany();

    // Convert to JSON format
    const jsonData = users.map((user) =>
      this.convertUserToJSON(user, includeProfiles),
    );

    this.logger.log(`Exported ${users.length} users to JSON`);

    return jsonData;
  }

  /**
   * Migrate users between roles with transaction safety
   */
  async migrateUsers(
    userIds: string[],
    options: UserMigrationOptions,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<MigrationResult> {
    const {
      fromRole,
      toRole,
      preserveProfiles = false,
      dryRun = false,
      batchSize = 50,
    } = options;

    const result: MigrationResult = {
      totalUsers: userIds.length,
      migratedCount: 0,
      failureCount: 0,
      errors: [],
      dryRun,
    };

    if (!toRole) {
      throw new BadRequestException('Target role is required for migration');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    if (!dryRun) {
      await queryRunner.startTransaction();
    }

    try {
      // Process users in batches
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);

        for (const userId of batch) {
          try {
            const user = await queryRunner.manager.findOne(User, {
              where: { id: userId },
              relations: ['studentProfile', 'supervisorProfile'],
            });

            if (!user) {
              throw new Error('User not found');
            }

            // Check if migration is needed
            if (fromRole && user.role !== fromRole) {
              throw new Error(
                `User role ${user.role} does not match expected ${fromRole}`,
              );
            }

            if (user.role === toRole) {
              continue; // Skip if already the target role
            }

            if (!dryRun) {
              // Perform migration
              await this.migrateUserRole(
                queryRunner,
                user,
                toRole,
                preserveProfiles,
              );
            }

            result.migratedCount++;
          } catch (error) {
            result.errors.push({
              userId,
              email: 'Unknown',
              error: error.message || 'Unknown error occurred',
            });
            result.failureCount++;
          }
        }
      }

      if (!dryRun) {
        await queryRunner.commitTransaction();

        // Log migration operation
        await this.adminAuditService.logBulkOperation({
          adminId,
          action: 'bulk_migrate_users',
          resourceType: 'user',
          affectedCount: result.migratedCount,
          metadata: {
            fromRole,
            toRole,
            preserveProfiles,
            totalUsers: result.totalUsers,
            migratedCount: result.migratedCount,
            failureCount: result.failureCount,
          },
          ipAddress,
          userAgent,
        });
      }

      this.logger.log(
        `User migration ${dryRun ? '(dry run) ' : ''}completed: ${result.migratedCount} migrated, ${result.failureCount} failed by admin ${adminId}`,
      );
    } catch (error) {
      if (!dryRun) {
        await queryRunner.rollbackTransaction();
      }
      this.logger.error('User migration failed:', error);
      throw new InternalServerErrorException('User migration operation failed');
    } finally {
      await queryRunner.release();
    }

    return result;
  }

  /**
   * Clean up inactive or unverified users
   */
  async cleanupUsers(
    options: CleanupOptions,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<CleanupResult> {
    const {
      inactiveForDays = 365,
      unverifiedForDays = 30,
      deleteProfiles = true,
      dryRun = false,
      batchSize = 50,
    } = options;

    const result: CleanupResult = {
      totalCandidates: 0,
      deletedCount: 0,
      failureCount: 0,
      errors: [],
      dryRun,
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    if (!dryRun) {
      await queryRunner.startTransaction();
    }

    try {
      // Find candidates for cleanup
      const inactiveDate = new Date();
      inactiveDate.setDate(inactiveDate.getDate() - inactiveForDays);

      const unverifiedDate = new Date();
      unverifiedDate.setDate(unverifiedDate.getDate() - unverifiedForDays);

      const candidates = await queryRunner.manager
        .createQueryBuilder(User, 'user')
        .leftJoinAndSelect('user.studentProfile', 'studentProfile')
        .leftJoinAndSelect('user.supervisorProfile', 'supervisorProfile')
        .where(
          '(user.isActive = false AND user.updatedAt < :inactiveDate) OR (user.isEmailVerified = false AND user.createdAt < :unverifiedDate)',
          { inactiveDate, unverifiedDate },
        )
        .andWhere('user.role != :adminRole', { adminRole: UserRole.ADMIN }) // Never delete admin users
        .getMany();

      result.totalCandidates = candidates.length;

      // Process candidates in batches
      for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);

        for (const user of batch) {
          try {
            if (!dryRun) {
              // Delete profiles first if requested
              if (deleteProfiles) {
                if (user.studentProfile) {
                  await queryRunner.manager.remove(user.studentProfile);
                }
                if (user.supervisorProfile) {
                  await queryRunner.manager.remove(user.supervisorProfile);
                }
              }

              // Delete user
              await queryRunner.manager.remove(user);
            }

            result.deletedCount++;
          } catch (error) {
            result.errors.push({
              userId: user.id,
              email: user.email,
              error: error.message || 'Unknown error occurred',
            });
            result.failureCount++;
          }
        }
      }

      if (!dryRun) {
        await queryRunner.commitTransaction();

        // Log cleanup operation
        await this.adminAuditService.logBulkOperation({
          adminId,
          action: 'bulk_cleanup_users',
          resourceType: 'user',
          affectedCount: result.deletedCount,
          metadata: {
            inactiveForDays,
            unverifiedForDays,
            deleteProfiles,
            totalCandidates: result.totalCandidates,
            deletedCount: result.deletedCount,
            failureCount: result.failureCount,
          },
          ipAddress,
          userAgent,
        });
      }

      this.logger.log(
        `User cleanup ${dryRun ? '(dry run) ' : ''}completed: ${result.deletedCount} deleted, ${result.failureCount} failed by admin ${adminId}`,
      );
    } catch (error) {
      if (!dryRun) {
        await queryRunner.rollbackTransaction();
      }
      this.logger.error('User cleanup failed:', error);
      throw new InternalServerErrorException('User cleanup operation failed');
    } finally {
      await queryRunner.release();
    }

    return result;
  }

  /**
   * Parse CSV data into user objects
   */
  private async parseCsvData(csvData: string): Promise<BulkImportUserDto[]> {
    return new Promise((resolve, reject) => {
      const users: BulkImportUserDto[] = [];
      const stream = Readable.from([csvData]);

      stream
        .pipe(csv())
        .on('data', (row) => {
          const user: BulkImportUserDto = {
            email: row.email?.trim(),
            role: row.role?.trim() as UserRole,
            name: row.name?.trim(),
            isActive: row.isActive === 'true' || row.isActive === '1',
            isEmailVerified:
              row.isEmailVerified === 'true' || row.isEmailVerified === '1',
          };

          // Parse role-specific fields
          if (user.role === UserRole.STUDENT) {
            user.skills = row.skills
              ? row.skills.split(';').map((s: string) => s.trim())
              : [];
            user.interests = row.interests
              ? row.interests.split(';').map((s: string) => s.trim())
              : [];
            user.preferredSpecializations = row.preferredSpecializations
              ? row.preferredSpecializations
                  .split(';')
                  .map((s: string) => s.trim())
              : [];
            user.currentYear = row.currentYear
              ? parseInt(row.currentYear)
              : undefined;
            user.gpa = row.gpa ? parseFloat(row.gpa) : undefined;
          } else if (user.role === UserRole.SUPERVISOR) {
            user.specializations = row.specializations
              ? row.specializations.split(';').map((s: string) => s.trim())
              : [];
            user.maxStudents = row.maxStudents ? parseInt(row.maxStudents) : 5;
            user.officeLocation = row.officeLocation?.trim();
            user.phoneNumber = row.phoneNumber?.trim();
          }

          users.push(user);
        })
        .on('end', () => {
          resolve(users);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Create user with transaction support
   */
  private async createUserWithTransaction(
    queryRunner: QueryRunner,
    userData: BulkImportUserDto,
    sendWelcomeEmail: boolean,
  ): Promise<User> {
    // Generate secure password
    const temporaryPassword = this.generateSecurePassword();
    const hashedPassword =
      await this.passwordService.hashPassword(temporaryPassword);

    // Create user
    const user = queryRunner.manager.create(User, {
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      isActive: userData.isActive ?? true,
      isEmailVerified: userData.isEmailVerified ?? false,
    });

    const savedUser = await queryRunner.manager.save(user);

    // Create profile if name is provided
    if (userData.name) {
      await this.createUserProfileWithTransaction(
        queryRunner,
        savedUser,
        userData,
      );
    }

    // Send welcome email if requested
    if (sendWelcomeEmail) {
      try {
        await this.emailService.sendWelcomeEmail(
          savedUser.email,
          temporaryPassword,
          userData.name || savedUser.email,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to send welcome email to ${savedUser.email}:`,
          error,
        );
      }
    }

    return savedUser;
  }

  /**
   * Create user profile with transaction support
   */
  private async createUserProfileWithTransaction(
    queryRunner: QueryRunner,
    user: User,
    userData: BulkImportUserDto,
  ): Promise<void> {
    if (user.role === UserRole.STUDENT) {
      const profile = queryRunner.manager.create(StudentProfile, {
        user,
        name: userData.name!,
        skills: userData.skills || [],
        interests: userData.interests || [],
        preferredSpecializations: userData.preferredSpecializations || [],
        currentYear: userData.currentYear,
        gpa: userData.gpa,
      });
      await queryRunner.manager.save(profile);
    } else if (user.role === UserRole.SUPERVISOR) {
      const profile = queryRunner.manager.create(SupervisorProfile, {
        user,
        name: userData.name!,
        specializations: userData.specializations || [],
        maxStudents: userData.maxStudents || 5,
        isAvailable: true,
        officeLocation: userData.officeLocation,
        phoneNumber: userData.phoneNumber,
      });
      await queryRunner.manager.save(profile);
    }
  }

  /**
   * Migrate user role with transaction support
   */
  private async migrateUserRole(
    queryRunner: QueryRunner,
    user: User,
    toRole: UserRole,
    preserveProfiles: boolean,
  ): Promise<void> {
    const oldRole = user.role;

    // Update user role
    user.role = toRole;
    await queryRunner.manager.save(user);

    // Handle profile migration
    if (!preserveProfiles) {
      // Remove old profiles
      if (user.studentProfile) {
        await queryRunner.manager.remove(user.studentProfile);
      }
      if (user.supervisorProfile) {
        await queryRunner.manager.remove(user.supervisorProfile);
      }
    } else {
      // Convert profiles if possible
      if (
        oldRole === UserRole.STUDENT &&
        toRole === UserRole.SUPERVISOR &&
        user.studentProfile
      ) {
        // Convert student to supervisor profile
        const supervisorProfile = queryRunner.manager.create(
          SupervisorProfile,
          {
            user,
            name: user.studentProfile.name,
            specializations: user.studentProfile.preferredSpecializations,
            maxStudents: 5,
            isAvailable: true,
          },
        );
        await queryRunner.manager.save(supervisorProfile);
        await queryRunner.manager.remove(user.studentProfile);
      } else if (
        oldRole === UserRole.SUPERVISOR &&
        toRole === UserRole.STUDENT &&
        user.supervisorProfile
      ) {
        // Convert supervisor to student profile
        const studentProfile = queryRunner.manager.create(StudentProfile, {
          user,
          name: user.supervisorProfile.name,
          skills: [],
          interests: [],
          preferredSpecializations: user.supervisorProfile.specializations,
        });
        await queryRunner.manager.save(studentProfile);
        await queryRunner.manager.remove(user.supervisorProfile);
      }
    }
  }

  /**
   * Convert users to CSV format
   */
  private convertUsersToCSV(users: User[], includeProfiles: boolean): string {
    const headers = [
      'id',
      'email',
      'role',
      'isActive',
      'isEmailVerified',
      'createdAt',
      'updatedAt',
    ];

    if (includeProfiles) {
      headers.push(
        'name',
        'skills',
        'interests',
        'preferredSpecializations',
        'currentYear',
        'gpa',
        'specializations',
        'maxStudents',
        'isAvailable',
        'officeLocation',
        'phoneNumber',
      );
    }

    const rows = users.map((user) => {
      const row: any = {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };

      if (includeProfiles) {
        if (user.studentProfile) {
          row.name = user.studentProfile.name;
          row.skills = user.studentProfile.skills.join(';');
          row.interests = user.studentProfile.interests.join(';');
          row.preferredSpecializations =
            user.studentProfile.preferredSpecializations.join(';');
          row.currentYear = user.studentProfile.currentYear;
          row.gpa = user.studentProfile.gpa;
        } else if (user.supervisorProfile) {
          row.name = user.supervisorProfile.name;
          row.specializations =
            user.supervisorProfile.specializations.join(';');
          row.maxStudents = user.supervisorProfile.maxStudents;
          row.isAvailable = user.supervisorProfile.isAvailable;
          row.officeLocation = user.supervisorProfile.officeLocation;
          row.phoneNumber = user.supervisorProfile.phoneNumber;
        }
      }

      return row;
    });

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((header) => `"${row[header] || ''}"`).join(','),
      ),
    ].join('\n');

    return csvContent;
  }

  /**
   * Convert user to JSON format
   */
  private convertUserToJSON(user: User, includeProfiles: boolean): any {
    const userData: any = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    if (includeProfiles) {
      if (user.studentProfile) {
        userData.studentProfile = {
          id: user.studentProfile.id,
          name: user.studentProfile.name,
          skills: user.studentProfile.skills,
          interests: user.studentProfile.interests,
          preferredSpecializations:
            user.studentProfile.preferredSpecializations,
          currentYear: user.studentProfile.currentYear,
          gpa: user.studentProfile.gpa,
          profileUpdatedAt: user.studentProfile.profileUpdatedAt,
        };
      }

      if (user.supervisorProfile) {
        userData.supervisorProfile = {
          id: user.supervisorProfile.id,
          name: user.supervisorProfile.name,
          specializations: user.supervisorProfile.specializations,
          maxStudents: user.supervisorProfile.maxStudents,
          isAvailable: user.supervisorProfile.isAvailable,
          officeLocation: user.supervisorProfile.officeLocation,
          phoneNumber: user.supervisorProfile.phoneNumber,
        };
      }
    }

    return userData;
  }

  /**
   * Generate a secure password
   */
  private generateSecurePassword(): string {
    const length = 12;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&';
    let password = '';

    // Ensure at least one character from each required category
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // number
    password += '@$!%*?&'[Math.floor(Math.random() * 7)]; // special character

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }
}

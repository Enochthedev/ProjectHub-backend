import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AdminBulkOperationsService } from '../admin-bulk-operations.service';
import { User } from '../../entities/user.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { SupervisorProfile } from '../../entities/supervisor-profile.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { PasswordService } from '../../auth/services/password.service';
import { EmailService } from '../../auth/services/email.service';
import { AdminAuditService } from '../../auth/services/admin-audit.service';

describe.skip('AdminBulkOperationsService', () => {
  let service: AdminBulkOperationsService;
  let userRepository: jest.Mocked<Repository<User>>;
  let studentProfileRepository: jest.Mocked<Repository<StudentProfile>>;
  let supervisorProfileRepository: jest.Mocked<Repository<SupervisorProfile>>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let passwordService: jest.Mocked<PasswordService>;
  let emailService: jest.Mocked<EmailService>;
  let adminAuditService: jest.Mocked<AdminAuditService>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@ui.edu.ng',
    password: 'hashedPassword',
    role: UserRole.STUDENT,
    isActive: true,
    isEmailVerified: true,
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    studentProfile: {
      id: 'profile-1',
      name: 'Test Student',
      skills: ['JavaScript', 'Python'],
      interests: ['Web Development'],
      preferredSpecializations: ['Computer Science'],
      currentYear: 4,
      gpa: 3.8,
      profileUpdatedAt: new Date('2024-01-01'),
    } as StudentProfile,
  } as User;

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getManyAndCount: jest.fn(),
      })),
    };

    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn(),
        })),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn(() => mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminBulkOperationsService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(StudentProfile),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(SupervisorProfile),
          useValue: mockRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: PasswordService,
          useValue: {
            hashPassword: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendWelcomeEmail: jest.fn(),
          },
        },
        {
          provide: AdminAuditService,
          useValue: {
            logBulkOperation: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminBulkOperationsService>(
      AdminBulkOperationsService,
    );
    userRepository = module.get(getRepositoryToken(User));
    studentProfileRepository = module.get(getRepositoryToken(StudentProfile));
    supervisorProfileRepository = module.get(
      getRepositoryToken(SupervisorProfile),
    );
    dataSource = module.get(DataSource);
    queryRunner = mockQueryRunner as any;
    passwordService = module.get(PasswordService);
    emailService = module.get(EmailService);
    adminAuditService = module.get(AdminAuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('importUsersFromCsv', () => {
    const csvData =
      'email,role,name,isActive\nstudent1@ui.edu.ng,student,John Doe,true\nstudent2@ui.edu.ng,student,Jane Smith,true';

    it('should import users successfully', async () => {
      queryRunner.manager.findOne.mockResolvedValue(null); // No existing users
      queryRunner.manager.create.mockReturnValue(mockUser);
      queryRunner.manager.save.mockResolvedValue(mockUser);
      passwordService.hashPassword.mockResolvedValue('hashedPassword');

      const result = await service.importUsersFromCsv(
        csvData,
        'admin-1',
        false,
        '127.0.0.1',
        'test-agent',
      );

      expect(result.totalProcessed).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.createdUsers).toHaveLength(2);
      expect(result.skippedUsers).toHaveLength(0);
      expect(result.errors).toHaveLength(0);

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(adminAuditService.logBulkOperation).toHaveBeenCalled();
    });

    it('should skip existing users', async () => {
      queryRunner.manager.findOne
        .mockResolvedValueOnce(mockUser) // First user exists
        .mockResolvedValueOnce(null); // Second user doesn't exist
      queryRunner.manager.create.mockReturnValue(mockUser);
      queryRunner.manager.save.mockResolvedValue(mockUser);
      passwordService.hashPassword.mockResolvedValue('hashedPassword');

      const result = await service.importUsersFromCsv(
        csvData,
        'admin-1',
        false,
        '127.0.0.1',
        'test-agent',
      );

      expect(result.totalProcessed).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(result.createdUsers).toHaveLength(1);
      expect(result.skippedUsers).toHaveLength(1);
      expect(result.skippedUsers[0]).toBe('student1@ui.edu.ng');
    });

    it('should handle validation errors', async () => {
      const invalidCsvData =
        'email,role,name,isActive\n,student,John Doe,true\nstudent2@ui.edu.ng,,Jane Smith,true';

      queryRunner.manager.findOne.mockResolvedValue(null);

      const result = await service.importUsersFromCsv(
        invalidCsvData,
        'admin-1',
        false,
        '127.0.0.1',
        'test-agent',
      );

      expect(result.totalProcessed).toBe(2);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].error).toContain('Email and role are required');
      expect(result.errors[1].error).toContain('Email and role are required');
    });

    it('should rollback transaction on error', async () => {
      queryRunner.manager.findOne.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.importUsersFromCsv(
          csvData,
          'admin-1',
          false,
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('exportUsersToCSV', () => {
    it('should export users to CSV format', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };

      userRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.exportUsersToCSV({
        role: UserRole.STUDENT,
        includeProfiles: true,
      });

      expect(typeof result).toBe('string');
      expect(result).toContain('id,email,role,isActive');
      expect(result).toContain(mockUser.email);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.role = :role',
        { role: UserRole.STUDENT },
      );
    });

    it('should apply date filters', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      userRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const createdAfter = new Date('2024-01-01');
      const createdBefore = new Date('2024-12-31');

      await service.exportUsersToCSV({
        createdAfter,
        createdBefore,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.createdAt >= :createdAfter',
        { createdAfter },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.createdAt <= :createdBefore',
        { createdBefore },
      );
    });
  });

  describe('exportUsersToJSON', () => {
    it('should export users to JSON format', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };

      userRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.exportUsersToJSON({
        role: UserRole.STUDENT,
        includeProfiles: true,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', mockUser.id);
      expect(result[0]).toHaveProperty('email', mockUser.email);
      expect(result[0]).toHaveProperty('studentProfile');
    });
  });

  describe('migrateUsers', () => {
    const userIds = ['user-1', 'user-2'];
    const migrationOptions = {
      toRole: UserRole.SUPERVISOR,
      preserveProfiles: false,
      dryRun: false,
      batchSize: 50,
    };

    it('should migrate users successfully', async () => {
      const usersToMigrate = [
        { ...mockUser, id: 'user-1' },
        { ...mockUser, id: 'user-2' },
      ];

      queryRunner.manager.findOne
        .mockResolvedValueOnce(usersToMigrate[0])
        .mockResolvedValueOnce(usersToMigrate[1]);
      queryRunner.manager.save.mockResolvedValue(mockUser);
      queryRunner.manager.remove.mockResolvedValue(undefined);

      const result = await service.migrateUsers(
        userIds,
        migrationOptions,
        'admin-1',
        '127.0.0.1',
        'test-agent',
      );

      expect(result.totalUsers).toBe(2);
      expect(result.migratedCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.dryRun).toBe(false);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(adminAuditService.logBulkOperation).toHaveBeenCalled();
    });

    it('should perform dry run without making changes', async () => {
      const dryRunOptions = { ...migrationOptions, dryRun: true };
      const usersToMigrate = [
        { ...mockUser, id: 'user-1' },
        { ...mockUser, id: 'user-2' },
      ];

      queryRunner.manager.findOne
        .mockResolvedValueOnce(usersToMigrate[0])
        .mockResolvedValueOnce(usersToMigrate[1]);

      const result = await service.migrateUsers(
        userIds,
        dryRunOptions,
        'admin-1',
        '127.0.0.1',
        'test-agent',
      );

      expect(result.totalUsers).toBe(2);
      expect(result.migratedCount).toBe(2);
      expect(result.dryRun).toBe(true);

      expect(queryRunner.startTransaction).not.toHaveBeenCalled();
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
      expect(adminAuditService.logBulkOperation).not.toHaveBeenCalled();
    });

    it('should handle migration errors', async () => {
      queryRunner.manager.findOne
        .mockResolvedValueOnce(null) // First user not found
        .mockResolvedValueOnce(mockUser); // Second user found

      const result = await service.migrateUsers(
        userIds,
        migrationOptions,
        'admin-1',
        '127.0.0.1',
        'test-agent',
      );

      expect(result.totalUsers).toBe(2);
      expect(result.migratedCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('User not found');
    });

    it('should require target role', async () => {
      const invalidOptions = { ...migrationOptions, toRole: undefined as any };

      await expect(
        service.migrateUsers(
          userIds,
          invalidOptions,
          'admin-1',
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cleanupUsers', () => {
    const cleanupOptions = {
      inactiveForDays: 365,
      unverifiedForDays: 30,
      deleteProfiles: true,
      dryRun: false,
      batchSize: 50,
    };

    it('should cleanup inactive users successfully', async () => {
      const inactiveUsers = [
        { ...mockUser, id: 'inactive-1', isActive: false },
        { ...mockUser, id: 'unverified-1', isEmailVerified: false },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(inactiveUsers),
      };

      queryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );
      queryRunner.manager.remove.mockResolvedValue(undefined);

      const result = await service.cleanupUsers(
        cleanupOptions,
        'admin-1',
        '127.0.0.1',
        'test-agent',
      );

      expect(result.totalCandidates).toBe(2);
      expect(result.deletedCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.dryRun).toBe(false);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(adminAuditService.logBulkOperation).toHaveBeenCalled();
    });

    it('should perform dry run cleanup', async () => {
      const dryRunOptions = { ...cleanupOptions, dryRun: true };
      const inactiveUsers = [
        { ...mockUser, id: 'inactive-1', isActive: false },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(inactiveUsers),
      };

      queryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.cleanupUsers(
        dryRunOptions,
        'admin-1',
        '127.0.0.1',
        'test-agent',
      );

      expect(result.totalCandidates).toBe(1);
      expect(result.deletedCount).toBe(1);
      expect(result.dryRun).toBe(true);

      expect(queryRunner.startTransaction).not.toHaveBeenCalled();
      expect(queryRunner.manager.remove).not.toHaveBeenCalled();
      expect(adminAuditService.logBulkOperation).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      const inactiveUsers = [
        { ...mockUser, id: 'inactive-1', isActive: false },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(inactiveUsers),
      };

      queryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );
      queryRunner.manager.remove.mockRejectedValue(
        new Error('Cannot delete user'),
      );

      const result = await service.cleanupUsers(
        cleanupOptions,
        'admin-1',
        '127.0.0.1',
        'test-agent',
      );

      expect(result.totalCandidates).toBe(1);
      expect(result.deletedCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Cannot delete user');
    });
  });
});

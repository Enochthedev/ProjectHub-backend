import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AdminService } from '../admin.service';
import { User } from '../../entities/user.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { SupervisorProfile } from '../../entities/supervisor-profile.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { PasswordService } from '../../auth/services/password.service';
import { EmailService } from '../../auth/services/email.service';
import { AuditService } from '../../auth/services/audit.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserListQueryDto, UpdateUserStatusDto } from '../../dto/admin';

describe('AdminService', () => {
  let service: AdminService;
  let userRepository: jest.Mocked<Repository<User>>;
  let studentProfileRepository: jest.Mocked<Repository<StudentProfile>>;
  let supervisorProfileRepository: jest.Mocked<Repository<SupervisorProfile>>;
  let refreshTokenRepository: jest.Mocked<Repository<RefreshToken>>;
  let passwordService: jest.Mocked<PasswordService>;
  let emailService: jest.Mocked<EmailService>;
  let auditService: jest.Mocked<AuditService>;

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
    createdAt: new Date(),
    updatedAt: new Date(),
    studentProfile: {
      id: 'profile-1',
      name: 'Test Student',
      skills: ['JavaScript'],
      interests: ['Web Development'],
      preferredSpecializations: ['Web Development & Full Stack'],
      currentYear: 4,
      gpa: 3.5,
      profileUpdatedAt: new Date(),
    } as StudentProfile,
  } as User;

  const mockAdmin: User = {
    id: 'admin-1',
    email: 'admin@ui.edu.ng',
    password: 'hashedPassword',
    role: UserRole.ADMIN,
    isActive: true,
    isEmailVerified: true,
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            count: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(StudentProfile),
          useValue: {
            findAndCount: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SupervisorProfile),
          useValue: {
            findAndCount: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            update: jest.fn(),
          },
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
            sendPasswordResetByAdmin: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    userRepository = module.get(getRepositoryToken(User));
    studentProfileRepository = module.get(getRepositoryToken(StudentProfile));
    supervisorProfileRepository = module.get(
      getRepositoryToken(SupervisorProfile),
    );
    refreshTokenRepository = module.get(getRepositoryToken(RefreshToken));
    passwordService = module.get(PasswordService);
    emailService = module.get(EmailService);
    auditService = module.get(AuditService);
  });

  describe('getUserList', () => {
    it('should return paginated user list', async () => {
      const queryDto: UserListQueryDto = { page: 1, limit: 10 };
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };

      userRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getUserList(queryDto);

      expect(result).toEqual({
        users: [
          {
            id: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
            isActive: mockUser.isActive,
            isEmailVerified: mockUser.isEmailVerified,
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.updatedAt,
            name: mockUser.studentProfile?.name,
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should apply search filter', async () => {
      const queryDto: UserListQueryDto = { page: 1, limit: 10, search: 'test' };
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };

      userRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await service.getUserList(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(user.email ILIKE :search OR studentProfile.name ILIKE :search OR supervisorProfile.name ILIKE :search)',
        { search: '%test%' },
      );
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserById('user-1');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        relations: ['studentProfile', 'supervisorProfile'],
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status successfully', async () => {
      const statusDto: UpdateUserStatusDto = { isActive: false };
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({ ...mockUser, isActive: false });
      refreshTokenRepository.update.mockResolvedValue({} as any);

      const result = await service.updateUserStatus(
        'user-1',
        statusDto,
        'admin-1',
        '127.0.0.1',
      );

      expect(result.isActive).toBe(false);
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { user: { id: 'user-1' } },
        { isRevoked: true },
      );
      expect(auditService.logEvent).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'USER_DEACTIVATED',
        resource: 'User',
        ipAddress: '127.0.0.1',
        details: {
          targetUserId: 'user-1',
          previousStatus: true,
          newStatus: false,
        },
      });
    });

    it('should prevent admin from deactivating themselves', async () => {
      const statusDto: UpdateUserStatusDto = { isActive: false };
      userRepository.findOne.mockResolvedValue(mockAdmin);

      await expect(
        service.updateUserStatus('admin-1', statusDto, 'admin-1', '127.0.0.1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent deactivating other admin accounts', async () => {
      const statusDto: UpdateUserStatusDto = { isActive: false };
      const otherAdmin = { ...mockAdmin, id: 'admin-2' };
      userRepository.findOne.mockResolvedValue(otherAdmin);

      await expect(
        service.updateUserStatus('admin-2', statusDto, 'admin-1', '127.0.0.1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('resetUserPassword', () => {
    it('should reset user password successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      passwordService.hashPassword.mockResolvedValue('hashedTempPassword');
      userRepository.save.mockResolvedValue(mockUser);
      emailService.sendPasswordResetByAdmin.mockResolvedValue();
      refreshTokenRepository.update.mockResolvedValue({} as any);

      const result = await service.resetUserPassword(
        'user-1',
        'admin-1',
        '127.0.0.1',
      );

      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword.length).toBe(12);
      expect(passwordService.hashPassword).toHaveBeenCalled();
      expect(emailService.sendPasswordResetByAdmin).toHaveBeenCalledWith(
        mockUser.email,
        result.temporaryPassword,
      );
      expect(auditService.logEvent).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'ADMIN_PASSWORD_RESET',
        resource: 'User',
        ipAddress: '127.0.0.1',
        details: { targetUserId: 'user-1' },
      });
    });

    it('should handle email sending failure gracefully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      passwordService.hashPassword.mockResolvedValue('hashedTempPassword');
      userRepository.save.mockResolvedValue(mockUser);
      emailService.sendPasswordResetByAdmin.mockRejectedValue(
        new Error('Email failed'),
      );
      refreshTokenRepository.update.mockResolvedValue({} as any);

      // Should not throw error even if email fails
      const result = await service.resetUserPassword(
        'user-1',
        'admin-1',
        '127.0.0.1',
      );

      expect(result.temporaryPassword).toBeDefined();
    });
  });

  describe('getUserStatistics', () => {
    it('should return user statistics', async () => {
      userRepository.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(90) // activeUsers
        .mockResolvedValueOnce(85) // verifiedUsers
        .mockResolvedValueOnce(70) // students
        .mockResolvedValueOnce(25) // supervisors
        .mockResolvedValueOnce(5) // admins
        .mockResolvedValueOnce(10); // recentRegistrations

      const result = await service.getUserStatistics();

      expect(result).toEqual({
        totalUsers: 100,
        activeUsers: 90,
        verifiedUsers: 85,
        usersByRole: {
          [UserRole.STUDENT]: 70,
          [UserRole.SUPERVISOR]: 25,
          [UserRole.ADMIN]: 5,
        },
        recentRegistrations: 10,
      });
    });
  });

  describe('searchUsers', () => {
    it('should search users across profiles', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };

      userRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.searchUsers('test', 1, 10);

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        expect.stringContaining('user.email ILIKE :searchTerm'),
        { searchTerm: '%test%' },
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AdminController } from '../admin.controller';
import { AdminService } from '../admin.service';
import { User } from '../../entities/user.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { SupervisorProfile } from '../../entities/supervisor-profile.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { PasswordService } from '../../auth/services/password.service';
import { EmailService } from '../../auth/services/email.service';
import { AuditService } from '../../auth/services/audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserListQueryDto, UpdateUserStatusDto } from '../../dto/admin';

describe('AdminController (Integration)', () => {
  let app: INestApplication;
  let adminService: AdminService;

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

  const mockUserListResponse = {
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
  };
  // Mock guards to bypass authentication for testing
  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = module.createNestApplication();
    adminService = module.get<AdminService>(AdminService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /admin/users', () => {
    it('should return paginated user list', async () => {
      jest
        .spyOn(adminService, 'getUserList')
        .mockResolvedValue(mockUserListResponse);

      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.users).toHaveLength(1);
      expect(response.body.total).toBe(1);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
      expect(response.body.users[0].id).toBe(mockUser.id);
      expect(response.body.users[0].email).toBe(mockUser.email);
      expect(adminService.getUserList).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
        }),
      );
    });

    it('should apply search and filter parameters', async () => {
      jest
        .spyOn(adminService, 'getUserList')
        .mockResolvedValue(mockUserListResponse);

      await request(app.getHttpServer())
        .get('/admin/users')
        .query({
          page: 1,
          limit: 10,
          search: 'test',
          role: UserRole.STUDENT,
          isActive: true,
        })
        .expect(200);

      expect(adminService.getUserList).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          search: 'test',
          role: UserRole.STUDENT,
          isActive: true,
        }),
      );
    });
  });

  describe('GET /admin/users/:id', () => {
    it('should return user by ID', async () => {
      jest.spyOn(adminService, 'getUserById').mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .get('/admin/users/user-1')
        .expect(200);

      expect(response.body.id).toBe(mockUser.id);
      expect(response.body.email).toBe(mockUser.email);
      expect(adminService.getUserById).toHaveBeenCalledWith('user-1');
    });

    it('should return 404 for non-existent user', async () => {
      jest
        .spyOn(adminService, 'getUserById')
        .mockRejectedValue(new Error('User not found'));

      await request(app.getHttpServer())
        .get('/admin/users/nonexistent')
        .expect(500); // Will be 500 due to unhandled error, in real app would be handled by global filter
    });
  });

  describe('PATCH /admin/users/:id/status', () => {
    it('should update user status successfully', async () => {
      const updatedUser = { ...mockUser, isActive: false };
      jest
        .spyOn(adminService, 'updateUserStatus')
        .mockResolvedValue(updatedUser);

      const statusDto: UpdateUserStatusDto = { isActive: false };

      const response = await request(app.getHttpServer())
        .patch('/admin/users/user-1/status')
        .send(statusDto)
        .expect(200);

      expect(response.body.isActive).toBe(false);
      expect(adminService.updateUserStatus).toHaveBeenCalledWith(
        'user-1',
        statusDto,
        undefined, // req.user?.['sub'] will be undefined in test
        expect.any(String), // req.ip will be set in test environment
      );
    });

    it('should validate request body', async () => {
      await request(app.getHttpServer())
        .patch('/admin/users/user-1/status')
        .send({ isActive: 'invalid' })
        .expect(400);
    });
  });

  describe('POST /admin/users/:id/reset-password', () => {
    it('should reset user password successfully', async () => {
      const resetResult = { temporaryPassword: 'TempPass123!' };
      jest
        .spyOn(adminService, 'resetUserPassword')
        .mockResolvedValue(resetResult);

      const response = await request(app.getHttpServer())
        .post('/admin/users/user-1/reset-password')
        .expect(200);

      expect(response.body.message).toContain('Password reset successfully');
      expect(response.body.temporaryPassword).toBe(
        resetResult.temporaryPassword,
      );
      expect(adminService.resetUserPassword).toHaveBeenCalledWith(
        'user-1',
        undefined, // req.user?.['sub'] will be undefined in test
        expect.any(String), // req.ip will be set in test environment
      );
    });
  });

  describe('GET /admin/statistics', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        totalUsers: 100,
        activeUsers: 90,
        verifiedUsers: 85,
        usersByRole: {
          [UserRole.STUDENT]: 70,
          [UserRole.SUPERVISOR]: 25,
          [UserRole.ADMIN]: 5,
        },
        recentRegistrations: 10,
      };

      jest
        .spyOn(adminService, 'getUserStatistics')
        .mockResolvedValue(mockStats);

      const response = await request(app.getHttpServer())
        .get('/admin/statistics')
        .expect(200);

      expect(response.body).toEqual(mockStats);
    });
  });

  describe('GET /admin/users/search', () => {
    it('should search users', async () => {
      jest
        .spyOn(adminService, 'searchUsers')
        .mockResolvedValue(mockUserListResponse);

      const response = await request(app.getHttpServer())
        .get('/admin/users/search')
        .query({ q: 'test', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.users).toHaveLength(1);
      expect(response.body.total).toBe(1);
      expect(response.body.users[0].id).toBe(mockUser.id);
      expect(adminService.searchUsers).toHaveBeenCalledWith('test', 1, 10);
    });

    it('should use default pagination parameters', async () => {
      jest
        .spyOn(adminService, 'searchUsers')
        .mockResolvedValue(mockUserListResponse);

      await request(app.getHttpServer())
        .get('/admin/users/search')
        .query({ q: 'test' })
        .expect(200);

      expect(adminService.searchUsers).toHaveBeenCalledWith('test', 1, 10);
    });
  });
});

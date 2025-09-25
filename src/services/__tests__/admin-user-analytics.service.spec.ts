import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUserAnalyticsService } from '../admin-user-analytics.service';
import { User } from '../../entities/user.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { SupervisorProfile } from '../../entities/supervisor-profile.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { UserRole } from '../../common/enums/user-role.enum';

describe.skip('AdminUserAnalyticsService', () => {
  let service: AdminUserAnalyticsService;
  let userRepository: jest.Mocked<Repository<User>>;
  let studentProfileRepository: jest.Mocked<Repository<StudentProfile>>;
  let supervisorProfileRepository: jest.Mocked<Repository<SupervisorProfile>>;
  let auditLogRepository: jest.Mocked<Repository<AuditLog>>;

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
      count: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
        getCount: jest.fn(),
        getMany: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUserAnalyticsService,
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
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AdminUserAnalyticsService>(AdminUserAnalyticsService);
    userRepository = module.get(getRepositoryToken(User));
    studentProfileRepository = module.get(getRepositoryToken(StudentProfile));
    supervisorProfileRepository = module.get(
      getRepositoryToken(SupervisorProfile),
    );
    auditLogRepository = module.get(getRepositoryToken(AuditLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserGrowthAnalytics', () => {
    it('should return user growth analytics', async () => {
      // Mock basic counts
      userRepository.count
        .mockResolvedValueOnce(1000) // totalUsers
        .mockResolvedValueOnce(950) // activeUsers
        .mockResolvedValueOnce(900) // verifiedUsers
        .mockResolvedValueOnce(800) // students
        .mockResolvedValueOnce(150) // supervisors
        .mockResolvedValueOnce(50); // admins

      // Mock query builder for growth trend
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { date: '2024-01-01', newUsers: '25' },
          { date: '2024-01-02', newUsers: '30' },
        ]),
      };

      userRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getUserGrowthAnalytics();

      expect(result).toEqual({
        totalUsers: 1000,
        activeUsers: 950,
        verifiedUsers: 900,
        usersByRole: {
          [UserRole.STUDENT]: 800,
          [UserRole.SUPERVISOR]: 150,
          [UserRole.ADMIN]: 50,
        },
        growthTrend: expect.any(Array),
        registrationsByMonth: expect.any(Array),
      });

      expect(userRepository.count).toHaveBeenCalledTimes(6); // 3 basic counts + 3 role counts
    });
  });

  describe('getUserActivityMetrics', () => {
    it('should return user activity metrics', async () => {
      // Mock audit log queries
      const mockAuditQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '100' }),
        getRawMany: jest.fn().mockResolvedValue([
          {
            userId: 'user-1',
            email: 'test@ui.edu.ng',
            role: UserRole.STUDENT,
            activityScore: '50',
            lastActive: new Date(),
          },
        ]),
      };

      auditLogRepository.createQueryBuilder.mockReturnValue(
        mockAuditQueryBuilder as any,
      );
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserActivityMetrics();

      expect(result).toEqual({
        dailyActiveUsers: 100,
        weeklyActiveUsers: 100,
        monthlyActiveUsers: 100,
        averageSessionDuration: 0,
        topActiveUsers: expect.any(Array),
        activityByHour: expect.any(Array),
        activityByDay: expect.any(Array),
      });
    });
  });

  describe('getUserEngagementMetrics', () => {
    it('should return user engagement metrics', async () => {
      userRepository.count
        .mockResolvedValueOnce(1000) // totalUsers
        .mockResolvedValueOnce(900); // verifiedUsers

      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(850), // usersWithProfiles
      };

      userRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );
      userRepository.find.mockResolvedValue([mockUser]);

      const result = await service.getUserEngagementMetrics();

      expect(result).toEqual({
        profileCompletionRate: 85,
        emailVerificationRate: 90,
        averageProfileCompleteness: expect.any(Number),
        engagementByRole: expect.any(Object),
        retentionRates: expect.any(Object),
      });
    });
  });

  describe('getUserDemographicAnalysis', () => {
    it('should return user demographic analysis', async () => {
      userRepository.count
        .mockResolvedValueOnce(1000) // totalUsers
        .mockResolvedValueOnce(800) // students
        .mockResolvedValueOnce(150) // supervisors
        .mockResolvedValueOnce(50); // admins

      studentProfileRepository.count.mockResolvedValue(800);
      supervisorProfileRepository.count
        .mockResolvedValueOnce(150) // totalSupervisors
        .mockResolvedValueOnce(140); // availableSupervisors

      // Mock query builders for detailed analytics
      const mockStudentQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ average: '6.5' }),
      };

      studentProfileRepository.createQueryBuilder.mockReturnValue(
        mockStudentQueryBuilder as any,
      );
      supervisorProfileRepository.createQueryBuilder.mockReturnValue(
        mockStudentQueryBuilder as any,
      );

      const result = await service.getUserDemographicAnalysis();

      expect(result).toEqual({
        roleDistribution: expect.any(Array),
        studentAnalytics: expect.any(Object),
        supervisorAnalytics: expect.any(Object),
      });

      expect(result.roleDistribution).toHaveLength(3);
      expect(result.roleDistribution[0]).toHaveProperty('role');
      expect(result.roleDistribution[0]).toHaveProperty('count');
      expect(result.roleDistribution[0]).toHaveProperty('percentage');
    });
  });

  describe('generateComprehensiveReport', () => {
    it('should generate a comprehensive report with all metrics', async () => {
      // Mock all the required methods
      jest.spyOn(service, 'getUserGrowthAnalytics').mockResolvedValue({
        totalUsers: 1000,
        activeUsers: 950,
        verifiedUsers: 900,
        usersByRole: {
          [UserRole.STUDENT]: 800,
          [UserRole.SUPERVISOR]: 150,
          [UserRole.ADMIN]: 50,
        },
        growthTrend: [],
        registrationsByMonth: [],
      });

      jest.spyOn(service, 'getUserActivityMetrics').mockResolvedValue({
        dailyActiveUsers: 100,
        weeklyActiveUsers: 300,
        monthlyActiveUsers: 800,
        averageSessionDuration: 25,
        topActiveUsers: [],
        activityByHour: [],
        activityByDay: [],
      });

      jest.spyOn(service, 'getUserEngagementMetrics').mockResolvedValue({
        profileCompletionRate: 85,
        emailVerificationRate: 90,
        averageProfileCompleteness: 78,
        engagementByRole: {} as any,
        retentionRates: { day1: 85, day7: 70, day30: 60 },
      });

      jest.spyOn(service, 'getUserDemographicAnalysis').mockResolvedValue({
        roleDistribution: [],
        studentAnalytics: {} as any,
        supervisorAnalytics: {} as any,
      });

      // Mock user count for summary
      userRepository.count.mockResolvedValue(1000);

      const result = await service.generateComprehensiveReport({
        metrics: ['growth', 'activity', 'engagement', 'demographics'],
      });

      expect(result).toEqual({
        reportId: expect.stringContaining('user-report-'),
        generatedAt: expect.any(Date),
        period: {
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        },
        summary: {
          totalUsers: expect.any(Number),
          activeUsers: expect.any(Number),
          newUsers: expect.any(Number),
          growthRate: expect.any(Number),
        },
        growth: expect.any(Object),
        activity: expect.any(Object),
        engagement: expect.any(Object),
        demographics: expect.any(Object),
      });
    });

    it('should generate a report with only requested metrics', async () => {
      jest
        .spyOn(service, 'getUserGrowthAnalytics')
        .mockResolvedValue({} as any);
      userRepository.count.mockResolvedValue(1000);

      const result = await service.generateComprehensiveReport({
        metrics: ['growth'],
      });

      expect(result).toHaveProperty('growth');
      expect(result).not.toHaveProperty('activity');
      expect(result).not.toHaveProperty('engagement');
      expect(result).not.toHaveProperty('demographics');
    });
  });
});

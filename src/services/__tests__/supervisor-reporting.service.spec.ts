import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupervisorReportingService } from '../supervisor-reporting.service';
import { MilestoneAnalyticsService } from '../milestone-analytics.service';
import { Milestone } from '../../entities/milestone.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { MilestoneStatus, Priority, UserRole } from '../../common/enums';

describe('SupervisorReportingService', () => {
  let service: SupervisorReportingService;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let analyticsService: jest.Mocked<MilestoneAnalyticsService>;

  const mockSupervisor: Partial<User> = {
    id: 'supervisor-1',
    email: 'jane.smith@university.edu',
    role: UserRole.SUPERVISOR,
    supervisorProfile: {
      name: 'Dr. Jane Smith',
    } as any,
  };

  const mockStudents: Partial<User>[] = [
    {
      id: 'student-1',
      email: 'john.doe@university.edu',
      role: UserRole.STUDENT,
      studentProfile: {
        name: 'John Doe',
      } as any,
    },
    {
      id: 'student-2',
      email: 'jane.wilson@university.edu',
      role: UserRole.STUDENT,
      studentProfile: {
        name: 'Jane Wilson',
      } as any,
    },
  ];

  const mockProjects: Partial<Project>[] = [
    {
      id: 'project-1',
      title: 'AI Research Project',
      supervisorId: 'supervisor-1',
    },
    {
      id: 'project-2',
      title: 'Web Development Project',
      supervisorId: 'supervisor-1',
    },
  ];

  const mockMilestones: Partial<Milestone>[] = [
    {
      id: 'milestone-1',
      title: 'Literature Review',
      studentId: 'student-1',
      status: MilestoneStatus.COMPLETED,
      priority: Priority.HIGH,
      dueDate: new Date('2024-03-15'),
      estimatedHours: 20,
      actualHours: 18,
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-03-10'),
      completedAt: new Date('2024-03-10'),
      isOverdue: () => false,
      student: {
        ...mockStudents[0],
        studentProfile: { name: 'John Doe' },
      } as User,
      project: mockProjects[0] as Project,
    },
    {
      id: 'milestone-2',
      title: 'System Design',
      studentId: 'student-1',
      status: MilestoneStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      dueDate: new Date('2024-03-30'),
      estimatedHours: 30,
      actualHours: 15,
      createdAt: new Date('2024-02-16'),
      updatedAt: new Date('2024-03-01'),
      completedAt: null,
      isOverdue: () => false,
      student: {
        ...mockStudents[0],
        studentProfile: { name: 'John Doe' },
      } as User,
      project: mockProjects[0] as Project,
    },
    {
      id: 'milestone-3',
      title: 'Frontend Development',
      studentId: 'student-2',
      status: MilestoneStatus.NOT_STARTED,
      priority: Priority.CRITICAL,
      dueDate: new Date('2024-02-15'), // Overdue
      estimatedHours: 40,
      actualHours: 0,
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01'),
      completedAt: null,
      isOverdue: () => true,
      student: {
        ...mockStudents[1],
        studentProfile: { name: 'Jane Wilson' },
      } as User,
      project: mockProjects[1] as Project,
    },
  ];

  const mockAnalytics = {
    studentId: 'student-1',
    velocity: {
      periodDays: 90,
      totalMilestones: 2,
      completedMilestones: 1,
      completionRate: 50,
      weeklyVelocity: 0.5,
      averageCompletionTime: 14,
      velocityTrend: [],
      prediction: {
        estimatedWeeksToCompletion: 2,
        estimatedCompletionDate: '2024-04-15',
        confidence: 'medium' as const,
        assumptions: [],
      },
      lastUpdated: '2024-03-15T10:30:00Z',
    },
    trends: {
      periodDays: 90,
      completionTrend: {
        totalMilestones: 2,
        completedMilestones: 1,
        completionRate: 50,
        trend: 'stable' as const,
      },
      workloadTrend: {
        totalEstimatedHours: 50,
        totalActualHours: 33,
        efficiencyRatio: 0.66,
        trend: 'stable' as const,
      },
      qualityTrend: {
        avgNotesPerMilestone: 1,
        documentationScore: 20,
        trend: 'stable' as const,
      },
      priorityTrend: {
        distribution: {},
        highPriorityRatio: 0.5,
        trend: 'stable' as const,
      },
      trendIndicators: {
        completionTrend: 'positive' as const,
        qualityTrend: 'neutral' as const,
        velocityTrend: 'neutral' as const,
        riskTrend: 'stable' as const,
      },
      insights: [],
      lastUpdated: '2024-03-15T10:30:00Z',
    },
    criticalPath: {
      criticalMilestones: [],
      criticalPath: [],
      bottlenecks: [],
      riskFactors: {
        overdueMilestones: 0,
        blockedMilestones: 0,
        highPriorityMilestones: 1,
        riskScore: 0.2,
      },
      recommendations: [],
      totalCriticalHours: 0,
      estimatedCompletionDate: null,
      lastUpdated: '2024-03-15T10:30:00Z',
    },
    comparison: null,
    performanceScore: 75,
    productivityMetrics: {
      totalEstimatedHours: 50,
      totalActualHours: 33,
      efficiencyRatio: 0.66,
      productivityScore: 75,
      timeAccuracy: 34,
    },
    keyInsights: ['Good progress on milestones'],
    generatedAt: '2024-03-15T10:30:00Z',
  };

  beforeEach(async () => {
    const mockMilestoneRepository = {
      find: jest.fn().mockResolvedValue(mockMilestones),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockMilestones),
      }),
    };

    const mockUserRepository = {
      findOne: jest.fn().mockResolvedValue(mockSupervisor),
    };

    const mockProjectRepository = {
      find: jest.fn().mockResolvedValue(mockProjects),
    };

    const mockAnalyticsService = {
      generateAnalyticsMetrics: jest.fn().mockResolvedValue(mockAnalytics),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupervisorReportingService,
        {
          provide: getRepositoryToken(Milestone),
          useValue: mockMilestoneRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: MilestoneAnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    service = module.get<SupervisorReportingService>(
      SupervisorReportingService,
    );
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    userRepository = module.get(getRepositoryToken(User));
    projectRepository = module.get(getRepositoryToken(Project));
    analyticsService = module.get(MilestoneAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSupervisorDashboard', () => {
    it('should generate supervisor dashboard successfully', async () => {
      const result = await service.getSupervisorDashboard('supervisor-1');

      expect(result).toBeDefined();
      expect(result.supervisorId).toBe('supervisor-1');
      expect(result.supervisorName).toBe('Dr. Jane Smith');
      expect(result.totalStudents).toBe(2);
      expect(result.metrics).toBeDefined();
      expect(result.studentSummaries).toBeDefined();
      expect(result.atRiskStudents).toBeDefined();
      expect(result.recentActivity).toBeDefined();
      expect(result.upcomingDeadlines).toBeDefined();
    });

    it('should handle supervisor not found', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.getSupervisorDashboard('nonexistent-supervisor'),
      ).rejects.toThrow('Supervisor not found or invalid role');
    });

    it('should return empty dashboard for supervisor with no students', async () => {
      (milestoneRepository.find as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.getSupervisorDashboard('supervisor-1');

      expect(result.totalStudents).toBe(0);
      expect(result.studentSummaries).toHaveLength(0);
      expect(result.atRiskStudents).toHaveLength(0);
    });

    it('should calculate dashboard metrics correctly', async () => {
      const result = await service.getSupervisorDashboard('supervisor-1');

      expect(result.metrics.totalMilestones).toBe(3);
      expect(result.metrics.completedMilestones).toBe(1);
      expect(result.metrics.overdueMilestones).toBe(1);
      expect(result.metrics.blockedMilestones).toBe(0);
      expect(result.metrics.overallCompletionRate).toBeCloseTo(33.33, 1);
    });
  });

  describe('getStudentProgressSummaries', () => {
    it('should generate student progress summaries', async () => {
      const result = await service.getStudentProgressSummaries('supervisor-1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);

      const student1Summary = result.find((s) => s.studentId === 'student-1');
      expect(student1Summary).toBeDefined();
      expect(student1Summary?.studentName).toBe('John Doe');
      expect(student1Summary?.totalMilestones).toBe(3); // All milestones are returned for each student in the mock
      expect(student1Summary?.completedMilestones).toBe(1);
    });

    it('should sort summaries by risk score descending', async () => {
      const result = await service.getStudentProgressSummaries('supervisor-1');

      // Student 2 should have higher risk score due to overdue milestone
      expect(result[0].riskScore).toBeGreaterThanOrEqual(result[1].riskScore);
    });

    it('should calculate risk scores correctly', async () => {
      const result = await service.getStudentProgressSummaries('supervisor-1');

      const student2Summary = result.find((s) => s.studentId === 'student-2');
      expect(student2Summary?.riskScore).toBeGreaterThan(0); // Should have risk due to overdue milestone
    });
  });

  describe('identifyAtRiskStudents', () => {
    it('should identify at-risk students correctly', async () => {
      const result = await service.identifyAtRiskStudents('supervisor-1');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // Student 2 should be at risk due to overdue milestone
      const atRiskStudent = result.find((s) => s.studentId === 'student-2');
      expect(atRiskStudent).toBeDefined();
      expect(atRiskStudent?.riskLevel).toMatch(/^(low|medium|high)$/);
    });

    it('should provide risk factors for at-risk students', async () => {
      const result = await service.identifyAtRiskStudents('supervisor-1');

      const atRiskStudent = result.find((s) => s.studentId === 'student-2');
      expect(atRiskStudent?.riskFactors).toBeDefined();
      expect(atRiskStudent?.riskFactors.length).toBeGreaterThan(0);
    });

    it('should provide recommended actions', async () => {
      const result = await service.identifyAtRiskStudents('supervisor-1');

      const atRiskStudent = result.find((s) => s.studentId === 'student-2');
      expect(atRiskStudent?.recommendedActions).toBeDefined();
      expect(atRiskStudent?.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should sort by urgency score descending', async () => {
      const result = await service.identifyAtRiskStudents('supervisor-1');

      if (result.length > 1) {
        expect(result[0].urgencyScore).toBeGreaterThanOrEqual(
          result[1].urgencyScore,
        );
      }
    });
  });

  describe('generateProgressReport', () => {
    it('should generate progress report successfully', async () => {
      const result = await service.generateProgressReport('supervisor-1');

      expect(result).toBeDefined();
      expect(result.reportId).toBeDefined();
      expect(result.supervisorId).toBe('supervisor-1');
      expect(result.metrics).toBeDefined();
      expect(result.studentData).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should apply filters correctly', async () => {
      const filters = {
        studentIds: ['student-1'],
        status: MilestoneStatus.COMPLETED,
      };

      const result = await service.generateProgressReport(
        'supervisor-1',
        filters,
      );

      expect(result.filters).toEqual(filters);
      expect(result.studentData.length).toBeLessThanOrEqual(1);
    });

    it('should calculate report summary correctly', async () => {
      const result = await service.generateProgressReport('supervisor-1');

      expect(result.summary.totalStudents).toBe(2);
      expect(result.summary.totalMilestones).toBe(3);
      expect(result.summary.completionRate).toBeCloseTo(33.33, 1);
    });
  });

  describe('exportProgressReport', () => {
    it('should export report in CSV format', async () => {
      const result = await service.exportProgressReport('supervisor-1', 'csv');

      expect(result).toBeDefined();
      expect(result.format).toBe('csv');
      expect(result.filename).toContain('.csv');
      expect(result.mimeType).toBe('text/csv');
      expect(result.content).toBeDefined();
    });

    it('should export report in PDF format', async () => {
      const result = await service.exportProgressReport('supervisor-1', 'pdf');

      expect(result).toBeDefined();
      expect(result.format).toBe('pdf');
      expect(result.filename).toContain('.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.content).toBeDefined();
    });

    it('should apply filters to exported report', async () => {
      const filters = { studentIds: ['student-1'] };
      const result = await service.exportProgressReport(
        'supervisor-1',
        'csv',
        filters,
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('getStudentMilestoneOverview', () => {
    it('should get student milestone overview successfully', async () => {
      const result = await service.getStudentMilestoneOverview(
        'supervisor-1',
        'student-1',
      );

      expect(result).toBeDefined();
      expect(result.studentId).toBe('student-1');
      expect(result.studentName).toBe('John Doe');
      expect(result.milestones).toBeDefined();
      expect(result.analytics).toBeDefined();
      expect(result.progressSummary).toBeDefined();
    });

    it('should verify supervisor access to student', async () => {
      await expect(
        service.getStudentMilestoneOverview(
          'supervisor-1',
          'unauthorized-student',
        ),
      ).rejects.toThrow('Supervisor does not have access to this student');
    });

    it('should include detailed milestone information', async () => {
      const result = await service.getStudentMilestoneOverview(
        'supervisor-1',
        'student-1',
      );

      expect(result.milestones.length).toBeGreaterThan(0);

      const milestone = result.milestones[0];
      expect(milestone.id).toBeDefined();
      expect(milestone.title).toBeDefined();
      expect(milestone.status).toBeDefined();
      expect(milestone.priority).toBeDefined();
      expect(milestone.dueDate).toBeDefined();
    });
  });

  describe('getSupervisorAnalytics', () => {
    it('should generate supervisor analytics successfully', async () => {
      const result = await service.getSupervisorAnalytics('supervisor-1');

      expect(result).toBeDefined();
      expect(result.supervisorId).toBe('supervisor-1');
      expect(result.totalStudents).toBe(2);
      expect(result.overallMetrics).toBeDefined();
      expect(result.studentPerformance).toBeDefined();
      expect(result.trendAnalysis).toBeDefined();
      expect(result.benchmarks).toBeDefined();
      expect(result.insights).toBeDefined();
    });

    it('should handle supervisor with no students', async () => {
      (milestoneRepository.find as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.getSupervisorAnalytics('supervisor-1');

      expect(result.totalStudents).toBe(0);
      expect(result.overallMetrics.totalMilestones).toBe(0);
    });

    it('should provide meaningful insights', async () => {
      const result = await service.getSupervisorAnalytics('supervisor-1');

      expect(Array.isArray(result.insights)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      (milestoneRepository.find as jest.Mock).mockRejectedValueOnce(
        new Error('Database error'),
      );

      await expect(
        service.getSupervisorDashboard('supervisor-1'),
      ).rejects.toThrow('Database error');
    });

    it('should handle invalid supervisor role', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.getSupervisorDashboard('supervisor-1'),
      ).rejects.toThrow('Supervisor not found or invalid role');
    });
  });

  describe('helper methods', () => {
    it('should calculate student risk score correctly', async () => {
      const summaries =
        await service.getStudentProgressSummaries('supervisor-1');

      summaries.forEach((summary) => {
        expect(summary.riskScore).toBeGreaterThanOrEqual(0);
        expect(summary.riskScore).toBeLessThanOrEqual(1);
      });
    });

    it('should identify upcoming deadlines correctly', async () => {
      const dashboard = await service.getSupervisorDashboard('supervisor-1');

      dashboard.upcomingDeadlines.forEach((deadline) => {
        expect(deadline.daysUntilDue).toBeGreaterThanOrEqual(0);
        expect(deadline.daysUntilDue).toBeLessThanOrEqual(7);
      });
    });

    it('should track recent activity correctly', async () => {
      const dashboard = await service.getSupervisorDashboard('supervisor-1');

      dashboard.recentActivity.forEach((activity) => {
        expect(activity.studentId).toBeDefined();
        expect(activity.activity).toBeDefined();
        expect(activity.timestamp).toBeDefined();
      });
    });
  });
});

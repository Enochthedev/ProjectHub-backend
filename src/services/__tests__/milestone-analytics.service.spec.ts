import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MilestoneAnalyticsService } from '../milestone-analytics.service';
import { Milestone } from '../../entities/milestone.entity';
import { MilestoneTemplate } from '../../entities/milestone-template.entity';
import { User } from '../../entities/user.entity';
import { MilestoneStatus, Priority } from '../../common/enums';

describe('MilestoneAnalyticsService', () => {
  let service: MilestoneAnalyticsService;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let templateRepository: jest.Mocked<Repository<MilestoneTemplate>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockMilestones: Partial<Milestone>[] = [
    {
      id: 'milestone-1',
      title: 'Literature Review',
      studentId: 'student-1',
      status: MilestoneStatus.COMPLETED,
      priority: Priority.HIGH,
      estimatedHours: 20,
      actualHours: 18,
      dueDate: new Date('2024-03-15'),
      createdAt: new Date('2024-02-01'),
      completedAt: new Date(), // Completed today (within the 90-day period)
      updatedAt: new Date('2024-03-10'),
      isOverdue: () => false,
      notes: [],
    },
    {
      id: 'milestone-2',
      title: 'System Design',
      studentId: 'student-1',
      status: MilestoneStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      estimatedHours: 30,
      actualHours: 15,
      dueDate: new Date('2024-03-30'),
      createdAt: new Date('2024-02-16'),
      completedAt: null,
      updatedAt: new Date('2024-03-01'),
      isOverdue: () => false,
      notes: [],
    },
    {
      id: 'milestone-3',
      title: 'Implementation',
      studentId: 'student-1',
      status: MilestoneStatus.NOT_STARTED,
      priority: Priority.CRITICAL,
      estimatedHours: 50,
      actualHours: 0,
      dueDate: new Date('2024-04-15'),
      createdAt: new Date('2024-03-01'),
      completedAt: null,
      updatedAt: new Date('2024-03-01'),
      isOverdue: () => true,
      notes: [],
    },
  ];

  const mockTemplate: Partial<MilestoneTemplate> = {
    id: 'template-1',
    name: 'AI/ML Project Template',
    estimatedDurationWeeks: 20,
    milestoneItems: [
      {
        title: 'Literature Review',
        description: 'Complete comprehensive literature review',
        daysFromStart: 0,
        priority: Priority.HIGH,
        estimatedHours: 20,
      },
      {
        title: 'System Design',
        description: 'Design system architecture',
        daysFromStart: 14,
        priority: Priority.MEDIUM,
        estimatedHours: 30,
      },
      {
        title: 'Implementation',
        description: 'Implement core features',
        daysFromStart: 30,
        priority: Priority.CRITICAL,
        estimatedHours: 50,
      },
    ],
    usageCount: 10,
    isActive: true,
  };

  beforeEach(async () => {
    const mockMilestoneRepository = {
      find: jest.fn().mockResolvedValue(mockMilestones),
    };

    const mockTemplateRepository = {
      findOne: jest.fn().mockResolvedValue(mockTemplate),
      find: jest.fn().mockResolvedValue([mockTemplate]),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneAnalyticsService,
        {
          provide: getRepositoryToken(Milestone),
          useValue: mockMilestoneRepository,
        },
        {
          provide: getRepositoryToken(MilestoneTemplate),
          useValue: mockTemplateRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<MilestoneAnalyticsService>(MilestoneAnalyticsService);
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    templateRepository = module.get(getRepositoryToken(MilestoneTemplate));
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateCompletionVelocity', () => {
    it('should calculate completion velocity correctly', async () => {
      const result = await service.calculateCompletionVelocity('student-1', 90);

      expect(result).toBeDefined();
      expect(result.periodDays).toBe(90);
      expect(result.totalMilestones).toBe(3);
      expect(result.completedMilestones).toBe(1);
      expect(result.completionRate).toBeCloseTo(33.33, 1);
      expect(result.weeklyVelocity).toBeGreaterThanOrEqual(0);
      expect(result.velocityTrend).toBeDefined();
      expect(result.prediction).toBeDefined();
    });

    it('should handle empty milestone list', async () => {
      (milestoneRepository.find as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.calculateCompletionVelocity('student-1');

      expect(result.totalMilestones).toBe(0);
      expect(result.completedMilestones).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.weeklyVelocity).toBe(0);
    });

    it('should calculate average completion time correctly', async () => {
      const result = await service.calculateCompletionVelocity('student-1');

      expect(result.averageCompletionTime).toBeGreaterThanOrEqual(0);
    });

    it('should generate velocity trend data', async () => {
      const result = await service.calculateCompletionVelocity('student-1');

      expect(result.velocityTrend).toBeDefined();
      expect(Array.isArray(result.velocityTrend)).toBe(true);

      result.velocityTrend.forEach((trend) => {
        expect(trend.weekStart).toBeDefined();
        expect(trend.weekEnd).toBeDefined();
        expect(trend.completedMilestones).toBeGreaterThanOrEqual(0);
        expect(trend.velocity).toBeGreaterThanOrEqual(0);
      });
    });

    it('should provide future completion prediction', async () => {
      const result = await service.calculateCompletionVelocity('student-1');

      expect(result.prediction).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(result.prediction.confidence);
      expect(Array.isArray(result.prediction.assumptions)).toBe(true);
    });
  });

  describe('analyzeTrends', () => {
    it('should analyze trends correctly', async () => {
      const result = await service.analyzeTrends('student-1', 90);

      expect(result).toBeDefined();
      expect(result.periodDays).toBe(90);
      expect(result.completionTrend).toBeDefined();
      expect(result.workloadTrend).toBeDefined();
      expect(result.qualityTrend).toBeDefined();
      expect(result.priorityTrend).toBeDefined();
      expect(result.trendIndicators).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
    });

    it('should calculate completion trend metrics', async () => {
      const result = await service.analyzeTrends('student-1');

      expect(result.completionTrend.totalMilestones).toBe(3);
      expect(result.completionTrend.completedMilestones).toBe(1);
      expect(result.completionTrend.completionRate).toBeCloseTo(33.33, 1);
      expect(['improving', 'stable', 'declining']).toContain(
        result.completionTrend.trend,
      );
    });

    it('should calculate workload trend metrics', async () => {
      const result = await service.analyzeTrends('student-1');

      expect(result.workloadTrend.totalEstimatedHours).toBe(100); // 20 + 30 + 50
      expect(result.workloadTrend.totalActualHours).toBe(33); // 18 + 15 + 0
      expect(result.workloadTrend.efficiencyRatio).toBeCloseTo(0.33, 1);
      expect(['improving', 'stable', 'declining']).toContain(
        result.workloadTrend.trend,
      );
    });

    it('should analyze priority distribution', async () => {
      const result = await service.analyzeTrends('student-1');

      expect(result.priorityTrend.distribution).toBeDefined();
      expect(result.priorityTrend.highPriorityRatio).toBeGreaterThanOrEqual(0);
      expect(result.priorityTrend.highPriorityRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('performCriticalPathAnalysis', () => {
    it('should perform critical path analysis', async () => {
      const result = await service.performCriticalPathAnalysis('student-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result.criticalMilestones)).toBe(true);
      expect(Array.isArray(result.criticalPath)).toBe(true);
      expect(Array.isArray(result.bottlenecks)).toBe(true);
      expect(result.riskFactors).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should identify critical milestones correctly', async () => {
      const result = await service.performCriticalPathAnalysis('student-1');

      // Should identify milestone-3 as critical (CRITICAL priority and overdue)
      const criticalMilestone = result.criticalMilestones.find(
        (m) => m.id === 'milestone-3',
      );
      expect(criticalMilestone).toBeDefined();
      expect(criticalMilestone?.priority).toBe(Priority.CRITICAL);
      expect(criticalMilestone?.isOverdue).toBe(true);
    });

    it('should calculate risk factors', async () => {
      const result = await service.performCriticalPathAnalysis('student-1');

      expect(result.riskFactors.overdueMilestones).toBeGreaterThanOrEqual(0);
      expect(result.riskFactors.blockedMilestones).toBeGreaterThanOrEqual(0);
      expect(result.riskFactors.highPriorityMilestones).toBeGreaterThanOrEqual(
        0,
      );
      expect(result.riskFactors.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should provide recommendations', async () => {
      const result = await service.performCriticalPathAnalysis('student-1');

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('compareProgressWithTemplate', () => {
    it('should compare progress with template', async () => {
      const result = await service.compareProgressWithTemplate(
        'student-1',
        'template-1',
      );

      expect(result).toBeDefined();
      expect(result.templateId).toBe('template-1');
      expect(result.templateName).toBe('AI/ML Project Template');
      expect(result.currentProgress).toBeDefined();
      expect(result.expectedProgress).toBeDefined();
      expect(result.comparison).toBeDefined();
      expect(result.benchmark).toBeDefined();
    });

    it('should calculate current progress metrics', async () => {
      const result = await service.compareProgressWithTemplate(
        'student-1',
        'template-1',
      );

      expect(result.currentProgress.completedMilestones).toBe(1);
      expect(result.currentProgress.totalMilestones).toBe(3);
      expect(result.currentProgress.completionRate).toBeCloseTo(33.33, 1);
    });

    it('should identify progress deviations', async () => {
      const result = await service.compareProgressWithTemplate(
        'student-1',
        'template-1',
      );

      expect(Array.isArray(result.deviations)).toBe(true);
      result.deviations.forEach((deviation) => {
        expect(deviation.type).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(deviation.severity);
        expect(deviation.description).toBeDefined();
      });
    });

    it('should provide progress recommendations', async () => {
      const result = await service.compareProgressWithTemplate(
        'student-1',
        'template-1',
      );

      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should handle missing template', async () => {
      (templateRepository.findOne as jest.Mock).mockResolvedValueOnce(null);
      (templateRepository.find as jest.Mock).mockResolvedValueOnce([]);

      await expect(
        service.compareProgressWithTemplate(
          'student-1',
          'nonexistent-template',
        ),
      ).rejects.toThrow('No suitable template found for comparison');
    });
  });

  describe('generateAnalyticsMetrics', () => {
    it('should generate comprehensive analytics metrics', async () => {
      const result = await service.generateAnalyticsMetrics('student-1');

      expect(result).toBeDefined();
      expect(result.studentId).toBe('student-1');
      expect(result.velocity).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(result.criticalPath).toBeDefined();
      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.performanceScore).toBeLessThanOrEqual(100);
      expect(result.productivityMetrics).toBeDefined();
      expect(Array.isArray(result.keyInsights)).toBe(true);
    });

    it('should calculate performance score correctly', async () => {
      const result = await service.generateAnalyticsMetrics('student-1');

      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.performanceScore).toBeLessThanOrEqual(100);
    });

    it('should calculate productivity metrics', async () => {
      const result = await service.generateAnalyticsMetrics('student-1');

      expect(result.productivityMetrics.totalEstimatedHours).toBe(100);
      expect(result.productivityMetrics.totalActualHours).toBe(33);
      expect(result.productivityMetrics.efficiencyRatio).toBeCloseTo(0.33, 1);
      expect(
        result.productivityMetrics.productivityScore,
      ).toBeGreaterThanOrEqual(0);
      expect(result.productivityMetrics.timeAccuracy).toBeGreaterThanOrEqual(0);
    });

    it('should generate key insights', async () => {
      const result = await service.generateAnalyticsMetrics('student-1');

      expect(result.keyInsights).toBeDefined();
      expect(result.keyInsights.length).toBeGreaterThan(0);
    });

    it('should handle template comparison failure gracefully', async () => {
      (templateRepository.findOne as jest.Mock).mockResolvedValueOnce(null);
      (templateRepository.find as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.generateAnalyticsMetrics('student-1');

      expect(result).toBeDefined();
      expect(result.comparison).toBeNull();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle milestones without completion dates', async () => {
      const milestonesWithoutDates = mockMilestones.map((m) => ({
        ...m,
        completedAt: null,
      }));

      (milestoneRepository.find as jest.Mock).mockResolvedValueOnce(
        milestonesWithoutDates,
      );

      const result = await service.calculateCompletionVelocity('student-1');

      expect(result.completedMilestones).toBe(0);
      expect(result.averageCompletionTime).toBe(0);
    });

    it('should handle repository errors gracefully', async () => {
      (milestoneRepository.find as jest.Mock).mockRejectedValueOnce(
        new Error('Database error'),
      );

      await expect(
        service.calculateCompletionVelocity('student-1'),
      ).rejects.toThrow('Database error');
    });

    it('should handle zero velocity scenarios', async () => {
      const noCompletedMilestones = mockMilestones.map((m) => ({
        ...m,
        status: MilestoneStatus.NOT_STARTED,
        completedAt: null,
      }));

      (milestoneRepository.find as jest.Mock).mockResolvedValueOnce(
        noCompletedMilestones,
      );

      const result = await service.calculateCompletionVelocity('student-1');

      expect(result.weeklyVelocity).toBe(0);
      expect(result.prediction.estimatedWeeksToCompletion).toBeNull();
      expect(result.prediction.confidence).toBe('low');
    });

    it('should calculate prediction confidence correctly', async () => {
      // Test with few completed milestones (low confidence)
      const fewCompleted = [mockMilestones[0]];
      (milestoneRepository.find as jest.Mock).mockResolvedValueOnce(
        fewCompleted,
      );

      const result = await service.calculateCompletionVelocity('student-1');
      expect(result.prediction.confidence).toBe('low');
    });
  });
});

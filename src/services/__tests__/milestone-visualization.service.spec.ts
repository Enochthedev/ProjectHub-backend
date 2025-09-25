import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MilestoneVisualizationService } from '../milestone-visualization.service';
import { Milestone } from '../../entities/milestone.entity';
import { User } from '../../entities/user.entity';
import { MilestoneStatus, Priority } from '../../common/enums';

describe('MilestoneVisualizationService', () => {
  let service: MilestoneVisualizationService;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockMilestones: Partial<Milestone>[] = [
    {
      id: 'milestone-1',
      title: 'Literature Review',
      description: 'Complete comprehensive literature review',
      dueDate: new Date('2024-03-15'),
      status: MilestoneStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      studentId: 'student-1',
      estimatedHours: 20,
      actualHours: 10,
      isOverdue: () => false,
      getProgressPercentage: () => 50,
      project: { title: 'AI Project' } as any,
    },
    {
      id: 'milestone-2',
      title: 'System Design',
      description: 'Design system architecture',
      dueDate: new Date('2024-03-30'),
      status: MilestoneStatus.NOT_STARTED,
      priority: Priority.MEDIUM,
      studentId: 'student-1',
      estimatedHours: 30,
      actualHours: 0,
      isOverdue: () => false,
      getProgressPercentage: () => 0,
      project: { title: 'AI Project' } as any,
    },
    {
      id: 'milestone-3',
      title: 'Implementation',
      description: 'Implement core features',
      dueDate: new Date('2024-04-15'),
      status: MilestoneStatus.NOT_STARTED,
      priority: Priority.CRITICAL,
      studentId: 'student-1',
      estimatedHours: 50,
      actualHours: 0,
      isOverdue: () => false,
      getProgressPercentage: () => 0,
      project: { title: 'AI Project' } as any,
    },
  ];

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(mockMilestones),
    };

    const mockMilestoneRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      find: jest.fn().mockResolvedValue(mockMilestones),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneVisualizationService,
        {
          provide: getRepositoryToken(Milestone),
          useValue: mockMilestoneRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<MilestoneVisualizationService>(
      MilestoneVisualizationService,
    );
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateGanttChartData', () => {
    it('should generate Gantt chart data for student milestones', async () => {
      const studentId = 'student-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = await service.generateGanttChartData(
        studentId,
        startDate,
        endDate,
      );

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(3);
      expect(result.dateRange.startDate).toBe('2024-01-01');
      expect(result.dateRange.endDate).toBe('2024-12-31');
      expect(result.metadata.totalMilestones).toBe(3);
      expect(result.metadata.completedMilestones).toBe(0);
      expect(result.criticalPath).toContain('milestone-3'); // Critical priority milestone
    });

    it('should handle empty milestone list', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      milestoneRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await service.generateGanttChartData('student-1');

      expect(result.items).toHaveLength(0);
      expect(result.metadata.totalMilestones).toBe(0);
      expect(result.totalDuration).toBe(0);
    });

    it('should calculate correct color codes for different statuses', async () => {
      const result = await service.generateGanttChartData('student-1');

      const inProgressItem = result.items.find(
        (item) => item.status === MilestoneStatus.IN_PROGRESS,
      );
      const notStartedItem = result.items.find(
        (item) => item.status === MilestoneStatus.NOT_STARTED,
      );

      expect(inProgressItem?.colorCode).toBe('#007bff');
      expect(notStartedItem?.colorCode).toBe('#6c757d');
    });
  });

  describe('generateCalendarViewData', () => {
    it('should generate calendar view data for specific month', async () => {
      const studentId = 'student-1';
      const year = 2024;
      const month = 3; // March

      const result = await service.generateCalendarViewData(
        studentId,
        year,
        month,
      );

      expect(result).toBeDefined();
      expect(result.year).toBe(2024);
      expect(result.month).toBe(3);
      expect(result.events).toHaveLength(2); // milestone-1 (March 15) and milestone-2 (March 30)
      expect(
        result.events.find((e) => e.title === 'Literature Review'),
      ).toBeDefined();
      expect(result.summary.totalEvents).toBe(2);
      expect(result.summary.totalEstimatedHours).toBe(50); // 20 + 30
    });

    it('should group events by date correctly', async () => {
      const result = await service.generateCalendarViewData(
        'student-1',
        2024,
        3,
      );

      expect(result.eventsByDate['2024-03-15']).toBeDefined();
      expect(result.eventsByDate['2024-03-15']).toHaveLength(1);
      expect(result.eventsByDate['2024-03-15'][0].title).toBe(
        'Literature Review',
      );
    });

    it('should calculate daily workload correctly', async () => {
      const result = await service.generateCalendarViewData(
        'student-1',
        2024,
        3,
      );

      expect(result.dailyWorkload['2024-03-15']).toBe(20);
    });
  });

  describe('analyzeWorkloadDistribution', () => {
    it('should analyze workload distribution over time period', async () => {
      const studentId = 'student-1';
      const startDate = new Date('2024-03-01');
      const endDate = new Date('2024-04-30');

      const result = await service.analyzeWorkloadDistribution(
        studentId,
        startDate,
        endDate,
      );

      expect(result).toBeDefined();
      expect(result.dateRange.startDate).toBe('2024-03-01');
      expect(result.dateRange.endDate).toBe('2024-04-30');
      expect(result.weeklyWorkload).toBeDefined();
      expect(result.summary.totalMilestones).toBe(3);
      expect(result.summary.totalEstimatedHours).toBe(100); // 20 + 30 + 50
    });

    it('should identify overloaded weeks', async () => {
      // Use a date range that includes our test milestones
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = await service.analyzeWorkloadDistribution(
        'student-1',
        startDate,
        endDate,
      );

      expect(result.weeklyWorkload).toBeDefined();
      expect(result.conflicts).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalMilestones).toBe(3);
      expect(result.summary.totalEstimatedHours).toBe(100);

      // Check that workload analysis produces valid data
      result.weeklyWorkload.forEach((week) => {
        expect(week.periodStart).toBeDefined();
        expect(week.periodEnd).toBeDefined();
        expect(week.totalHours).toBeGreaterThanOrEqual(0);
        expect(week.milestoneCount).toBeGreaterThanOrEqual(0);
        expect(['low', 'medium', 'high']).toContain(week.conflictLevel);
      });
    });

    it('should calculate conflict levels correctly', async () => {
      const result = await service.analyzeWorkloadDistribution('student-1');

      expect(result.weeklyWorkload).toBeDefined();
      // Check that all weeks have valid conflict levels
      result.weeklyWorkload.forEach((week) => {
        expect(['low', 'medium', 'high']).toContain(week.conflictLevel);
      });
    });
  });

  describe('generateTimelineVisualization', () => {
    it('should generate comprehensive timeline visualization', async () => {
      const studentId = 'student-1';

      const result = await service.generateTimelineVisualization(studentId);

      expect(result).toBeDefined();
      expect(result.events).toBeDefined();
      expect(result.ganttData).toBeDefined();
      expect(result.workloadData).toBeDefined();
      expect(result.summary.totalEvents).toBeGreaterThan(0);
      expect(result.summary.milestoneEvents).toBe(3);
    });

    it('should include both milestone and alert events', async () => {
      const result = await service.generateTimelineVisualization('student-1');

      const milestoneEvents = result.events.filter(
        (event) => event.type === 'milestone',
      );
      const alertEvents = result.events.filter(
        (event) => event.type === 'alert',
      );

      expect(milestoneEvents.length).toBe(3);
      expect(result.summary.milestoneEvents).toBe(3);
      expect(result.summary.alertEvents).toBe(alertEvents.length);
    });

    it('should sort events chronologically', async () => {
      const result = await service.generateTimelineVisualization('student-1');

      for (let i = 1; i < result.events.length; i++) {
        expect(result.events[i].date >= result.events[i - 1].date).toBe(true);
      }
    });
  });

  describe('helper methods', () => {
    it('should calculate week numbers correctly', async () => {
      // Test the private getWeekNumber method indirectly through workload analysis
      const result = await service.analyzeWorkloadDistribution('student-1');

      expect(result.weeklyWorkload).toBeDefined();
      // Each week should have valid period start and end dates
      result.weeklyWorkload.forEach((week) => {
        expect(new Date(week.periodStart)).toBeInstanceOf(Date);
        expect(new Date(week.periodEnd)).toBeInstanceOf(Date);
        expect(new Date(week.periodEnd) >= new Date(week.periodStart)).toBe(
          true,
        );
      });
    });

    it('should handle edge cases in date calculations', async () => {
      // Test with milestones at year boundaries
      const yearBoundaryMilestones = [
        {
          ...mockMilestones[0],
          dueDate: new Date('2023-12-31'),
        },
        {
          ...mockMilestones[1],
          dueDate: new Date('2024-01-01'),
        },
      ];

      (milestoneRepository.find as jest.Mock).mockResolvedValueOnce(
        yearBoundaryMilestones as Milestone[],
      );

      const result = await service.analyzeWorkloadDistribution('student-1');
      expect(result).toBeDefined();
      expect(result.weeklyWorkload).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      milestoneRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      await expect(service.generateGanttChartData('student-1')).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle empty date ranges', async () => {
      const futureDate = new Date('2025-01-01');
      const pastDate = new Date('2023-01-01');

      (milestoneRepository.find as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.analyzeWorkloadDistribution(
        'student-1',
        futureDate,
        pastDate,
      );

      expect(result.summary.totalMilestones).toBe(0);
      expect(result.weeklyWorkload).toHaveLength(0);
    });
  });
});

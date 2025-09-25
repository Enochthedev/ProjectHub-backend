import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MilestoneGuidanceService } from '../milestone-guidance.service';
import { ProjectContextIntegrationService } from '../project-context-integration.service';
import { Milestone } from '../../entities/milestone.entity';
import { Project } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import {
  MilestoneStatus,
  Priority,
  DifficultyLevel,
  ApprovalStatus,
} from '../../common/enums';

describe('MilestoneGuidanceService', () => {
  let service: MilestoneGuidanceService;
  let milestoneRepository: Repository<Milestone>;
  let projectRepository: Repository<Project>;
  let userRepository: Repository<User>;
  let projectContextService: ProjectContextIntegrationService;

  const mockMilestones: Milestone[] = [
    {
      id: 'milestone-1',
      title: 'Literature Review Completion',
      description: 'Complete comprehensive literature review',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      status: MilestoneStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      student: {} as User,
      studentId: 'student-1',
      project: {} as Project,
      projectId: 'project-1',
      notes: [],
      reminders: [],
      completedAt: null,
      estimatedHours: 30,
      actualHours: 15,
      blockingReason: null,
      isTemplate: false,
      templateId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isOverdue: () => false,
      getDaysUntilDue: () => 2,
      canTransitionTo: () => true,
      getProgressPercentage: () => 50,
    },
    {
      id: 'milestone-2',
      title: 'Model Implementation',
      description: 'Implement machine learning model',
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (overdue)
      status: MilestoneStatus.NOT_STARTED,
      priority: Priority.LOW,
      student: {} as User,
      studentId: 'student-1',
      project: {} as Project,
      projectId: 'project-1',
      notes: [],
      reminders: [],
      completedAt: null,
      estimatedHours: 60,
      actualHours: 0,
      blockingReason: null,
      isTemplate: false,
      templateId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isOverdue: () => true,
      getDaysUntilDue: () => -5,
      canTransitionTo: () => true,
      getProgressPercentage: () => 0,
    },
    {
      id: 'milestone-3',
      title: 'Data Collection',
      description: 'Collect and preprocess data',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: MilestoneStatus.BLOCKED,
      priority: Priority.HIGH,
      student: {} as User,
      studentId: 'student-1',
      project: {} as Project,
      projectId: 'project-1',
      notes: [],
      reminders: [],
      completedAt: null,
      estimatedHours: 25,
      actualHours: 0,
      blockingReason: 'Waiting for data access permissions',
      isTemplate: false,
      templateId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isOverdue: () => false,
      getDaysUntilDue: () => 14,
      canTransitionTo: () => true,
      getProgressPercentage: () => 0,
    },
    {
      id: 'milestone-4',
      title: 'Testing and Validation',
      description: 'Test and validate the implementation',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: MilestoneStatus.NOT_STARTED,
      priority: Priority.MEDIUM,
      student: {} as User,
      studentId: 'student-1',
      project: {} as Project,
      projectId: 'project-1',
      notes: [],
      reminders: [],
      completedAt: null,
      estimatedHours: 40,
      actualHours: 0,
      blockingReason: null,
      isTemplate: false,
      templateId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isOverdue: () => false,
      getDaysUntilDue: () => 30,
      canTransitionTo: () => true,
      getProgressPercentage: () => 0,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneGuidanceService,
        {
          provide: ProjectContextIntegrationService,
          useValue: {
            getEnhancedProjectContext: jest.fn(),
            generateMilestoneAwareGuidance: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Milestone),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MilestoneGuidanceService>(MilestoneGuidanceService);
    milestoneRepository = module.get<Repository<Milestone>>(
      getRepositoryToken(Milestone),
    );
    projectRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    projectContextService = module.get<ProjectContextIntegrationService>(
      ProjectContextIntegrationService,
    );
  });

  describe('generateMilestoneDeadlineAwareness', () => {
    it('should generate deadline awareness for upcoming milestones', async () => {
      const upcomingMilestones = mockMilestones.filter((m) => !m.isOverdue());
      jest
        .spyOn(milestoneRepository, 'find')
        .mockResolvedValue(upcomingMilestones);

      const result =
        await service.generateMilestoneDeadlineAwareness('student-1');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      const criticalMilestone = result.find((m) => m.daysUntilDue === 2);
      expect(criticalMilestone).toBeDefined();
      expect(criticalMilestone?.urgencyLevel).toBe('critical');
      expect(criticalMilestone?.deadlineGuidance).toContain(
        expect.stringContaining('CRITICAL'),
      );
    });

    it('should categorize urgency levels correctly', async () => {
      jest.spyOn(milestoneRepository, 'find').mockResolvedValue(mockMilestones);

      const result =
        await service.generateMilestoneDeadlineAwareness('student-1');

      const criticalMilestone = result.find((m) => m.daysUntilDue <= 2);
      const moderateMilestone = result.find(
        (m) => m.daysUntilDue > 7 && m.daysUntilDue <= 14,
      );
      const lowUrgencyMilestone = result.find((m) => m.daysUntilDue > 14);

      if (criticalMilestone) {
        expect(criticalMilestone.urgencyLevel).toBe('critical');
      }
      if (moderateMilestone) {
        expect(moderateMilestone.urgencyLevel).toBe('moderate');
      }
      if (lowUrgencyMilestone) {
        expect(lowUrgencyMilestone.urgencyLevel).toBe('low');
      }
    });

    it('should provide appropriate time management tips based on urgency', async () => {
      jest
        .spyOn(milestoneRepository, 'find')
        .mockResolvedValue([mockMilestones[0]]); // Critical milestone

      const result =
        await service.generateMilestoneDeadlineAwareness('student-1');

      expect(result[0].timeManagementTips).toContain(
        expect.stringContaining('hours per day'),
      );
      expect(result[0].timeManagementTips).toContain(
        expect.stringContaining('focused'),
      );
    });
  });

  describe('generatePriorityGuidance', () => {
    it('should generate priority guidance for critical milestones', async () => {
      const criticalMilestones = [mockMilestones[1]]; // Overdue milestone
      jest
        .spyOn(milestoneRepository, 'find')
        .mockResolvedValue(criticalMilestones);

      const result = await service.generatePriorityGuidance('student-1');

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].suggestedPriority).toBe(Priority.HIGH);
      expect(result[0].priorityReason).toContain('overdue');
      expect(result[0].actionItems.length).toBeGreaterThan(0);
    });

    it('should calculate appropriate time allocation', async () => {
      jest
        .spyOn(milestoneRepository, 'find')
        .mockResolvedValue([mockMilestones[0]]);

      const result = await service.generatePriorityGuidance('student-1');

      expect(result[0].timeAllocation).toBeDefined();
      expect(result[0].timeAllocation.dailyHours).toBeGreaterThan(0);
      expect(result[0].timeAllocation.weeklyHours).toBeGreaterThan(0);
      expect(result[0].timeAllocation.totalEstimatedHours).toBe(30);
    });

    it('should suggest higher priority for overdue milestones', async () => {
      const overdueMilestone = mockMilestones[1]; // Overdue milestone with LOW priority
      jest
        .spyOn(milestoneRepository, 'find')
        .mockResolvedValue([overdueMilestone]);

      const result = await service.generatePriorityGuidance('student-1');

      expect(result[0].suggestedPriority).toBe(Priority.HIGH);
      expect(result[0].currentPriority).toBe(Priority.LOW);
      expect(result[0].priorityReason).toContain('overdue');
    });
  });

  describe('generateProactiveSuggestions', () => {
    it('should generate proactive suggestions based on milestone types', async () => {
      jest.spyOn(milestoneRepository, 'find').mockResolvedValue(mockMilestones);

      const result = await service.generateProactiveSuggestions('student-1');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      const preparationSuggestion = result.find(
        (s) => s.type === 'preparation',
      );
      expect(preparationSuggestion).toBeDefined();
      expect(preparationSuggestion?.actionSteps.length).toBeGreaterThan(0);
    });

    it('should prioritize suggestions correctly', async () => {
      jest.spyOn(milestoneRepository, 'find').mockResolvedValue(mockMilestones);

      const result = await service.generateProactiveSuggestions('student-1');

      // Check that high priority suggestions come first
      const highPrioritySuggestions = result.filter(
        (s) => s.priority === 'high',
      );
      const mediumPrioritySuggestions = result.filter(
        (s) => s.priority === 'medium',
      );

      if (
        highPrioritySuggestions.length > 0 &&
        mediumPrioritySuggestions.length > 0
      ) {
        const firstHighIndex = result.findIndex((s) => s.priority === 'high');
        const firstMediumIndex = result.findIndex(
          (s) => s.priority === 'medium',
        );
        expect(firstHighIndex).toBeLessThan(firstMediumIndex);
      }
    });

    it('should generate implementation-specific suggestions', async () => {
      const implementationMilestone = {
        ...mockMilestones[1],
        title: 'Implementation Phase',
        getDaysUntilDue: () => 14,
      };
      jest
        .spyOn(milestoneRepository, 'find')
        .mockResolvedValue([implementationMilestone]);

      const result = await service.generateProactiveSuggestions('student-1');

      const implementationSuggestion = result.find(
        (s) =>
          s.title.toLowerCase().includes('development') ||
          s.description.toLowerCase().includes('implementation'),
      );
      expect(implementationSuggestion).toBeDefined();
    });
  });

  describe('analyzeProjectTimeline', () => {
    it('should analyze project timeline and determine overall status', async () => {
      jest.spyOn(milestoneRepository, 'find').mockResolvedValue(mockMilestones);

      const result = await service.analyzeProjectTimeline('student-1');

      expect(result).toBeDefined();
      expect(result.studentId).toBe('student-1');
      expect(result.overallStatus).toMatch(
        /^(on_track|at_risk|behind_schedule|ahead_of_schedule)$/,
      );
      expect(result.criticalPath).toBeInstanceOf(Array);
      expect(result.bottlenecks).toBeInstanceOf(Array);
      expect(result.recommendations).toBeDefined();
      expect(result.riskFactors).toBeInstanceOf(Array);
    });

    it('should identify behind_schedule status when there are overdue milestones', async () => {
      const milestonesWithOverdue = mockMilestones.map((m) => ({
        ...m,
        isOverdue: () => m.id === 'milestone-2', // Only milestone-2 is overdue
      }));
      jest
        .spyOn(milestoneRepository, 'find')
        .mockResolvedValue(milestonesWithOverdue);

      const result = await service.analyzeProjectTimeline('student-1');

      expect(result.overallStatus).toBe('behind_schedule');
      expect(result.riskFactors.length).toBeGreaterThan(0);
      expect(result.riskFactors[0].factor).toContain('overdue');
    });

    it('should identify critical path milestones', async () => {
      jest.spyOn(milestoneRepository, 'find').mockResolvedValue(mockMilestones);

      const result = await service.analyzeProjectTimeline('student-1');

      expect(result.criticalPath.length).toBeGreaterThan(0);

      // Critical path should be sorted by buffer days (ascending)
      for (let i = 1; i < result.criticalPath.length; i++) {
        expect(result.criticalPath[i].bufferDays).toBeGreaterThanOrEqual(
          result.criticalPath[i - 1].bufferDays,
        );
      }
    });

    it('should identify bottlenecks from blocked milestones', async () => {
      jest.spyOn(milestoneRepository, 'find').mockResolvedValue(mockMilestones);

      const result = await service.analyzeProjectTimeline('student-1');

      const blockedMilestone = mockMilestones.find(
        (m) => m.status === MilestoneStatus.BLOCKED,
      );
      if (blockedMilestone) {
        expect(result.bottlenecks.length).toBeGreaterThan(0);
        expect(result.bottlenecks[0].milestoneId).toBe(blockedMilestone.id);
        expect(result.bottlenecks[0].suggestedSolutions.length).toBeGreaterThan(
          0,
        );
      }
    });

    it('should handle empty milestone list gracefully', async () => {
      jest.spyOn(milestoneRepository, 'find').mockResolvedValue([]);

      const result = await service.analyzeProjectTimeline('student-1');

      expect(result.overallStatus).toBe('on_track');
      expect(result.criticalPath).toEqual([]);
      expect(result.bottlenecks).toEqual([]);
      expect(result.recommendations.immediate).toContain(
        expect.stringContaining('first milestone'),
      );
    });
  });

  describe('getMilestoneSpecificGuidance', () => {
    it('should provide deadline-specific guidance', async () => {
      jest
        .spyOn(milestoneRepository, 'findOne')
        .mockResolvedValue(mockMilestones[0]);

      const result = await service.getMilestoneSpecificGuidance(
        'milestone-1',
        'deadline',
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(
        result.some(
          (guidance) =>
            guidance.includes('CRITICAL') || guidance.includes('days'),
        ),
      ).toBe(true);
    });

    it('should provide priority-specific guidance', async () => {
      jest
        .spyOn(milestoneRepository, 'findOne')
        .mockResolvedValue(mockMilestones[1]); // Overdue milestone

      const result = await service.getMilestoneSpecificGuidance(
        'milestone-2',
        'priority',
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(
        result.some(
          (guidance) =>
            guidance.includes('overdue') || guidance.includes('priority'),
        ),
      ).toBe(true);
    });

    it('should provide progress-specific guidance', async () => {
      jest
        .spyOn(milestoneRepository, 'findOne')
        .mockResolvedValue(mockMilestones[0]);

      const result = await service.getMilestoneSpecificGuidance(
        'milestone-1',
        'progress',
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(
        result.some(
          (guidance) =>
            guidance.includes('progress') || guidance.includes('50'),
        ),
      ).toBe(true);
    });

    it('should provide blocking-specific guidance', async () => {
      jest
        .spyOn(milestoneRepository, 'findOne')
        .mockResolvedValue(mockMilestones[2]); // Blocked milestone

      const result = await service.getMilestoneSpecificGuidance(
        'milestone-3',
        'blocking',
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(
        result.some((guidance) => guidance.includes('data access permissions')),
      ).toBe(true);
    });

    it('should handle non-existent milestone', async () => {
      jest.spyOn(milestoneRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getMilestoneSpecificGuidance(
        'non-existent',
        'deadline',
      );

      expect(result).toEqual([
        'Milestone not found. Please check the milestone ID.',
      ]);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle milestones with no estimated hours', async () => {
      const milestoneWithoutHours = {
        ...mockMilestones[0],
        estimatedHours: 0,
      };
      jest
        .spyOn(milestoneRepository, 'find')
        .mockResolvedValue([milestoneWithoutHours]);

      const result = await service.generatePriorityGuidance('student-1');

      expect(result[0].timeAllocation.totalEstimatedHours).toBe(20); // Default value
    });

    it('should handle milestones with null blocking reason', async () => {
      const milestoneWithNullBlockingReason = {
        ...mockMilestones[2],
        blockingReason: null,
      };
      jest
        .spyOn(milestoneRepository, 'findOne')
        .mockResolvedValue(milestoneWithNullBlockingReason);

      const result = await service.getMilestoneSpecificGuidance(
        'milestone-3',
        'blocking',
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should cap daily hours at reasonable limits', async () => {
      const intensiveMilestone = {
        ...mockMilestones[0],
        estimatedHours: 100,
        getDaysUntilDue: () => 1, // 1 day remaining
      };
      jest
        .spyOn(milestoneRepository, 'find')
        .mockResolvedValue([intensiveMilestone]);

      const result = await service.generatePriorityGuidance('student-1');

      expect(result[0].timeAllocation.dailyHours).toBeLessThanOrEqual(8);
    });

    it('should handle negative days until due', async () => {
      const overdueMilestone = {
        ...mockMilestones[1],
        getDaysUntilDue: () => -10,
      };
      jest
        .spyOn(milestoneRepository, 'find')
        .mockResolvedValue([overdueMilestone]);

      const result =
        await service.generateMilestoneDeadlineAwareness('student-1');

      // Should not include overdue milestones in deadline awareness
      expect(result.length).toBe(0);
    });
  });
});

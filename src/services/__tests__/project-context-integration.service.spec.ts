import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectContextIntegrationService } from '../project-context-integration.service';
import { ContextService } from '../context.service';
import { Project } from '../../entities/project.entity';
import { Milestone } from '../../entities/milestone.entity';
import { User } from '../../entities/user.entity';
import { Conversation } from '../../entities/conversation.entity';
import { ConversationMessage } from '../../entities/conversation-message.entity';
import {
  MilestoneStatus,
  Priority,
  DifficultyLevel,
  ApprovalStatus,
  UserRole,
} from '../../common/enums';

describe('ProjectContextIntegrationService', () => {
  let service: ProjectContextIntegrationService;
  let contextService: ContextService;
  let projectRepository: Repository<Project>;
  let milestoneRepository: Repository<Milestone>;
  let userRepository: Repository<User>;
  let conversationRepository: Repository<Conversation>;
  let messageRepository: Repository<ConversationMessage>;

  const mockProject: Project = {
    id: 'project-1',
    title: 'AI-Powered Recommendation System',
    abstract: 'A machine learning system for personalized recommendations',
    specialization: 'Data Science',
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    year: 2024,
    tags: ['machine-learning', 'recommendation-system'],
    technologyStack: ['Python', 'TensorFlow', 'Flask'],
    isGroupProject: false,
    approvalStatus: ApprovalStatus.APPROVED,
    githubUrl: null,
    demoUrl: null,
    notes: null,
    supervisor: {
      id: 'supervisor-1',
      email: 'supervisor@test.com',
      supervisorProfile: {
        name: 'Dr. Smith',
        specializations: ['Data Science'],
      },
    } as any,
    supervisorId: 'supervisor-1',
    bookmarks: [],
    views: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    approvedAt: new Date('2024-01-01'),
    approvedBy: 'admin-1',
    searchVector: '',
  };

  const mockMilestones: Milestone[] = [
    {
      id: 'milestone-1',
      title: 'Literature Review Completion',
      description: 'Complete comprehensive literature review',
      dueDate: new Date('2024-03-15'),
      status: MilestoneStatus.COMPLETED,
      priority: Priority.HIGH,
      student: {} as User,
      studentId: 'student-1',
      project: mockProject,
      projectId: 'project-1',
      notes: [],
      reminders: [],
      completedAt: new Date('2024-03-10'),
      estimatedHours: 40,
      actualHours: 45,
      blockingReason: null,
      isTemplate: false,
      templateId: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-03-10'),
      isOverdue: () => false,
      getDaysUntilDue: () => -30,
      canTransitionTo: () => true,
      getProgressPercentage: () => 100,
    },
    {
      id: 'milestone-2',
      title: 'Data Collection and Preprocessing',
      description: 'Collect and preprocess training data',
      dueDate: new Date('2024-04-01'),
      status: MilestoneStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      student: {} as User,
      studentId: 'student-1',
      project: mockProject,
      projectId: 'project-1',
      notes: [],
      reminders: [],
      completedAt: null,
      estimatedHours: 30,
      actualHours: 0,
      blockingReason: null,
      isTemplate: false,
      templateId: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      isOverdue: () => false,
      getDaysUntilDue: () => 5,
      canTransitionTo: () => true,
      getProgressPercentage: () => 50,
    },
    {
      id: 'milestone-3',
      title: 'Model Implementation',
      description: 'Implement recommendation algorithm',
      dueDate: new Date('2024-02-15'),
      status: MilestoneStatus.NOT_STARTED,
      priority: Priority.MEDIUM,
      student: {} as User,
      studentId: 'student-1',
      project: mockProject,
      projectId: 'project-1',
      notes: [],
      reminders: [],
      completedAt: null,
      estimatedHours: 60,
      actualHours: 0,
      blockingReason: null,
      isTemplate: false,
      templateId: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      isOverdue: () => true,
      getDaysUntilDue: () => -45,
      canTransitionTo: () => true,
      getProgressPercentage: () => 0,
    },
  ];

  const mockMilestoneContext = {
    upcoming: [
      {
        id: 'milestone-2',
        title: 'Data Collection and Preprocessing',
        dueDate: '2024-04-01',
        status: MilestoneStatus.IN_PROGRESS,
        daysUntilDue: 5,
        isOverdue: false,
      },
    ],
    overdue: [
      {
        id: 'milestone-3',
        title: 'Model Implementation',
        dueDate: '2024-02-15',
        daysPastDue: 45,
      },
    ],
    recentlyCompleted: [
      {
        id: 'milestone-1',
        title: 'Literature Review Completion',
        completedAt: '2024-03-10',
      },
    ],
    blocked: [],
    currentPhase: 'implementation',
    progressPercentage: 50,
  };

  const mockProjectContext = {
    id: 'project-1',
    title: 'AI-Powered Recommendation System',
    specialization: 'Data Science',
    difficultyLevel: 'intermediate',
    tags: ['machine-learning', 'recommendation-system'],
    technologyStack: ['Python', 'TensorFlow', 'Flask'],
    phase: 'implementation',
    supervisor: {
      id: 'supervisor-1',
      name: 'Dr. Smith',
      email: 'supervisor@test.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectContextIntegrationService,
        {
          provide: ContextService,
          useValue: {
            getProjectContext: jest.fn(),
            getMilestoneContext: jest.fn(),
            updateConversationContext: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
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
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Conversation),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ConversationMessage),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectContextIntegrationService>(
      ProjectContextIntegrationService,
    );
    contextService = module.get<ContextService>(ContextService);
    projectRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    milestoneRepository = module.get<Repository<Milestone>>(
      getRepositoryToken(Milestone),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    conversationRepository = module.get<Repository<Conversation>>(
      getRepositoryToken(Conversation),
    );
    messageRepository = module.get<Repository<ConversationMessage>>(
      getRepositoryToken(ConversationMessage),
    );
  });

  describe('getEnhancedProjectContext', () => {
    it('should return enhanced project context with milestone integration', async () => {
      jest
        .spyOn(contextService, 'getProjectContext')
        .mockResolvedValue(mockProjectContext);
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest
        .spyOn(contextService, 'getMilestoneContext')
        .mockResolvedValue(mockMilestoneContext);

      const result = await service.getEnhancedProjectContext('student-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('project-1');
      expect(result?.currentPhase).toBeDefined();
      expect(result?.phaseProgress).toBeGreaterThanOrEqual(0);
      expect(result?.riskLevel).toMatch(/^(low|medium|high)$/);
      expect(result?.recommendations).toBeInstanceOf(Array);
      expect(result?.milestonesSummary).toBeDefined();
      expect(result?.milestonesSummary.total).toBeGreaterThan(0);
    });

    it('should return null when no project context exists', async () => {
      jest.spyOn(contextService, 'getProjectContext').mockResolvedValue(null);

      const result = await service.getEnhancedProjectContext('student-1');

      expect(result).toBeNull();
    });

    it('should calculate risk level correctly based on milestones', async () => {
      const highRiskMilestoneContext = {
        ...mockMilestoneContext,
        overdue: [
          {
            id: 'milestone-3',
            title: 'Model Implementation',
            dueDate: '2024-02-15',
            daysPastDue: 45,
          },
          {
            id: 'milestone-4',
            title: 'Testing',
            dueDate: '2024-02-20',
            daysPastDue: 40,
          },
        ],
        blocked: [
          {
            id: 'milestone-5',
            title: 'Deployment',
            blockingReason: 'Server issues',
          },
        ],
        progressPercentage: 20,
      };

      jest
        .spyOn(contextService, 'getProjectContext')
        .mockResolvedValue(mockProjectContext);
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest
        .spyOn(contextService, 'getMilestoneContext')
        .mockResolvedValue(highRiskMilestoneContext);

      const result = await service.getEnhancedProjectContext('student-1');

      expect(result?.riskLevel).toBe('high');
    });
  });

  describe('generateMilestoneAwareGuidance', () => {
    it('should generate comprehensive milestone-aware guidance', async () => {
      jest
        .spyOn(contextService, 'getMilestoneContext')
        .mockResolvedValue(mockMilestoneContext);
      jest.spyOn(service, 'getEnhancedProjectContext').mockResolvedValue({
        ...mockProjectContext,
        currentPhase: 'implementation',
        phaseProgress: 60,
        nextPhaseDeadline: '2024-05-01',
        projectStatus: ApprovalStatus.APPROVED,
        daysSinceStart: 90,
        estimatedDaysRemaining: 120,
        riskLevel: 'medium',
        recommendations: ['Focus on completing overdue milestones'],
        milestonesSummary: { total: 3, completed: 1, overdue: 1, upcoming: 1 },
      } as any);

      const result = await service.generateMilestoneAwareGuidance('student-1');

      expect(result).toBeDefined();
      expect(result.urgentMilestones).toBeInstanceOf(Array);
      expect(result.overdueMilestones).toBeInstanceOf(Array);
      expect(result.blockedMilestones).toBeInstanceOf(Array);
      expect(result.phaseSpecificGuidance).toBeDefined();
      expect(result.timelineAnalysis).toBeDefined();
      expect(result.overdueMilestones.length).toBe(1);
      expect(result.overdueMilestones[0].actionItems).toBeInstanceOf(Array);
    });

    it('should identify urgent milestones correctly', async () => {
      const urgentMilestoneContext = {
        ...mockMilestoneContext,
        upcoming: [
          {
            id: 'milestone-urgent',
            title: 'Urgent Task',
            dueDate: '2024-03-28',
            status: MilestoneStatus.NOT_STARTED,
            daysUntilDue: 3,
            isOverdue: false,
          },
        ],
      };

      jest
        .spyOn(contextService, 'getMilestoneContext')
        .mockResolvedValue(urgentMilestoneContext);
      jest.spyOn(service, 'getEnhancedProjectContext').mockResolvedValue(null);

      const result = await service.generateMilestoneAwareGuidance('student-1');

      expect(result.urgentMilestones.length).toBe(1);
      expect(result.urgentMilestones[0].daysUntilDue).toBe(3);
      expect(result.urgentMilestones[0].recommendations).toBeInstanceOf(Array);
    });
  });

  describe('getProjectPhaseCustomization', () => {
    it('should return appropriate customization for proposal phase', () => {
      const result = service.getProjectPhaseCustomization(
        'proposal',
        'Software Engineering',
      );

      expect(result.phase).toBe('proposal');
      expect(result.responseStyle).toBe('directive');
      expect(result.focusAreas).toContain('research_questions');
      expect(result.keyTerms).toContain('research question');
      expect(result.commonQuestions.length).toBeGreaterThan(0);
    });

    it('should return appropriate customization for implementation phase', () => {
      const result = service.getProjectPhaseCustomization(
        'implementation',
        'Data Science',
      );

      expect(result.phase).toBe('implementation');
      expect(result.responseStyle).toBe('analytical');
      expect(result.focusAreas).toContain('coding_practices');
      expect(result.keyTerms).toContain('implementation');
    });

    it('should include specialization-specific customizations', () => {
      const result = service.getProjectPhaseCustomization(
        'implementation',
        'Software Engineering',
      );

      expect(result.focusAreas).toContain('software_architecture');
      expect(result.keyTerms).toContain('architecture');
      expect(result.resourceRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('integrateProjectContextIntoConversation', () => {
    it('should integrate project context into conversation successfully', async () => {
      const mockEnhancedContext = {
        ...mockProjectContext,
        currentPhase: 'implementation',
        phaseProgress: 60,
        projectStatus: ApprovalStatus.APPROVED,
        riskLevel: 'medium' as const,
        recommendations: ['Focus on testing'],
      };

      const mockMilestoneGuidance = {
        urgentMilestones: [],
        overdueMilestones: [{ id: 'milestone-3' }],
        blockedMilestones: [],
        phaseSpecificGuidance: {} as any,
        timelineAnalysis: {} as any,
      };

      jest
        .spyOn(service, 'getEnhancedProjectContext')
        .mockResolvedValue(mockEnhancedContext as any);
      jest
        .spyOn(service, 'generateMilestoneAwareGuidance')
        .mockResolvedValue(mockMilestoneGuidance);
      jest
        .spyOn(contextService, 'updateConversationContext')
        .mockResolvedValue();

      await service.integrateProjectContextIntoConversation(
        'conversation-1',
        'student-1',
      );

      expect(contextService.updateConversationContext).toHaveBeenCalledWith(
        'conversation-1',
        expect.objectContaining({
          projectId: 'project-1',
          projectPhase: 'implementation',
          specialization: 'Data Science',
          riskLevel: 'medium',
          overdueMilestones: 1,
        }),
      );
    });

    it('should handle case when no project context exists', async () => {
      jest.spyOn(service, 'getEnhancedProjectContext').mockResolvedValue(null);

      await service.integrateProjectContextIntoConversation(
        'conversation-1',
        'student-1',
      );

      expect(contextService.updateConversationContext).not.toHaveBeenCalled();
    });
  });

  describe('generateContextualResponseEnhancements', () => {
    it('should generate appropriate response enhancements', () => {
      const mockProjectContext = {
        id: 'project-1',
        currentPhase: 'implementation',
        riskLevel: 'high' as const,
        recommendations: ['Test recommendation'],
      } as any;

      const mockMilestoneGuidance = {
        urgentMilestones: [{ id: 'urgent-1' }],
        overdueMilestones: [{ id: 'overdue-1' }, { id: 'overdue-2' }],
        blockedMilestones: [],
        phaseSpecificGuidance: {
          successTips: ['Tip 1', 'Tip 2', 'Tip 3'],
        },
        timelineAnalysis: {
          onTrack: false,
          adjustmentRecommendations: ['Adjust timeline', 'Reduce scope'],
        },
      } as any;

      const result = service.generateContextualResponseEnhancements(
        mockProjectContext,
        mockMilestoneGuidance,
        'How do I implement this feature?',
      );

      expect(result.priorityAlerts.length).toBeGreaterThan(0);
      expect(result.priorityAlerts[0]).toContain('overdue milestone');
      expect(result.priorityAlerts).toContain(
        expect.stringContaining('high risk'),
      );
      expect(result.phaseSpecificTips.length).toBe(2); // Should limit to 2
      expect(result.timelineConcerns.length).toBeGreaterThan(0);
    });

    it('should provide contextual suggestions for phase-related queries', () => {
      const mockProjectContext = {
        currentPhase: 'implementation',
        riskLevel: 'low' as const,
      } as any;

      const mockMilestoneGuidance = {
        urgentMilestones: [],
        overdueMilestones: [],
        blockedMilestones: [{ id: 'blocked-1' }],
        phaseSpecificGuidance: { successTips: [] },
        timelineAnalysis: { onTrack: true, adjustmentRecommendations: [] },
      } as any;

      const result = service.generateContextualResponseEnhancements(
        mockProjectContext,
        mockMilestoneGuidance,
        'How do I implement this algorithm?',
      );

      expect(result.contextualSuggestions).toContain(
        expect.stringContaining('implementation phase'),
      );
      expect(result.contextualSuggestions).toContain(
        expect.stringContaining('blocked milestones'),
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing milestone context gracefully', async () => {
      jest
        .spyOn(contextService, 'getProjectContext')
        .mockResolvedValue(mockProjectContext);
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(contextService, 'getMilestoneContext').mockResolvedValue({
        upcoming: [],
        overdue: [],
        recentlyCompleted: [],
        blocked: [],
        currentPhase: 'planning',
        progressPercentage: 0,
      });

      const result = await service.getEnhancedProjectContext('student-1');

      expect(result).toBeDefined();
      expect(result?.milestonesSummary.total).toBe(0);
      expect(result?.riskLevel).toBe('low');
    });

    it('should handle unknown project phases gracefully', () => {
      const result = service.getProjectPhaseCustomization(
        'unknown_phase',
        'Unknown Specialization',
      );

      expect(result.phase).toBe('unknown_phase');
      expect(result.responseStyle).toBe('supportive');
      expect(result.focusAreas).toEqual([]);
      expect(result.keyTerms).toEqual([]);
    });
  });
});

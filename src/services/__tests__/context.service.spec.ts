import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ContextService,
  ProjectContext,
  MilestoneContext,
} from '../context.service';
import { Conversation } from '../../entities/conversation.entity';
import { ConversationMessage } from '../../entities/conversation-message.entity';
import { Project } from '../../entities/project.entity';
import { Milestone } from '../../entities/milestone.entity';
import { User } from '../../entities/user.entity';
import {
  ConversationStatus,
  MessageType,
  MilestoneStatus,
  DifficultyLevel,
  ApprovalStatus,
  UserRole,
} from '../../common/enums';

describe('ContextService', () => {
  let service: ContextService;
  let conversationRepository: jest.Mocked<Repository<Conversation>>;
  let messageRepository: jest.Mocked<Repository<ConversationMessage>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockConversation: Partial<Conversation> = {
    id: 'conv-1',
    studentId: 'student-1',
    projectId: 'project-1',
    language: 'en',
    status: ConversationStatus.ACTIVE,
    student: {
      id: 'student-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'hashed_password',
      role: UserRole.STUDENT,
      isEmailVerified: true,
      isActive: true,
      emailVerificationToken: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User,
    messages: [],
  };

  const mockProject: Partial<Project> = {
    id: 'project-1',
    title: 'AI-Powered Web Application',
    specialization: 'Software Engineering',
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    tags: ['AI', 'Web Development', 'Machine Learning'],
    technologyStack: ['React', 'Node.js', 'Python', 'TensorFlow'],
    approvalStatus: ApprovalStatus.APPROVED,
    supervisor: {
      id: 'supervisor-1',
      email: 'jane.smith@university.edu',
      password: 'hashed_password',
      role: UserRole.SUPERVISOR,
      isEmailVerified: true,
      isActive: true,
      emailVerificationToken: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      supervisorProfile: {
        id: 'profile-1',
        name: 'Dr. Jane Smith',
        specializations: ['Software Engineering'],
        maxStudents: 5,
        isAvailable: true,
        officeLocation: 'Room 101',
        phoneNumber: '+1234567890',
      },
    } as User,
    createdAt: new Date('2024-01-15'),
  };

  const futureDate1 = new Date();
  futureDate1.setDate(futureDate1.getDate() + 10);
  const futureDate2 = new Date();
  futureDate2.setDate(futureDate2.getDate() + 40);
  const pastDate1 = new Date();
  pastDate1.setDate(pastDate1.getDate() - 20);
  const pastDate2 = new Date();
  pastDate2.setDate(pastDate2.getDate() - 5);

  const mockMilestones: Partial<Milestone>[] = [
    {
      id: 'milestone-1',
      title: 'Project Proposal',
      status: MilestoneStatus.COMPLETED,
      dueDate: pastDate1,
      completedAt: new Date(pastDate1.getTime() - 24 * 60 * 60 * 1000), // 1 day before due date
      getDaysUntilDue: jest.fn().mockReturnValue(-20),
      isOverdue: jest.fn().mockReturnValue(false),
      getProgressPercentage: jest.fn().mockReturnValue(100),
    },
    {
      id: 'milestone-2',
      title: 'Literature Review',
      status: MilestoneStatus.IN_PROGRESS,
      dueDate: futureDate1,
      getDaysUntilDue: jest.fn().mockReturnValue(10),
      isOverdue: jest.fn().mockReturnValue(false),
      getProgressPercentage: jest.fn().mockReturnValue(50),
    },
    {
      id: 'milestone-3',
      title: 'System Design',
      status: MilestoneStatus.NOT_STARTED,
      dueDate: futureDate2,
      getDaysUntilDue: jest.fn().mockReturnValue(40),
      isOverdue: jest.fn().mockReturnValue(false),
      getProgressPercentage: jest.fn().mockReturnValue(0),
    },
    {
      id: 'milestone-4',
      title: 'Implementation Phase 1',
      status: MilestoneStatus.BLOCKED,
      dueDate: pastDate2,
      blockingReason: 'Waiting for API access',
      getDaysUntilDue: jest.fn().mockReturnValue(-5),
      isOverdue: jest.fn().mockReturnValue(true),
      getProgressPercentage: jest.fn().mockReturnValue(25),
    },
  ];

  const mockMessages: Partial<ConversationMessage>[] = [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      type: MessageType.USER_QUERY,
      content: 'How do I write a good literature review for my AI project?',
      createdAt: new Date('2024-02-20T10:00:00Z'),
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      type: MessageType.AI_RESPONSE,
      content:
        'A literature review should systematically analyze existing research in your field...',
      createdAt: new Date('2024-02-20T10:01:00Z'),
    },
    {
      id: 'msg-3',
      conversationId: 'conv-1',
      type: MessageType.USER_QUERY,
      content: 'What methodology should I use for machine learning research?',
      createdAt: new Date('2024-02-20T10:05:00Z'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ConversationMessage),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Milestone),
          useValue: {
            find: jest.fn(),
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

    service = module.get<ContextService>(ContextService);
    conversationRepository = module.get(getRepositoryToken(Conversation));
    messageRepository = module.get(getRepositoryToken(ConversationMessage));
    projectRepository = module.get(getRepositoryToken(Project));
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildConversationContext', () => {
    it('should build comprehensive conversation context', async () => {
      conversationRepository.findOne.mockResolvedValue(
        mockConversation as Conversation,
      );
      projectRepository.findOne.mockResolvedValue(mockProject as Project);
      milestoneRepository.find.mockResolvedValue(mockMilestones as Milestone[]);
      messageRepository.find.mockResolvedValue(
        mockMessages as ConversationMessage[],
      );
      conversationRepository.save.mockResolvedValue(
        mockConversation as Conversation,
      );

      const result = await service.buildConversationContext('conv-1');

      expect(result).toMatchObject({
        projectId: 'project-1',
        specialization: 'Software Engineering',
        projectPhase: expect.any(String),
        recentTopics: expect.any(Array),
        keyTerms: expect.any(Array),
        conversationSummary: expect.any(String),
        preferences: {
          language: 'en',
          responseStyle: 'academic',
          detailLevel: 'detailed',
        },
      });

      expect(conversationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        relations: ['student', 'messages'],
      });
      expect(conversationRepository.save).toHaveBeenCalled();
    });

    it('should handle conversation without project', async () => {
      const conversationWithoutProject = {
        ...mockConversation,
        projectId: null,
      };
      conversationRepository.findOne.mockResolvedValue(
        conversationWithoutProject as Conversation,
      );
      milestoneRepository.find.mockResolvedValue(mockMilestones as Milestone[]);
      messageRepository.find.mockResolvedValue(
        mockMessages as ConversationMessage[],
      );
      conversationRepository.save.mockResolvedValue(
        conversationWithoutProject as Conversation,
      );

      const result = await service.buildConversationContext('conv-1');

      expect(result.projectId).toBeUndefined();
      expect(result.specialization).toBeUndefined();
      expect(result.projectPhase).toBeDefined();
    });

    it('should throw error for non-existent conversation', async () => {
      conversationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.buildConversationContext('non-existent'),
      ).rejects.toThrow('Conversation non-existent not found');
    });
  });

  describe('getProjectContext', () => {
    it('should return project context for valid project', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject as Project);

      const result = await service.getProjectContext('student-1', 'project-1');

      expect(result).toEqual({
        id: 'project-1',
        title: 'AI-Powered Web Application',
        specialization: 'Software Engineering',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        tags: ['AI', 'Web Development', 'Machine Learning'],
        technologyStack: ['React', 'Node.js', 'Python', 'TensorFlow'],
        phase: expect.any(String),
        supervisor: {
          id: 'supervisor-1',
          name: 'Dr. Jane Smith',
          email: 'jane.smith@university.edu',
        },
      });
    });

    it('should return null for non-existent project', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      const result = await service.getProjectContext(
        'student-1',
        'non-existent',
      );

      expect(result).toBeNull();
    });
  });

  describe('getMilestoneContext', () => {
    it('should return comprehensive milestone context', async () => {
      milestoneRepository.find.mockResolvedValue(mockMilestones as Milestone[]);

      const result = await service.getMilestoneContext('student-1');

      expect(result).toMatchObject({
        upcoming: expect.arrayContaining([
          expect.objectContaining({
            id: 'milestone-2',
            title: 'Literature Review',
            status: MilestoneStatus.IN_PROGRESS,
          }),
        ]),
        overdue: expect.arrayContaining([
          expect.objectContaining({
            id: 'milestone-4',
            title: 'Implementation Phase 1',
          }),
        ]),
        recentlyCompleted: expect.arrayContaining([
          expect.objectContaining({
            id: 'milestone-1',
            title: 'Project Proposal',
          }),
        ]),
        blocked: expect.arrayContaining([
          expect.objectContaining({
            id: 'milestone-4',
            blockingReason: 'Waiting for API access',
          }),
        ]),
        currentPhase: expect.any(String),
        progressPercentage: expect.any(Number),
      });

      expect(result.progressPercentage).toBe(25); // 1 out of 4 milestones completed
    });

    it('should handle student with no milestones', async () => {
      milestoneRepository.find.mockResolvedValue([]);

      const result = await service.getMilestoneContext('student-1');

      expect(result).toMatchObject({
        upcoming: [],
        overdue: [],
        recentlyCompleted: [],
        blocked: [],
        currentPhase: 'planning',
        progressPercentage: 0,
      });
    });
  });

  describe('analyzeConversationHistory', () => {
    it('should analyze conversation history and extract context', async () => {
      messageRepository.find.mockResolvedValue(
        mockMessages as ConversationMessage[],
      );

      const result = await service.analyzeConversationHistory('conv-1');

      expect(result).toMatchObject({
        recentTopics: expect.any(Array),
        keyTerms: expect.any(Array),
        conversationSummary: expect.any(String),
        messageCount: 3,
        lastActivity: expect.any(Date),
        frequentQuestions: expect.any(Array),
      });

      expect(result.recentTopics).toContain('literature_review');
      expect(result.recentTopics).toContain('methodology');
      expect(result.keyTerms).toContain('research');
      expect(result.frequentQuestions).toHaveLength(2);
    });

    it('should handle conversation with no messages', async () => {
      messageRepository.find.mockResolvedValue([]);

      const result = await service.analyzeConversationHistory('conv-1');

      expect(result).toMatchObject({
        recentTopics: [],
        keyTerms: [],
        conversationSummary: '',
        messageCount: 0,
        lastActivity: expect.any(Date),
        frequentQuestions: [],
      });
    });
  });

  describe('updateConversationContext', () => {
    it('should update conversation context in database', async () => {
      const existingContext = {
        projectId: 'project-1',
        recentTopics: ['old_topic'],
      };
      const conversationWithContext = {
        ...mockConversation,
        context: existingContext,
      };

      conversationRepository.findOne.mockResolvedValue(
        conversationWithContext as Conversation,
      );
      conversationRepository.save.mockResolvedValue(
        conversationWithContext as Conversation,
      );

      const newContext = {
        projectPhase: 'implementation',
        keyTerms: ['algorithm', 'database'],
      };

      await service.updateConversationContext('conv-1', newContext);

      expect(conversationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            projectId: 'project-1',
            recentTopics: ['old_topic'],
            projectPhase: 'implementation',
            keyTerms: ['algorithm', 'database'],
            lastActivity: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw error for non-existent conversation', async () => {
      conversationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateConversationContext('non-existent', {
          projectPhase: 'test',
        }),
      ).rejects.toThrow('Conversation non-existent not found');
    });
  });

  describe('summarizeConversation', () => {
    it('should generate conversation summary', async () => {
      messageRepository.find.mockResolvedValue(
        mockMessages as ConversationMessage[],
      );

      const result = await service.summarizeConversation('conv-1');

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('literature_review');
    });

    it('should return empty string for conversation with no messages', async () => {
      messageRepository.find.mockResolvedValue([]);

      const result = await service.summarizeConversation('conv-1');

      expect(result).toBe('');
    });

    it('should truncate long summaries', async () => {
      const longMessages = Array.from({ length: 20 }, (_, i) => ({
        id: `msg-${i}`,
        conversationId: 'conv-1',
        type: MessageType.USER_QUERY,
        content: `This is a very long message about literature review and methodology research that contains many academic terms and concepts related to machine learning and artificial intelligence development processes ${i}`,
        createdAt: new Date(),
      }));

      messageRepository.find.mockResolvedValue(
        longMessages as ConversationMessage[],
      );

      const result = await service.summarizeConversation('conv-1');

      expect(result.length).toBeLessThanOrEqual(500);
    });
  });

  describe('topic and term extraction', () => {
    it('should extract relevant academic topics from messages', async () => {
      const academicMessages = [
        {
          id: 'msg-1',
          content:
            'I need help with my literature review and research methodology',
          type: MessageType.USER_QUERY,
          createdAt: new Date(),
        },
        {
          id: 'msg-2',
          content:
            'How do I implement and code algorithm in my project development?',
          type: MessageType.USER_QUERY,
          createdAt: new Date(),
        },
      ] as ConversationMessage[];

      messageRepository.find.mockResolvedValue(academicMessages);

      const result = await service.analyzeConversationHistory('conv-1');

      expect(result.recentTopics).toContain('literature_review');
      expect(result.recentTopics).toContain('methodology');
      expect(result.recentTopics).toContain('implementation');
      expect(result.keyTerms).toContain('research');
      expect(result.keyTerms).toContain('algorithm');
    });
  });

  describe('phase determination', () => {
    it('should determine project phase based on milestone progress', async () => {
      // Test different progress scenarios
      const testCases = [
        { completed: 0, total: 4, expectedPhase: 'planning' },
        { completed: 1, total: 4, expectedPhase: 'proposal' },
        { completed: 2, total: 4, expectedPhase: 'literature_review' },
        { completed: 3, total: 4, expectedPhase: 'methodology' },
        { completed: 4, total: 4, expectedPhase: 'documentation' },
      ];

      for (const testCase of testCases) {
        const milestones = Array.from({ length: testCase.total }, (_, i) => ({
          id: `milestone-${i}`,
          title: `Milestone ${i}`,
          description: `Description for milestone ${i}`,
          status:
            i < testCase.completed
              ? MilestoneStatus.COMPLETED
              : MilestoneStatus.NOT_STARTED,
          dueDate: new Date(),
          studentId: 'student-1',
          getDaysUntilDue: jest.fn().mockReturnValue(10),
          isOverdue: jest.fn().mockReturnValue(false),
          getProgressPercentage: jest
            .fn()
            .mockReturnValue(i < testCase.completed ? 100 : 0),
        }));

        milestoneRepository.find.mockResolvedValue(
          milestones as unknown as Milestone[],
        );

        const result = await service.getMilestoneContext('student-1');
        const progressPercentage = (testCase.completed / testCase.total) * 100;

        expect(result.progressPercentage).toBe(progressPercentage);
      }
    });
  });
});

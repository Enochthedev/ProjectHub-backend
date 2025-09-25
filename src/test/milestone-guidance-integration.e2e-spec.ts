import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AIAssistantModule } from '../modules/ai-assistant.module';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { Milestone } from '../entities/milestone.entity';
import { Conversation } from '../entities/conversation.entity';
import {
  MilestoneStatus,
  Priority,
  UserRole,
  DifficultyLevel,
  ApprovalStatus,
} from '../common/enums';

describe('Milestone Guidance Integration (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let milestoneRepository: Repository<Milestone>;
  let conversationRepository: Repository<Conversation>;

  let testUser: User;
  let testProject: Project;
  let testMilestones: Milestone[];
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: true,
        }),
        AIAssistantModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    projectRepository = moduleFixture.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    milestoneRepository = moduleFixture.get<Repository<Milestone>>(
      getRepositoryToken(Milestone),
    );
    conversationRepository = moduleFixture.get<Repository<Conversation>>(
      getRepositoryToken(Conversation),
    );

    await setupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupTestData() {
    // Create test user
    testUser = userRepository.create({
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      role: UserRole.STUDENT,
      isEmailVerified: true,
    });
    testUser = await userRepository.save(testUser);

    // Create test project
    testProject = projectRepository.create({
      title: 'AI-Powered Recommendation System',
      abstract: 'A machine learning system for personalized recommendations',
      specialization: 'Data Science',
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      year: 2024,
      tags: ['machine-learning', 'recommendation-system'],
      technologyStack: ['Python', 'TensorFlow', 'Flask'],
      isGroupProject: false,
      approvalStatus: ApprovalStatus.APPROVED,
      supervisorId: testUser.id, // Using same user as supervisor for simplicity
    });
    testProject = await projectRepository.save(testProject);

    // Create test milestones
    const milestoneData = [
      {
        title: 'Literature Review Completion',
        description: 'Complete comprehensive literature review',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        status: MilestoneStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        estimatedHours: 30,
        actualHours: 15,
      },
      {
        title: 'Model Implementation',
        description: 'Implement machine learning model',
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (overdue)
        status: MilestoneStatus.NOT_STARTED,
        priority: Priority.MEDIUM,
        estimatedHours: 60,
        actualHours: 0,
      },
      {
        title: 'Data Collection',
        description: 'Collect and preprocess data',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        status: MilestoneStatus.BLOCKED,
        priority: Priority.HIGH,
        estimatedHours: 25,
        actualHours: 0,
        blockingReason: 'Waiting for data access permissions',
      },
    ];

    testMilestones = [];
    for (const data of milestoneData) {
      const milestone = milestoneRepository.create({
        ...data,
        studentId: testUser.id,
        projectId: testProject.id,
      });
      testMilestones.push(await milestoneRepository.save(milestone));
    }

    // Mock auth token (in real tests, you'd get this from login)
    authToken = 'mock-jwt-token';
  }

  describe('/ai-assistant/milestone-guidance/deadline-awareness (GET)', () => {
    it('should return milestone deadline awareness', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/milestone-guidance/deadline-awareness')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);

      const criticalMilestone = response.body.find(
        (m) => m.urgencyLevel === 'critical',
      );
      if (criticalMilestone) {
        expect(criticalMilestone).toHaveProperty('milestoneId');
        expect(criticalMilestone).toHaveProperty('title');
        expect(criticalMilestone).toHaveProperty('daysUntilDue');
        expect(criticalMilestone).toHaveProperty('deadlineGuidance');
        expect(criticalMilestone.deadlineGuidance).toBeInstanceOf(Array);
      }
    });
  });

  describe('/ai-assistant/milestone-guidance/priority-guidance (GET)', () => {
    it('should return priority guidance for critical milestones', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/milestone-guidance/priority-guidance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);

      if (response.body.length > 0) {
        const guidance = response.body[0];
        expect(guidance).toHaveProperty('milestoneId');
        expect(guidance).toHaveProperty('currentPriority');
        expect(guidance).toHaveProperty('suggestedPriority');
        expect(guidance).toHaveProperty('priorityReason');
        expect(guidance).toHaveProperty('actionItems');
        expect(guidance).toHaveProperty('timeAllocation');
        expect(guidance.actionItems).toBeInstanceOf(Array);
      }
    });
  });

  describe('/ai-assistant/milestone-guidance/proactive-suggestions (GET)', () => {
    it('should return proactive suggestions', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/milestone-guidance/proactive-suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);

      if (response.body.length > 0) {
        const suggestion = response.body[0];
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('title');
        expect(suggestion).toHaveProperty('description');
        expect(suggestion).toHaveProperty('priority');
        expect(suggestion).toHaveProperty('actionSteps');
        expect(suggestion.actionSteps).toBeInstanceOf(Array);
      }
    });
  });

  describe('/ai-assistant/milestone-guidance/timeline-analysis (GET)', () => {
    it('should return timeline analysis', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/milestone-guidance/timeline-analysis')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('studentId');
      expect(response.body).toHaveProperty('overallStatus');
      expect(response.body).toHaveProperty('criticalPath');
      expect(response.body).toHaveProperty('bottlenecks');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('riskFactors');

      expect([
        'on_track',
        'at_risk',
        'behind_schedule',
        'ahead_of_schedule',
      ]).toContain(response.body.overallStatus);
    });
  });

  describe('/ai-assistant/milestone-guidance/comprehensive (GET)', () => {
    it('should return comprehensive milestone guidance', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/milestone-guidance/comprehensive')
        .query({
          includeDeadlineAwareness: true,
          includePriorityGuidance: true,
          includeProactiveSuggestions: true,
          includeTimelineAnalysis: true,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('deadlineAwareness');
      expect(response.body).toHaveProperty('priorityGuidance');
      expect(response.body).toHaveProperty('proactiveSuggestions');
      expect(response.body).toHaveProperty('timelineAnalysis');

      expect(response.body.deadlineAwareness).toBeInstanceOf(Array);
      expect(response.body.priorityGuidance).toBeInstanceOf(Array);
      expect(response.body.proactiveSuggestions).toBeInstanceOf(Array);
    });
  });

  describe('/ai-assistant/milestone-guidance/:milestoneId/specific (GET)', () => {
    it('should return milestone-specific guidance', async () => {
      const milestoneId = testMilestones[0].id;

      const response = await request(app.getHttpServer())
        .get(`/ai-assistant/milestone-guidance/${milestoneId}/specific`)
        .query({ context: 'deadline' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(typeof response.body[0]).toBe('string');
    });

    it('should handle different guidance contexts', async () => {
      const milestoneId = testMilestones[2].id; // Blocked milestone

      const response = await request(app.getHttpServer())
        .get(`/ai-assistant/milestone-guidance/${milestoneId}/specific`)
        .query({ context: 'blocking' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);

      // Should contain guidance about the blocking reason
      const guidanceText = response.body.join(' ').toLowerCase();
      expect(guidanceText).toContain('data access permissions');
    });
  });

  describe('/ai-assistant/project-context/enhanced (GET)', () => {
    it('should return enhanced project context', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/project-context/enhanced')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body) {
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('title');
        expect(response.body).toHaveProperty('currentPhase');
        expect(response.body).toHaveProperty('phaseProgress');
        expect(response.body).toHaveProperty('riskLevel');
        expect(response.body).toHaveProperty('recommendations');
        expect(response.body).toHaveProperty('milestonesSummary');

        expect(['low', 'medium', 'high']).toContain(response.body.riskLevel);
        expect(response.body.recommendations).toBeInstanceOf(Array);
      }
    });
  });

  describe('/ai-assistant/project-context/milestone-aware-guidance (GET)', () => {
    it('should return milestone-aware guidance', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/project-context/milestone-aware-guidance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('urgentMilestones');
      expect(response.body).toHaveProperty('overdueMilestones');
      expect(response.body).toHaveProperty('blockedMilestones');
      expect(response.body).toHaveProperty('phaseSpecificGuidance');
      expect(response.body).toHaveProperty('timelineAnalysis');

      expect(response.body.urgentMilestones).toBeInstanceOf(Array);
      expect(response.body.overdueMilestones).toBeInstanceOf(Array);
      expect(response.body.blockedMilestones).toBeInstanceOf(Array);
    });
  });

  describe('Integration with AI Response Generation', () => {
    it('should enhance AI responses with milestone context', async () => {
      // First create a conversation
      const conversationResponse = await request(app.getHttpServer())
        .post('/ai-assistant/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Conversation',
          projectId: testProject.id,
        })
        .expect(201);

      const conversationId = conversationResponse.body.id;

      // Integrate project context
      await request(app.getHttpServer())
        .post(`/ai-assistant/project-context/integrate/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Ask a question that should trigger milestone-aware responses
      const questionResponse = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'What should I focus on next?',
          conversationId: conversationId,
          includeProjectContext: true,
        })
        .expect(200);

      expect(questionResponse.body).toHaveProperty('response');
      expect(questionResponse.body).toHaveProperty('contextUsed');
      expect(questionResponse.body.contextUsed.projectInfo).toBe(true);

      // The response should contain milestone-aware guidance
      const responseText = questionResponse.body.response.toLowerCase();

      // Should mention overdue milestones or urgent items
      const containsMilestoneGuidance =
        responseText.includes('overdue') ||
        responseText.includes('urgent') ||
        responseText.includes('milestone') ||
        responseText.includes('deadline');

      expect(containsMilestoneGuidance).toBe(true);
    });
  });
});
